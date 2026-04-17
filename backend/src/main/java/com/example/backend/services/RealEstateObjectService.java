package com.example.backend.services;

import com.example.backend.entities.ObjectStatus;
import com.example.backend.entities.RealEstateObject;
import com.example.backend.entities.User;
import com.example.backend.repositories.RealEstateObjectRepository;
import com.example.backend.repositories.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

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

    public List<RealEstateObject> getAllObjects() {
        return repository.findAll().stream()
                .filter(obj -> obj.getUser() == null || obj.getUser().getStatus() != com.example.backend.entities.Status.BLOCKED)
                .filter(obj -> obj.getIsVisible() == null || obj.getIsVisible())
                .collect(Collectors.toList());
    }

    public RealEstateObject getObjectById(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Объект не найден с ID: " + id));
    }

    @Transactional
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