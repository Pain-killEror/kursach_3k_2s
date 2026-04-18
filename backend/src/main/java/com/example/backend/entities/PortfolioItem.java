package com.example.backend.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "portfolio_items")
public class PortfolioItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "invested_amount")
    private BigDecimal investedAmount;

    @Column(name = "purchase_date")
    private LocalDate purchaseDate;

    // --- НОВЫЕ ПОЛЯ ДЛЯ ФИНАНСОВОГО УЧЕТА ---
    
    @Column(name = "strategy_name")
    private String strategyName; // Название стратегии с фронтенда (например, "Перепродажа")

    @Column(name = "target_amount")
    private BigDecimal targetAmount; // Целевая цена (за сколько планируем продать/сдать)

    @Column(name = "exit_tax_rate")
    private BigDecimal exitTaxRate = new BigDecimal("13.00"); // Налог в % (по умолчанию 13%)

    @Column(name = "status")
    private String status = "PLANNING"; // PLANNING, RENOVATION, RENTED, FOR_SALE, SOLD

    // ----------------------------------------

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "portfolio_id")
    private Portfolio portfolio;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "object_id")
    private RealEstateObject realEstateObject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "strategy_id")
    private InvestmentStrategy investmentStrategy;

    public PortfolioItem() {
    }

    public PortfolioItem(UUID id, BigDecimal investedAmount, LocalDate purchaseDate, Portfolio portfolio, RealEstateObject realEstateObject, InvestmentStrategy investmentStrategy) {
        this.id = id;
        this.investedAmount = investedAmount;
        this.purchaseDate = purchaseDate;
        this.portfolio = portfolio;
        this.realEstateObject = realEstateObject;
        this.investmentStrategy = investmentStrategy;
    }

    // --- ГЕТТЕРЫ И СЕТТЕРЫ ---

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public BigDecimal getInvestedAmount() {
        return investedAmount;
    }

    public void setInvestedAmount(BigDecimal investedAmount) {
        this.investedAmount = investedAmount;
    }

    public LocalDate getPurchaseDate() {
        return purchaseDate;
    }

    public void setPurchaseDate(LocalDate purchaseDate) {
        this.purchaseDate = purchaseDate;
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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Portfolio getPortfolio() {
        return portfolio;
    }

    public void setPortfolio(Portfolio portfolio) {
        this.portfolio = portfolio;
    }

    public RealEstateObject getRealEstateObject() {
        return realEstateObject;
    }

    public void setRealEstateObject(RealEstateObject realEstateObject) {
        this.realEstateObject = realEstateObject;
    }

    public InvestmentStrategy getInvestmentStrategy() {
        return investmentStrategy;
    }

    public void setInvestmentStrategy(InvestmentStrategy investmentStrategy) {
        this.investmentStrategy = investmentStrategy;
    }
}