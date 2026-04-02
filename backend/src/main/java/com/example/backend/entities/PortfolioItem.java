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
