package com.example.backend.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "financial_models")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class FinancialModel {

    @Id
    @Column(name = "item_id", columnDefinition = "BINARY(16)")
    private UUID id;

    private BigDecimal roi;

    @Column(name = "payback_period")
    private BigDecimal paybackPeriod;

    @Column(name = "net_operating_income")
    private BigDecimal netOperatingIncome;

    @Column(name = "total_investment")
    private BigDecimal totalInvestment;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", insertable = false, updatable = false)
    private PortfolioItem portfolioItem;

    public FinancialModel() {
    }

    public FinancialModel(UUID id, BigDecimal roi, BigDecimal paybackPeriod, BigDecimal netOperatingIncome, BigDecimal totalInvestment, PortfolioItem portfolioItem) {
        this.id = id;
        this.roi = roi;
        this.paybackPeriod = paybackPeriod;
        this.netOperatingIncome = netOperatingIncome;
        this.totalInvestment = totalInvestment;
        this.portfolioItem = portfolioItem;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public BigDecimal getRoi() {
        return roi;
    }

    public void setRoi(BigDecimal roi) {
        this.roi = roi;
    }

    public BigDecimal getPaybackPeriod() {
        return paybackPeriod;
    }

    public void setPaybackPeriod(BigDecimal paybackPeriod) {
        this.paybackPeriod = paybackPeriod;
    }

    public BigDecimal getNetOperatingIncome() {
        return netOperatingIncome;
    }

    public void setNetOperatingIncome(BigDecimal netOperatingIncome) {
        this.netOperatingIncome = netOperatingIncome;
    }

    public BigDecimal getTotalInvestment() {
        return totalInvestment;
    }

    public void setTotalInvestment(BigDecimal totalInvestment) {
        this.totalInvestment = totalInvestment;
    }

    public PortfolioItem getPortfolioItem() {
        return portfolioItem;
    }

    public void setPortfolioItem(PortfolioItem portfolioItem) {
        this.portfolioItem = portfolioItem;
    }
}
