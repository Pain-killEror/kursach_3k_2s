package com.example.backend.controllers;

import com.example.backend.entities.GlobalSetting;
import com.example.backend.entities.RealEstateObject;
import com.example.backend.entities.User;
import com.example.backend.entities.Role;
import com.example.backend.entities.Status;
import com.example.backend.entities.enums.EntityType;
import com.example.backend.services.AdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "http://localhost:5173") // <--- ВОТ ЭТО РЕШАЕТ ОШИБКУ CORS
public class AdminController {

    @Autowired
    private AdminService adminService;

    // ==========================================
    // УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ
    // ==========================================

    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers(java.security.Principal principal) {
        // Передаем email текущего пользователя (админа) в сервис
        String currentAdminEmail = principal.getName();
        List<User> users = adminService.getAllUsers(currentAdminEmail);
        return ResponseEntity.ok(users);
    }

    @PatchMapping("/users/{id}/status")
    public ResponseEntity<?> changeUserStatus(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        adminService.changeUserStatus(id, Status.valueOf(body.get("status")));
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/users/{id}/role")
    public ResponseEntity<?> changeUserRole(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        adminService.changeUserRole(id, Role.valueOf(body.get("role")));
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/users/{id}/entity-type")
    public ResponseEntity<?> changeUserEntityType(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        adminService.changeUserEntityType(id, EntityType.valueOf(body.get("entityType")));
        return ResponseEntity.ok().build();
    }

    // ==========================================
    // УПРАВЛЕНИЕ ОБЪЕКТАМИ НЕДВИЖИМОСТИ
    // ==========================================

    @GetMapping("/objects")
    public ResponseEntity<Page<RealEstateObject>> getObjects(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        return ResponseEntity.ok(adminService.getAllObjects(search, page, size, sortBy, sortDir));
    }

    @DeleteMapping("/objects/{id}")
    public ResponseEntity<?> deleteObject(@PathVariable UUID id) {
        adminService.deleteObject(id);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/objects/{id}/visibility")
    public ResponseEntity<?> toggleObjectVisibility(@PathVariable UUID id, @RequestBody Map<String, Boolean> body) {
        adminService.toggleObjectVisibility(id, body.get("isVisible"));
        return ResponseEntity.ok().build();
    }

    // ==========================================
    // ГЛОБАЛЬНЫЕ НАСТРОЙКИ
    // ==========================================

    @GetMapping("/settings")
    public ResponseEntity<List<GlobalSetting>> getSettings() {
        return ResponseEntity.ok(adminService.getAllSettings());
    }

    @PutMapping("/settings/{key}")
    public ResponseEntity<?> updateSetting(@PathVariable String key, @RequestBody Map<String, String> body) {
        adminService.updateSetting(key, body.get("value"), body.get("description"));
        return ResponseEntity.ok().build();
    }
}