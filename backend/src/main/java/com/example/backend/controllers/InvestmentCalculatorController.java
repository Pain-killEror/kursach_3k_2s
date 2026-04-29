package com.example.backend.controllers;

import com.example.backend.entities.GlobalSetting;
import com.example.backend.entities.User;
import com.example.backend.entities.enums.EntityType;
import com.example.backend.repositories.GlobalSettingRepository;
import com.example.backend.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.security.Principal;
import java.util.HashMap;
import java.util.Map;

/**
 * Контроллер для инвестиционного калькулятора.
 * Предоставляет налоговые ставки, применимые к текущему пользователю,
 * на основе его типа (Физлицо / ИП / Юрлицо) из таблицы global_settings.
 */
@RestController
@RequestMapping({"/api/settings", "/api/v1/settings"})
@CrossOrigin(origins = "http://localhost:5173")
public class InvestmentCalculatorController {

    @Autowired
    private GlobalSettingRepository globalSettingRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * GET /api/settings/tax
     * Возвращает налоговые ставки, релевантные для текущего авторизованного пользователя.
     * Определяет entityType пользователя из базы и подбирает соответствующие настройки.
     */
    @GetMapping("/tax")
    public ResponseEntity<Map<String, Object>> getTaxRates(Principal principal) {
        // 1. Находим текущего пользователя по email из JWT-токена
        String email = principal.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));

        EntityType entityType = user.getEntityType();
        if (entityType == null) {
            entityType = EntityType.INDIVIDUAL; // По умолчанию — физлицо
        }

        // 2. Загружаем все настройки из БД
        Map<String, BigDecimal> allSettings = new HashMap<>();
        for (GlobalSetting setting : globalSettingRepository.findAll()) {
            allSettings.put(setting.getSettingKey(), setting.getSettingValue());
        }

        // 3. Формируем ответ в зависимости от типа пользователя
        Map<String, Object> result = new HashMap<>();
        result.put("entityType", entityType.name());

        switch (entityType) {
            case INDIVIDUAL:
                result.put("incomeTaxRate", allSettings.getOrDefault("TAX_INDIVIDUAL_INCOME", BigDecimal.ZERO));
                result.put("propertyTaxRate", allSettings.getOrDefault("TAX_INDIVIDUAL_PROPERTY", BigDecimal.ZERO));
                result.put("vatRate", null);
                result.put("usnRate", null);
                result.put("profitTaxRate", null);
                break;

            case ENTREPRENEUR:
                result.put("incomeTaxRate", allSettings.getOrDefault("TAX_ENTREPRENEUR_INCOME", BigDecimal.ZERO));
                result.put("propertyTaxRate", allSettings.getOrDefault("TAX_ENTREPRENEUR_PROPERTY", BigDecimal.ZERO));
                result.put("vatRate", null);
                result.put("usnRate", null);
                result.put("profitTaxRate", null);
                break;

            case LEGAL_ENTITY:
                result.put("incomeTaxRate", null); // Юрлица используют profitTaxRate или usnRate
                result.put("propertyTaxRate", allSettings.getOrDefault("TAX_LEGAL_PROPERTY", BigDecimal.ZERO));
                result.put("vatRate", allSettings.getOrDefault("TAX_LEGAL_VAT", BigDecimal.ZERO));
                result.put("usnRate", allSettings.getOrDefault("TAX_LEGAL_USN", BigDecimal.ZERO));
                result.put("profitTaxRate", allSettings.getOrDefault("TAX_LEGAL_PROFIT", BigDecimal.ZERO));
                break;
        }

        return ResponseEntity.ok(result);
    }
}
