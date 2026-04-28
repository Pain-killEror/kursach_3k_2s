package com.example.backend.services.investment;

import com.example.backend.dto.InvestmentCalculationRequest;
import com.example.backend.dto.InvestmentCalculationResult;
import com.example.backend.entities.GlobalSetting;
import com.example.backend.entities.RealEstateObject;
import com.example.backend.entities.User;
import com.example.backend.entities.enums.EntityType;
import com.example.backend.repositories.GlobalSettingRepository;
import com.example.backend.repositories.RealEstateObjectRepository;
import com.example.backend.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class InvestmentCalculatorService {

    @Autowired
    private InvestmentStrategyFactory strategyFactory;

    @Autowired
    private RealEstateObjectRepository objectRepository;

    @Autowired
    private GlobalSettingRepository globalSettingRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private InvestmentSmartDefaults smartDefaults;

    public InvestmentCalculationResult calculate(InvestmentCalculationRequest request, String userEmail) {
        RealEstateObject object = objectRepository.findById(request.objectId())
                .orElseThrow(() -> new RuntimeException("Объект не найден"));

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));

        Map<String, BigDecimal> taxRates = fetchTaxRates(user.getEntityType());
        
        // Enrich request with defaults if fields are missing
        InvestmentCalculationRequest enrichedRequest = smartDefaults.enrichWithDefaults(request, object);
        
        InvestmentStrategy strategy = strategyFactory.getStrategy(enrichedRequest.strategyId());
        return strategy.calculate(enrichedRequest, object, taxRates);
    }

    private Map<String, BigDecimal> fetchTaxRates(EntityType entityType) {
        Map<String, BigDecimal> rates = new HashMap<>();
        List<GlobalSetting> settings = globalSettingRepository.findAll();

        // Default rates
        rates.put("INCOME_TAX_RATE", new BigDecimal("13.0"));
        rates.put("PROPERTY_TAX_RATE", new BigDecimal("0.1"));
        rates.put("USN_RATE", new BigDecimal("6.0"));

        for (GlobalSetting s : settings) {
            if (s.getSettingValue() == null) continue;
            
            switch (s.getSettingKey()) {
                case "TAX_INDIVIDUAL_INCOME":
                    if (entityType == EntityType.INDIVIDUAL) rates.put("INCOME_TAX_RATE", s.getSettingValue());
                    break;
                case "TAX_ENTREPRENEUR_INCOME":
                    if (entityType == EntityType.ENTREPRENEUR) rates.put("INCOME_TAX_RATE", s.getSettingValue());
                    break;
                case "TAX_LEGAL_USN":
                    if (entityType == EntityType.LEGAL_ENTITY) rates.put("USN_RATE", s.getSettingValue());
                    break;
                case "TAX_PROPERTY":
                    rates.put("PROPERTY_TAX_RATE", s.getSettingValue());
                    break;
            }
        }
        return rates;
    }
}
