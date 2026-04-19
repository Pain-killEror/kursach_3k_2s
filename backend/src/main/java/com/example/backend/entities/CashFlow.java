package com.example.backend.entities;

import com.example.backend.entities.enums.FlowType;
import com.example.backend.entities.enums.Periodicity;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "cash_flows")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class CashFlow {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "BINARY(16)")
    private UUID id;

    private String name;

    private BigDecimal amount;

    private String currency;

    @Column(name = "is_default")
    private boolean isDefault;

    @Enumerated(EnumType.STRING)
    @Column(name = "flow_type")
    private FlowType flowType;

    @Enumerated(EnumType.STRING)
    private Periodicity periodicity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "model_id")
    private FinancialModel financialModel;

    public CashFlow() {
    }

    public CashFlow(UUID id, String name, BigDecimal amount, String currency, boolean isDefault, FlowType flowType, Periodicity periodicity, FinancialModel financialModel) {
        this.id = id;
        this.name = name;
        this.amount = amount;
        this.currency = currency;
        this.isDefault = isDefault;
        this.flowType = flowType;
        this.periodicity = periodicity;
        this.financialModel = financialModel;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public boolean isDefault() {
        return isDefault;
    }

    public void setDefault(boolean isDefault) {
        this.isDefault = isDefault;
    }

    public FlowType getFlowType() {
        return flowType;
    }

    public void setFlowType(FlowType flowType) {
        this.flowType = flowType;
    }

    public Periodicity getPeriodicity() {
        return periodicity;
    }

    public void setPeriodicity(Periodicity periodicity) {
        this.periodicity = periodicity;
    }

    public FinancialModel getFinancialModel() {
        return financialModel;
    }

    public void setFinancialModel(FinancialModel financialModel) {
        this.financialModel = financialModel;
    }
}
