package com.example.backend.controllers;

import com.example.backend.entities.RealEstateObject;
import com.example.backend.services.RealEstateObjectService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
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
    public ResponseEntity<Page<RealEstateObject>> getAllObjects(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) List<String> categories,
            @RequestParam(required = false) java.math.BigDecimal minPrice,
            @RequestParam(required = false) java.math.BigDecimal maxPrice,
            @RequestParam(required = false) java.math.BigDecimal minArea,
            @RequestParam(required = false) java.math.BigDecimal maxArea,
            @RequestParam(required = false) com.example.backend.entities.ObjectStatus transactionType,
            @RequestParam(required = false) String rentType,
            @RequestParam java.util.Map<String, String> allParams,
            @PageableDefault(size = 30) Pageable pageable) {
        
        // Отсеиваем известные параметры, чтобы оставить только атрибуты
        java.util.Set<String> knownParams = java.util.Set.of(
            "city", "categories", "category", "minPrice", "maxPrice", "minArea", "maxArea", 
            "transactionType", "rentType", "page", "size", "sort"
        );
        java.util.Map<String, String> attributes = allParams.entrySet().stream()
            .filter(e -> !knownParams.contains(e.getKey()))
            .collect(java.util.stream.Collectors.toMap(java.util.Map.Entry::getKey, java.util.Map.Entry::getValue));

        return ResponseEntity.ok(service.getAllObjects(city, categories, minPrice, maxPrice, minArea, maxArea, transactionType, rentType, attributes, pageable));
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