package com.example.backend.entities;

import com.example.backend.entities.enums.FlowType;
import com.example.backend.entities.enums.TransactionCategory;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "portfolio_transactions")
public class PortfolioTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "BINARY(16)")
    private UUID id;

    // СВЯЗЬ: Теперь это объект, а не просто UUID
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "portfolio_item_id", nullable = false)
    @JsonIgnore
    private PortfolioItem portfolioItem;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FlowType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private TransactionCategory category;

    @Column(name = "transaction_date", nullable = false)
    private LocalDate transactionDate;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public PortfolioTransaction() {
    }

    // ИСПРАВЛЕННЫЙ КОНСТРУКТОР
    public PortfolioTransaction(PortfolioItem portfolioItem, String title, String description, BigDecimal amount, FlowType type, TransactionCategory category, LocalDate transactionDate) {
        this.portfolioItem = portfolioItem;
        this.title = title;
        this.description = description;
        this.amount = amount;
        this.type = type;
        this.category = category;
        this.transactionDate = transactionDate;
    }

    // --- ГЕТТЕРЫ И СЕТТЕРЫ ---

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    // Исправлено: возвращаем объект
    public PortfolioItem getPortfolioItem() {
        return portfolioItem;
    }

    // Исправлено: принимаем объект
    public void setPortfolioItem(PortfolioItem portfolioItem) {
        this.portfolioItem = portfolioItem;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public FlowType getType() {
        return type;
    }

    public void setType(FlowType type) {
        this.type = type;
    }

    public TransactionCategory getCategory() {
        return category;
    }

    public void setCategory(TransactionCategory category) {
        this.category = category;
    }

    public LocalDate getTransactionDate() {
        return transactionDate;
    }

    public void setTransactionDate(LocalDate transactionDate) {
        this.transactionDate = transactionDate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}