package com.example.backend.entities;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.UUID;
import java.math.BigDecimal;

import com.example.backend.config.StringCryptoConverter;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "messages")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "BINARY(16)")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_room_id", nullable = false)
    private ChatRoom chatRoom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @Convert(converter = StringCryptoConverter.class) 
    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "is_read", nullable = false)
    private boolean isRead = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "message_type", nullable = false)
    private MessageType messageType = MessageType.TEXT;

    @Column(name = "offer_amount")
    private BigDecimal offerAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "offer_status")
    private OfferStatus offerStatus;

    // --- НОВЫЕ ПОЛЯ ДЛЯ ДОГОВОРОВ АРЕНДЫ И ПРОДАЖИ ---

    @Column(name = "offer_currency", length = 3)
    private String offerCurrency;

    @Enumerated(EnumType.STRING)
    @Column(name = "offer_contract_type")
    private OfferContractType offerContractType;

    @Column(name = "offer_start_date")
    private LocalDate offerStartDate;

    @Column(name = "offer_end_date")
    private LocalDate offerEndDate;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    // --- Геттеры и сеттеры ---

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public ChatRoom getChatRoom() { return chatRoom; }
    public void setChatRoom(ChatRoom chatRoom) { this.chatRoom = chatRoom; }

    public User getSender() { return sender; }
    public void setSender(User sender) { this.sender = sender; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public boolean isRead() { return isRead; }
    public void setRead(boolean read) { this.isRead = read; }

    public MessageType getMessageType() { return messageType; }
    public void setMessageType(MessageType messageType) { this.messageType = messageType; }

    public BigDecimal getOfferAmount() { return offerAmount; }
    public void setOfferAmount(BigDecimal offerAmount) { this.offerAmount = offerAmount; }

    public OfferStatus getOfferStatus() { return offerStatus; }
    public void setOfferStatus(OfferStatus offerStatus) { this.offerStatus = offerStatus; }

    public String getOfferCurrency() { return offerCurrency; }
    public void setOfferCurrency(String offerCurrency) { this.offerCurrency = offerCurrency; }

    public OfferContractType getOfferContractType() { return offerContractType; }
    public void setOfferContractType(OfferContractType offerContractType) { this.offerContractType = offerContractType; }

    public LocalDate getOfferStartDate() { return offerStartDate; }
    public void setOfferStartDate(LocalDate offerStartDate) { this.offerStartDate = offerStartDate; }

    public LocalDate getOfferEndDate() { return offerEndDate; }
    public void setOfferEndDate(LocalDate offerEndDate) { this.offerEndDate = offerEndDate; }

    // --- ENUM ---

    public enum MessageType {
        TEXT, OFFER
    }

    public enum OfferStatus {
        ACTIVE, REJECTED, CANCELED, ACCEPTED
    }

    // Новый enum для определения типа предлагаемого договора
    public enum OfferContractType {
        SALE, LONG_RENT, SHORT_RENT, TERMINATION
    }
}