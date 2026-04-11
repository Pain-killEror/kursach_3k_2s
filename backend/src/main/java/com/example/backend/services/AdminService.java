package com.example.backend.services;

import com.example.backend.entities.*;
import com.example.backend.entities.enums.EntityType;
import com.example.backend.repositories.GlobalSettingRepository;
import com.example.backend.repositories.RealEstateObjectRepository;
import com.example.backend.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class AdminService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RealEstateObjectRepository realEstateObjectRepository;

    @Autowired
    private GlobalSettingRepository globalSettingRepository;

    // ==========================================
    // УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ
    // ==========================================

    public Page<User> getAllUsers(String search, int page, int size, String sortBy, String sortDir) {
        Sort sort = Sort.by(Sort.Direction.fromString(sortDir), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);

        Specification<User> spec = (root, query, cb) -> {
            if (search == null || search.trim().isEmpty()) {
                return cb.conjunction();
            }
            String likePattern = "%" + search.toLowerCase() + "%";
            List<Predicate> predicates = new ArrayList<>();
            
            // Поиск по строковым полям
            predicates.add(cb.like(cb.lower(root.get("name")), likePattern));
            predicates.add(cb.like(cb.lower(root.get("email")), likePattern));
            predicates.add(cb.like(cb.lower(root.get("phoneNumber")), likePattern));
            
            // Попытка умного поиска по ENUM (например, ввели "ADMIN" или "ACTIVE")
            try { predicates.add(cb.equal(root.get("role"), Role.valueOf(search.toUpperCase()))); } catch (Exception ignored) {}
            try { predicates.add(cb.equal(root.get("status"), Status.valueOf(search.toUpperCase()))); } catch (Exception ignored) {}
            try { predicates.add(cb.equal(root.get("entityType"), EntityType.valueOf(search.toUpperCase()))); } catch (Exception ignored) {}

            return cb.or(predicates.toArray(new Predicate[0]));
        };

        return userRepository.findAll(spec, pageable);
    }

    @Transactional
    public void changeUserStatus(UUID id, Status status) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("Пользователь не найден"));
        user.setStatus(status);
        userRepository.save(user);
    }

    @Transactional
    public void changeUserRole(UUID id, Role role) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("Пользователь не найден"));
        user.setRole(role);
        userRepository.save(user);
    }

    @Transactional
    public void changeUserEntityType(UUID id, EntityType entityType) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("Пользователь не найден"));
        user.setEntityType(entityType);
        userRepository.save(user);
    }

    // ==========================================
    // УПРАВЛЕНИЕ ОБЪЕКТАМИ НЕДВИЖИМОСТИ
    // ==========================================

    public Page<RealEstateObject> getAllObjects(String search, int page, int size, String sortBy, String sortDir) {
        Sort sort = Sort.by(Sort.Direction.fromString(sortDir), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);

        Specification<RealEstateObject> spec = (root, query, cb) -> {
            if (search == null || search.trim().isEmpty()) {
                return cb.conjunction();
            }
            String likePattern = "%" + search.toLowerCase() + "%";
            List<Predicate> predicates = new ArrayList<>();

            predicates.add(cb.like(cb.lower(root.get("title")), likePattern));
            predicates.add(cb.like(cb.lower(root.get("city")), likePattern));
            predicates.add(cb.like(cb.lower(root.get("address")), likePattern));
            predicates.add(cb.like(cb.lower(root.get("category")), likePattern));
            predicates.add(cb.like(cb.lower(root.get("type")), likePattern));
            
            return cb.or(predicates.toArray(new Predicate[0]));
        };

        return realEstateObjectRepository.findAll(spec, pageable);
    }

    @Transactional
    public void deleteObject(UUID id) {
        realEstateObjectRepository.deleteById(id);
    }

    @Transactional
    public void toggleObjectVisibility(UUID id, Boolean isVisible) {
        RealEstateObject obj = realEstateObjectRepository.findById(id).orElseThrow(() -> new RuntimeException("Объект не найден"));
        obj.setIsVisible(isVisible); // Это поле мы добавим в Entity на следующем шаге
        realEstateObjectRepository.save(obj);
    }

    // ==========================================
    // ГЛОБАЛЬНЫЕ НАСТРОЙКИ
    // ==========================================

    public List<GlobalSetting> getAllSettings() {
        return globalSettingRepository.findAll();
    }

    @Transactional
    public void updateSetting(String key, String valueStr, String description) {
        GlobalSetting setting = globalSettingRepository.findById(key).orElse(new GlobalSetting());
        setting.setSettingKey(key);
        
        if (valueStr != null && !valueStr.isEmpty()) {
            setting.setSettingValue(new BigDecimal(valueStr));
        }
        if (description != null) {
            setting.setDescription(description);
        }
        globalSettingRepository.save(setting);
    }
}