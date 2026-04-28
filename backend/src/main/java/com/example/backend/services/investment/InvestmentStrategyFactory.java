package com.example.backend.services.investment;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class InvestmentStrategyFactory {

    private final Map<String, InvestmentStrategy> strategies;

    @Autowired
    public InvestmentStrategyFactory(Map<String, InvestmentStrategy> strategies) {
        this.strategies = strategies;
    }

    public InvestmentStrategy getStrategy(String strategyId) {
        InvestmentStrategy strategy = strategies.get(strategyId);
        if (strategy == null) {
            throw new IllegalArgumentException("Неизвестная стратегия: " + strategyId);
        }
        return strategy;
    }
}
