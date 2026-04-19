package com.example.backend.entities.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum TransactionCategory {
    PURCHASE, MATERIALS, LABOR, TAX, UTILITIES, LOAN, RENT_INCOME, SALE_PROCEEDS, ADVERTISING, OTHER;

    @JsonCreator
    public static TransactionCategory fromString(String key) {
        return key == null ? null : TransactionCategory.valueOf(key.toUpperCase());
    }

    @JsonValue
    public String toValue() {
        return name();
    }
}