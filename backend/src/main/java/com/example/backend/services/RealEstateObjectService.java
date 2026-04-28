package com.example.backend.services;

import com.example.backend.entities.ObjectStatus;
import com.example.backend.entities.RealEstateObject;
import com.example.backend.entities.User;
import com.example.backend.repositories.RealEstateObjectRepository;
import com.example.backend.repositories.UserRepository;
import com.example.backend.exceptions.ResourceNotFoundException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class RealEstateObjectService {

    private final RealEstateObjectRepository repository;
    private final UserRepository userRepository;
    private final FileService fileService;
    private final ObjectMapper objectMapper;

    public RealEstateObjectService(RealEstateObjectRepository repository,
                                   UserRepository userRepository,
                                   FileService fileService,
                                   ObjectMapper objectMapper) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.fileService = fileService;
        this.objectMapper = objectMapper;
    }

    @Cacheable(value = "objects", key = "{#city, #categories, #minPrice, #maxPrice, #minArea, #maxArea, #transactionType, #rentType, #attributes, #pageable.pageNumber, #pageable.pageSize}")
    public Page<RealEstateObject> getAllObjects(
            String city,
            List<String> categories,
            java.math.BigDecimal minPrice,
            java.math.BigDecimal maxPrice,
            java.math.BigDecimal minArea,
            java.math.BigDecimal maxArea,
            ObjectStatus transactionType,
            String rentType,
            java.util.Map<String, String> attributes,
            Pageable pageable) {
        return repository.findAll(
                com.example.backend.specifications.RealEstateObjectSpecifications.filterBy(
                        city, categories, minPrice, maxPrice, minArea, maxArea, transactionType, rentType, attributes
                ),
                pageable
        );
    }

    // Стандартный метод (оставляем для внутреннего использования бэкенда)
    @Cacheable(value = "objectDetails", key = "#id")
    public RealEstateObject getObjectById(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Объект не найден с ID: " + id));
    }

    // НОВЫЙ МЕТОД: Умный фейс-контроль для скрытых объектов
    public RealEstateObject getObjectByIdWithAccessCheck(UUID objectId, UUID userIdFromParam) {
        RealEstateObject obj = repository.findById(objectId)
                .orElseThrow(() -> new ResourceNotFoundException("Объект не найден"));

        // 1. Если объект видим — отдаем всем
        if (Boolean.TRUE.equals(obj.getIsVisible())) {
            return obj;
        }

        // 2. Определяем, кто спрашивает
        UUID tempUserId = userIdFromParam;

        // Если в параметрах ID нет, пробуем достать из JWT
        if (tempUserId == null) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
                User user = userRepository.findByEmail(auth.getName()).orElse(null);
                if (user != null) tempUserId = user.getId();
            }
        }

        if (tempUserId == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Объект скрыт");
        }

        final UUID currentUserId = tempUserId;

        // 3. СТРОГАЯ ПРОВЕРКА ПРАВ: только владелец ИЛИ текущий жилец/покупатель
        // Участники старых чатов НАМЕРЕННО заблокированы — объект уже продан/сдан
        
        // Владелец
        if (obj.getUser() != null && obj.getUser().getId().equals(currentUserId)) return obj;

        // Текущий жилец (арендатор который въехал, или покупатель после сделки)
        if (obj.getCurrentOccupant() != null && obj.getCurrentOccupant().getId().equals(currentUserId)) return obj;

        throw new ResponseStatusException(
            HttpStatus.FORBIDDEN,
            "Доступ запрещён: объект был продан или сдан в аренду. Обратитесь к владельцу."
        );
    }

    @Transactional
    @CacheEvict(value = {"objects", "objectDetails"}, allEntries = true)
    public RealEstateObject createObject(RealEstateObject obj, UUID userId, MultipartFile[] images) throws IOException {
        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Пользователь (владелец) не найден"));
        
        if (obj.getCity() != null) {
            obj.setCity(normalizeCity(obj.getCity()));
        }

        if (obj.getObjectStatus() == null) {
            obj.setObjectStatus(ObjectStatus.FOR_SALE);
        }

        obj.setUser(owner);
        obj.setCreatedAt(LocalDateTime.now());
        obj.setUpdatedAt(LocalDateTime.now());
        
        RealEstateObject savedObject = repository.save(obj);

        if (images != null && images.length > 0) {
            try {
                List<String> imageUrls = fileService.saveImages(savedObject.getId(), images);
                String jsonUrls = objectMapper.writeValueAsString(imageUrls);
                savedObject.setImagesUrls(jsonUrls);
                return repository.save(savedObject);
            } catch (IOException e) {
                throw new IOException("Ошибка при физическом сохранении файлов: " + e.getMessage());
            }
        }

        return savedObject;
    }

    private String normalizeCity(String city) {
        if (city == null || city.trim().isEmpty()) {
            return city;
        }

        String cleaned = city.trim().replaceFirst("^(?i)(г\\.|г\\s+|город\\s+)\\s*", "");

        if (cleaned.isEmpty()) {
            return city;
        }

        cleaned = cleaned.substring(0, 1).toUpperCase() + cleaned.substring(1);

        return "г. " + cleaned;
    }
}