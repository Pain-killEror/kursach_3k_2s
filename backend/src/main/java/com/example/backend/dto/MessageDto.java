package com.example.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record MessageDto(
    UUID id,
    UUID chatRoomId,
    UUID senderId,
    String senderName,
    String content,
    LocalDateTime createdAt,
    boolean isRead,
    String messageType,
    BigDecimal offerAmount,
    String offerStatus,
    String offerCurrency,
    String offerContractType,
    LocalDate offerStartDate,
    LocalDate offerEndDate
) {
}