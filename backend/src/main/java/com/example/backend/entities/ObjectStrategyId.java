package com.example.backend.entities;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

public class ObjectStrategyId implements Serializable {

    private UUID realEstateObject;
    private Integer investmentStrategy;

    public ObjectStrategyId() {
    }

    public ObjectStrategyId(UUID realEstateObject, Integer investmentStrategy) {
        this.realEstateObject = realEstateObject;
        this.investmentStrategy = investmentStrategy;
    }

    public UUID getRealEstateObject() {
        return realEstateObject;
    }

    public void setRealEstateObject(UUID realEstateObject) {
        this.realEstateObject = realEstateObject;
    }

    public Integer getInvestmentStrategy() {
        return investmentStrategy;
    }

    public void setInvestmentStrategy(Integer investmentStrategy) {
        this.investmentStrategy = investmentStrategy;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ObjectStrategyId that = (ObjectStrategyId) o;
        return Objects.equals(realEstateObject, that.realEstateObject) &&
               Objects.equals(investmentStrategy, that.investmentStrategy);
    }

    @Override
    public int hashCode() {
        return Objects.hash(realEstateObject, investmentStrategy);
    }
}
