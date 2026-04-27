package com.example.backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ChatRoomDto(
    UUID id,
    String opponentName,
    UUID opponentId,
    String objectTitle,
    UUID objectId,
    String objectImageUrl,
    String lastMessage,
    LocalDateTime lastMessageAt,
    long unreadCount,
    Double priceUsd,
    Double priceByn
) {
}