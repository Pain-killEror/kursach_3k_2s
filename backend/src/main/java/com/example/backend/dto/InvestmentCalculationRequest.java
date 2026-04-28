package com.example.backend.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record InvestmentCalculationRequest(
    UUID objectId,
    String strategyId,
    
    // Financing
    boolean useMortgage,
    BigDecimal downPaymentPct,
    BigDecimal mortgageRate,
    int mortgageTerm,
    BigDecimal legalFeesPct,
    
    // Costs
    BigDecimal repairCost,
    BigDecimal furnitureCost,
    
    // Rental specific
    BigDecimal monthlyRent,
    BigDecimal vacancyRate,
    BigDecimal dailyRate,
    BigDecimal occupancyRate,
    BigDecimal cleaningCost,
    BigDecimal platformFeePct,
    
    // Flip / Build & Sell specific
    BigDecimal expectedSalePrice,
    int flipDurationMonths,
    BigDecimal agentFeePct,
    
    // Build & Sell specific
    BigDecimal constructionCost,
    int buildSellDuration,
    
    // Buy & Hold specific
    BigDecimal appreciationRate,
    int investmentHorizon,
    
    // Operating costs
    BigDecimal maintenancePct,
    BigDecimal utilityCost,
    BigDecimal insuranceCost,
    BigDecimal managementFeePct,
    
    // Legal Entity specific
    boolean useLegalUSN
) {}
