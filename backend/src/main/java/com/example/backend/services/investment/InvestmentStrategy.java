package com.example.backend.services.investment;

import com.example.backend.dto.InvestmentCalculationRequest;
import com.example.backend.dto.InvestmentCalculationResult;
import com.example.backend.entities.RealEstateObject;
import java.math.BigDecimal;
import java.util.Map;

public interface InvestmentStrategy {
    InvestmentCalculationResult calculate(
        InvestmentCalculationRequest request, 
        RealEstateObject object, 
        Map<String, BigDecimal> taxRates
    );
}
