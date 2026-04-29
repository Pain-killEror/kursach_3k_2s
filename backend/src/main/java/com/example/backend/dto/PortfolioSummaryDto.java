package com.example.backend.dto;

import com.example.backend.entities.PortfolioTransaction;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record PortfolioSummaryDto(
    UUID portfolioItemId,
    String strategyName,
    BigDecimal targetAmount,
    BigDecimal exitTaxRate,
    String status,
    String objectCategory,
    String objectAddress,
    String objectTitle,
    String customName,
    BigDecimal totalInvested,
    BigDecimal totalIncome,
    BigDecimal currentBalance,
    BigDecimal breakEvenPrice,
    BigDecimal expectedProfit,
    BigDecimal purchasePrice,
    BigDecimal additionalInvestments,
    List<PortfolioTransaction> transactions,
    boolean isOriginalOwner
) {
}