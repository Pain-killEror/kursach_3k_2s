package com.example.backend.services;

import com.example.backend.entities.ChatRoom;
import com.example.backend.entities.ObjectStatus;
import com.example.backend.entities.RealEstateObject;
import com.example.backend.entities.User;
import com.example.backend.repositories.ChatRoomRepository;
import com.example.backend.repositories.RealEstateObjectRepository;
import com.example.backend.repositories.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
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
    private final ChatRoomRepository chatRoomRepository; // Подключаем репозиторий чатов для проверки прав

    public RealEstateObjectService(RealEstateObjectRepository repository, 
                                   UserRepository userRepository, 
                                   FileService fileService, 
                                   ObjectMapper objectMapper,
                                   ChatRoomRepository chatRoomRepository) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.fileService = fileService;
        this.objectMapper = objectMapper;
        this.chatRoomRepository = chatRoomRepository;
    }

    public List<RealEstateObject> getAllObjects() {
        return repository.findAll().stream()
                .filter(obj -> obj.getUser() == null || obj.getUser().getStatus() != com.example.backend.entities.Status.BLOCKED)
                .filter(obj -> obj.getIsVisible() == null || obj.getIsVisible())
                .collect(Collectors.toList());
    }

    // Стандартный метод (оставляем для внутреннего использования бэкенда)
    public RealEstateObject getObjectById(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Объект не найден с ID: " + id));
    }

    // НОВЫЙ МЕТОД: Умный фейс-контроль для скрытых объектов
    public RealEstateObject getObjectByIdWithAccessCheck(UUID objectId, UUID userIdFromParam) {
        RealEstateObject obj = repository.findById(objectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Объект не найден"));

        // 1. Если объект видим — отдаем всем
        if (obj.getIsVisible() != null && obj.getIsVisible()) {
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

        // ВАЖНО: Создаем финальную переменную для использования в лямбде ниже
        final UUID currentUserId = tempUserId;

        // 3. ПРОВЕРКА ПРАВ
        
        // Владелец
        if (obj.getUser() != null && obj.getUser().getId().equals(currentUserId)) return obj;
        
        // Жилец
        if (obj.getCurrentOccupant() != null && obj.getCurrentOccupant().getId().equals(currentUserId)) return obj;

        // Участник переписки
        List<ChatRoom> objectChats = chatRoomRepository.findByRealEstateObjectId(objectId);
        
        // Теперь здесь используется currentUserId, которая не меняется (final)
        boolean hasChat = objectChats.stream().anyMatch(chat -> 
            (chat.getInvestor() != null && chat.getInvestor().getId().equals(currentUserId)) || 
            (chat.getSeller() != null && chat.getSeller().getId().equals(currentUserId))
        );

        if (hasChat) return obj;

        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "У вас нет доступа к этому объекту");
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