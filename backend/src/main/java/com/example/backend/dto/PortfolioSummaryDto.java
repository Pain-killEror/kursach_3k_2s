package com.example.backend.dto;

import com.example.backend.entities.PortfolioTransaction;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public class PortfolioSummaryDto {
    private UUID portfolioItemId;
    private String strategyName;
    private BigDecimal targetAmount;
    private BigDecimal exitTaxRate;
    private String status;
    // --- НОВЫЕ ПОЛЯ ДЛЯ ОТОБРАЖЕНИЯ НА КАРТОЧКЕ ---
    private String objectCategory; // Категория (Квартира, Дом и т.д.)
    private String objectAddress;  // Полный адрес для извлечения улицы
    private String objectTitle;    // Оригинальный заголовок из объявления
    private String customName;     // Пользовательское имя (на будущее)

    // Финансовые показатели
    private BigDecimal totalInvested;
    private BigDecimal totalIncome;
    private BigDecimal currentBalance;

    // Аналитические показатели
    private BigDecimal breakEvenPrice;
    private BigDecimal expectedProfit;

    private BigDecimal purchasePrice;         // Куплено за
    private BigDecimal additionalInvestments;

    // Лента операций
    private List<PortfolioTransaction> transactions;

    public PortfolioSummaryDto() {
    }

    // --- ГЕТТЕРЫ И СЕТТЕРЫ ДЛЯ НОВЫХ ПОЛЕЙ ---

    public BigDecimal getPurchasePrice() { return purchasePrice; }
    public void setPurchasePrice(BigDecimal purchasePrice) { this.purchasePrice = purchasePrice; }
    
    public BigDecimal getAdditionalInvestments() { return additionalInvestments; }
    public void setAdditionalInvestments(BigDecimal additionalInvestments) { this.additionalInvestments = additionalInvestments; }  

    public String getObjectCategory() { return objectCategory; }
    public void setObjectCategory(String objectCategory) { this.objectCategory = objectCategory; }

    public String getObjectAddress() { return objectAddress; }
    public void setObjectAddress(String objectAddress) { this.objectAddress = objectAddress; }

    public String getObjectTitle() { return objectTitle; }
    public void setObjectTitle(String objectTitle) { this.objectTitle = objectTitle; }

    public String getCustomName() { return customName; }
    public void setCustomName(String customName) { this.customName = customName; }
    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
    // --- ОСТАЛЬНЫЕ ГЕТТЕРЫ И СЕТТЕРЫ (оставь как были) ---
    public UUID getPortfolioItemId() { return portfolioItemId; }
    public void setPortfolioItemId(UUID portfolioItemId) { this.portfolioItemId = portfolioItemId; }
    public String getStrategyName() { return strategyName; }
    public void setStrategyName(String strategyName) { this.strategyName = strategyName; }
    public BigDecimal getTargetAmount() { return targetAmount; }
    public void setTargetAmount(BigDecimal targetAmount) { this.targetAmount = targetAmount; }
    public BigDecimal getExitTaxRate() { return exitTaxRate; }
    public void setExitTaxRate(BigDecimal exitTaxRate) { this.exitTaxRate = exitTaxRate; }
    public BigDecimal getTotalInvested() { return totalInvested; }
    public void setTotalInvested(BigDecimal totalInvested) { this.totalInvested = totalInvested; }
    public BigDecimal getTotalIncome() { return totalIncome; }
    public void setTotalIncome(BigDecimal totalIncome) { this.totalIncome = totalIncome; }
    public BigDecimal getCurrentBalance() { return currentBalance; }
    public void setCurrentBalance(BigDecimal currentBalance) { this.currentBalance = currentBalance; }
    public BigDecimal getBreakEvenPrice() { return breakEvenPrice; }
    public void setBreakEvenPrice(BigDecimal breakEvenPrice) { this.breakEvenPrice = breakEvenPrice; }
    public BigDecimal getExpectedProfit() { return expectedProfit; }
    public void setExpectedProfit(BigDecimal expectedProfit) { this.expectedProfit = expectedProfit; }
    public List<PortfolioTransaction> getTransactions() { return transactions; }
    public void setTransactions(List<PortfolioTransaction> transactions) { this.transactions = transactions; }
}