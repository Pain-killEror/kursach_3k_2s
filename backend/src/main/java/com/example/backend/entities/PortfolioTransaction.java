package com.example.backend.entities;

import com.example.backend.entities.enums.FlowType;
import com.example.backend.entities.enums.TransactionCategory;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "portfolio_transactions")
public class PortfolioTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(name = "portfolio_item_id", nullable = false)
    private UUID portfolioItemId;

    @Column(nullable = false)
    private String title; // Название траты/дохода (например, "Покупка ламината")

    @Column(columnDefinition = "TEXT")
    private String description; // Дополнительные заметки (по желанию пользователя)

    @Column(nullable = false)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FlowType type; // INCOME (Доход) или EXPENSE (Расход)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TransactionCategory category; // Категория из нашего нового Enum

    @Column(name = "transaction_date", nullable = false)
    private LocalDate transactionDate; // Дата совершения операции

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt; // Дата создания записи в системе

    // Автоматически устанавливаем дату создания перед сохранением в БД
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public PortfolioTransaction() {
    }

    public PortfolioTransaction(UUID portfolioItemId, String title, String description, BigDecimal amount, FlowType type, TransactionCategory category, LocalDate transactionDate) {
        this.portfolioItemId = portfolioItemId;
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

    public UUID getPortfolioItemId() {
        return portfolioItemId;
    }

    public void setPortfolioItemId(UUID portfolioItemId) {
        this.portfolioItemId = portfolioItemId;
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