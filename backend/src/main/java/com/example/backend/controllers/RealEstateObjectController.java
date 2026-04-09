package com.example.backend.controllers;

import com.example.backend.entities.RealEstateObject;
import com.example.backend.services.RealEstateObjectService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/objects")
public class RealEstateObjectController {

    private final RealEstateObjectService service;
    private final ObjectMapper objectMapper; // Для преобразования JSON-строки в объект

    public RealEstateObjectController(RealEstateObjectService service, ObjectMapper objectMapper) {
        this.service = service;
        this.objectMapper = objectMapper;
    }

    // Получить все объекты
    @GetMapping
    public ResponseEntity<List<RealEstateObject>> getAllObjects() {
        return ResponseEntity.ok(service.getAllObjects());
    }

    // Получить объект по ID
    @GetMapping("/{id}")
    public ResponseEntity<RealEstateObject> getObjectById(@PathVariable UUID id) {
        return ResponseEntity.ok(service.getObjectById(id));
    }

    /**
     * Создание нового объекта (только для роли SELLER).
     * Принимает данные объекта в виде JSON-строки и массив файлов.
     */
    @PostMapping(consumes = {"multipart/form-data"})
    public ResponseEntity<?> createObject(
            @RequestPart("objectData") String objectDataJson, // Основные данные объекта
            @RequestPart(value = "images", required = false) MultipartFile[] images, // Фотографии
            @RequestParam("userId") UUID userId // ID владельца из localStorage фронтенда
    ) {
        try {
            // 1. Превращаем строку JSON в объект RealEstateObject
            RealEstateObject obj = objectMapper.readValue(objectDataJson, RealEstateObject.class);
            
            // 2. Вызываем сервис для сохранения в БД и на диск
            RealEstateObject created = service.createObject(obj, userId, images);
            
            return ResponseEntity.ok(created);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Ошибка при создании объекта: " + e.getMessage());
        }
    }
}