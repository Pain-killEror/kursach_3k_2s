package com.example.backend.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "object_strategies")
@IdClass(ObjectStrategyId.class)
public class ObjectStrategy {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "object_id")
    private RealEstateObject realEstateObject;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "strategy_id")
    private InvestmentStrategy investmentStrategy;

    @Column(name = "expected_yield")
    private BigDecimal expectedYield;

    public ObjectStrategy() {
    }

    public ObjectStrategy(RealEstateObject realEstateObject, InvestmentStrategy investmentStrategy, BigDecimal expectedYield) {
        this.realEstateObject = realEstateObject;
        this.investmentStrategy = investmentStrategy;
        this.expectedYield = expectedYield;
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

    public BigDecimal getExpectedYield() {
        return expectedYield;
    }

    public void setExpectedYield(BigDecimal expectedYield) {
        this.expectedYield = expectedYield;
    }
}
