package com.example.backend.controllers;

import com.example.backend.entities.RealEstateObject;
import com.example.backend.services.RealEstateObjectService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/objects")
public class RealEstateObjectController {

    private final RealEstateObjectService service;
    private final ObjectMapper objectMapper;

    public RealEstateObjectController(RealEstateObjectService service, ObjectMapper objectMapper) {
        this.service = service;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    public ResponseEntity<List<RealEstateObject>> getAllObjects() {
        return ResponseEntity.ok(service.getAllObjects());
    }

    // НОВЫЙ ВАРИАНТ С ПРОВЕРКОЙ ПРАВ
    @GetMapping("/{id}")
public ResponseEntity<RealEstateObject> getObjectById(
        @PathVariable UUID id,
        @RequestParam(required = false) UUID userId) { // Добавили прием параметра
    
    // Передаем этот userId в сервис
    return ResponseEntity.ok(service.getObjectByIdWithAccessCheck(id, userId));
}

    @PostMapping(consumes = {"multipart/form-data"})
    public ResponseEntity<?> createObject(
            @RequestPart("objectData") String objectDataJson,
            @RequestPart(value = "images", required = false) MultipartFile[] images,
            @RequestParam("userId") UUID userId
    ) {
        try {
            RealEstateObject obj = objectMapper.readValue(objectDataJson, RealEstateObject.class);
            RealEstateObject created = service.createObject(obj, userId, images);
            return ResponseEntity.ok(created);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Ошибка при создании объекта: " + e.getMessage());
        }
    }
}