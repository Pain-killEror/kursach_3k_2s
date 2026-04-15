package com.example.backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public class ChatRoomDto {
    private UUID id;
    private String opponentName;  // Имя собеседника (чтобы фронту не пришлось вычислять, кто есть кто)
    private UUID opponentId;
    private String objectTitle;   // Например: "Квартира • г. Минск, пр-т Независимости, 4"
    private UUID objectId;
    private String objectImageUrl; // Ссылка на первое фото (для мини-карточки)
    private String lastMessage;
    private LocalDateTime lastMessageAt;
    private long unreadCount;

    // Пустой конструктор
    public ChatRoomDto() {}

    // Геттеры и сеттеры
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getOpponentName() { return opponentName; }
    public void setOpponentName(String opponentName) { this.opponentName = opponentName; }

    public UUID getOpponentId() { return opponentId; }
    public void setOpponentId(UUID opponentId) { this.opponentId = opponentId; }

    public String getObjectTitle() { return objectTitle; }
    public void setObjectTitle(String objectTitle) { this.objectTitle = objectTitle; }

    public UUID getObjectId() { return objectId; }
    public void setObjectId(UUID objectId) { this.objectId = objectId; }

    public String getObjectImageUrl() { return objectImageUrl; }
    public void setObjectImageUrl(String objectImageUrl) { this.objectImageUrl = objectImageUrl; }

    public String getLastMessage() { return lastMessage; }
    public void setLastMessage(String lastMessage) { this.lastMessage = lastMessage; }

    public LocalDateTime getLastMessageAt() { return lastMessageAt; }
    public void setLastMessageAt(LocalDateTime lastMessageAt) { this.lastMessageAt = lastMessageAt; }

    public long getUnreadCount() { return unreadCount; }
    public void setUnreadCount(long unreadCount) { this.unreadCount = unreadCount; }
}