package com.example.backend.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class FileService {

    @Value("${app.upload.path}")
    private String uploadPath;

    public List<String> saveImages(UUID objectId, MultipartFile[] images) throws IOException {
        List<String> savedPaths = new ArrayList<>();
        
        // 1. Формируем путь к папке объекта: uploads/{uuid}
        Path objectFolder = Paths.get(uploadPath).resolve(objectId.toString()).normalize();
        
        // 2. Создаем физическую папку, если её нет
        if (!Files.exists(objectFolder)) {
            Files.createDirectories(objectFolder);
        }

        // 3. Сохраняем каждый файл
        for (MultipartFile file : images) {
            if (file.isEmpty()) continue;

            // Генерируем уникальное имя, чтобы избежать конфликтов
            String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
            Path targetPath = objectFolder.resolve(fileName);
            
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
            
            // Сохраняем относительный URL для базы данных
            // Формат: /uploads/{uuid}/{fileName}
            savedPaths.add("/uploads/" + objectId + "/" + fileName);
        }
        
        return savedPaths;
    }
}