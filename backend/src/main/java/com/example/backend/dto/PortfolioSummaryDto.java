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

    // Финансовые показатели
    private BigDecimal totalInvested;  // Общая сумма всех расходов (EXPENSE)
    private BigDecimal totalIncome;    // Общая сумма всех доходов (INCOME)
    private BigDecimal currentBalance; // Текущий финансовый результат (Income - Expense)

    // Аналитические показатели (расчетные)
    private BigDecimal breakEvenPrice; // Цена продажи, при которой инвестор выйдет в 0 с учетом налога
    private BigDecimal expectedProfit; // Чистая прибыль, если продать по цене targetAmount

    // Лента операций
    private List<PortfolioTransaction> transactions;

    public PortfolioSummaryDto() {
    }

    // --- ГЕТТЕРЫ И СЕТТЕРЫ ---

    public UUID getPortfolioItemId() {
        return portfolioItemId;
    }

    public void setPortfolioItemId(UUID portfolioItemId) {
        this.portfolioItemId = portfolioItemId;
    }

    public String getStrategyName() {
        return strategyName;
    }

    public void setStrategyName(String strategyName) {
        this.strategyName = strategyName;
    }

    public BigDecimal getTargetAmount() {
        return targetAmount;
    }

    public void setTargetAmount(BigDecimal targetAmount) {
        this.targetAmount = targetAmount;
    }

    public BigDecimal getExitTaxRate() {
        return exitTaxRate;
    }

    public void setExitTaxRate(BigDecimal exitTaxRate) {
        this.exitTaxRate = exitTaxRate;
    }

    public BigDecimal getTotalInvested() {
        return totalInvested;
    }

    public void setTotalInvested(BigDecimal totalInvested) {
        this.totalInvested = totalInvested;
    }

    public BigDecimal getTotalIncome() {
        return totalIncome;
    }

    public void setTotalIncome(BigDecimal totalIncome) {
        this.totalIncome = totalIncome;
    }

    public BigDecimal getCurrentBalance() {
        return currentBalance;
    }

    public void setCurrentBalance(BigDecimal currentBalance) {
        this.currentBalance = currentBalance;
    }

    public BigDecimal getBreakEvenPrice() {
        return breakEvenPrice;
    }

    public void setBreakEvenPrice(BigDecimal breakEvenPrice) {
        this.breakEvenPrice = breakEvenPrice;
    }

    public BigDecimal getExpectedProfit() {
        return expectedProfit;
    }

    public void setExpectedProfit(BigDecimal expectedProfit) {
        this.expectedProfit = expectedProfit;
    }

    public List<PortfolioTransaction> getTransactions() {
        return transactions;
    }

    public void setTransactions(List<PortfolioTransaction> transactions) {
        this.transactions = transactions;
    }
}