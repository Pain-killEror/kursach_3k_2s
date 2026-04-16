package com.example.backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;
import java.math.BigDecimal;

public class MessageDto {
    private UUID id;
    private UUID chatRoomId;
    private UUID senderId;
    private String senderName;
    private String content;
    private LocalDateTime createdAt;
    private boolean isRead;

    private String messageType;
    private BigDecimal offerAmount;
    private String offerStatus;

    public MessageDto() {}


    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getChatRoomId() { return chatRoomId; }
    public void setChatRoomId(UUID chatRoomId) { this.chatRoomId = chatRoomId; }

    public UUID getSenderId() { return senderId; }
    public void setSenderId(UUID senderId) { this.senderId = senderId; }

    public String getSenderName() { return senderName; }
    public void setSenderName(String senderName) { this.senderName = senderName; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public boolean isRead() { return isRead; }
    public void setRead(boolean read) { isRead = read; }


    public String getMessageType() { return messageType; }
    public void setMessageType(String messageType) { this.messageType = messageType; }

    public BigDecimal getOfferAmount() { return offerAmount; }
    public void setOfferAmount(BigDecimal offerAmount) { this.offerAmount = offerAmount; }

    public String getOfferStatus() { return offerStatus; }
    public void setOfferStatus(String offerStatus) { this.offerStatus = offerStatus; }
}