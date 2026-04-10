package com.example.backend.services;

import com.example.backend.entities.RealEstateObject;
import com.example.backend.entities.User;
import com.example.backend.repositories.RealEstateObjectRepository;
import com.example.backend.repositories.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

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

    // Используем конструктор для внедрения всех необходимых зависимостей
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
        return repository.findAll();
    }

    public RealEstateObject getObjectById(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Объект не найден с ID: " + id));
    }

    /**
     * Создание нового объекта недвижимости с привязкой к владельцу и сохранением фото
     */
    @Transactional // Аннотация гарантирует, что если что-то пойдет не так, изменения не запишутся в БД частично
    public RealEstateObject createObject(RealEstateObject obj, UUID userId, MultipartFile[] images) throws IOException {
        
        // 1. Проверяем существование пользователя (продавца)
        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Пользователь (продавец) не найден"));
        
        // Нормализуем поле города
        if (obj.getCity() != null) {
            obj.setCity(normalizeCity(obj.getCity()));
        }

        // 2. Устанавливаем обязательные системные поля
        obj.setUser(owner);
        obj.setCreatedAt(LocalDateTime.now());
        obj.setUpdatedAt(LocalDateTime.now());
        
        // 3. Первое сохранение: получаем сгенерированный базой UUID (id)
        RealEstateObject savedObject = repository.save(obj);

        // 4. Если пользователь прикрепил изображения — занимаемся ими
        if (images != null && images.length > 0) {
            try {
                // Вызываем наш FileService для сохранения файлов в папку uploads/{id}
                List<String> imageUrls = fileService.saveImages(savedObject.getId(), images);
                
                // Сериализуем список ссылок в JSON строку для записи в LONGTEXT колонку
                String jsonUrls = objectMapper.writeValueAsString(imageUrls);
                savedObject.setImagesUrls(jsonUrls);
                
                // Второе сохранение: обновляем объект уже со ссылками на фото
                return repository.save(savedObject);
            } catch (IOException e) {
                // Если возникла проблема с сохранением файлов — можно добавить логику удаления записи из БД
                // или просто пробросить ошибку выше
                throw new IOException("Ошибка при физическом сохранении файлов: " + e.getMessage());
            }
        }

        return savedObject;
    }

    /**
     * Нормализация названия города: убирает префиксы г., г, город и лишние пробелы,
     * а затем возвращает в формате "г. Название"
     */
    private String normalizeCity(String city) {
        if (city == null || city.trim().isEmpty()) {
            return city;
        }

        // Удаляем префиксы "г.", "г ", "город " в любом регистре и пробелы после них
        String cleaned = city.trim().replaceFirst("^(?i)(г\\.|г\\s+|город\\s+)\\s*", "");

        if (cleaned.isEmpty()) {
            return city;
        }

        // Возводим первую букву в верхний регистр
        cleaned = cleaned.substring(0, 1).toUpperCase() + cleaned.substring(1);

        return "г. " + cleaned;
    }
}