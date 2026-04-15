package com.example.backend.repositories;

import com.example.backend.entities.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChatRoomRepository extends JpaRepository<ChatRoom, UUID> {

    // Проверка: есть ли уже чат между этим инвестором и продавцом по этому объекту
    Optional<ChatRoom> findByInvestorIdAndSellerIdAndRealEstateObjectId(UUID investorId, UUID sellerId, UUID objectId);

    // Получить все чаты пользователя (неважно, инвестор он или продавец), отсортированные по времени последнего сообщения
    @Query("SELECT c FROM ChatRoom c WHERE c.investor.id = :userId OR c.seller.id = :userId ORDER BY c.lastMessageAt DESC")
    List<ChatRoom> findAllByUserId(@Param("userId") UUID userId);

    // Для автоматического удаления старых чатов
    List<ChatRoom> findByLastMessageAtBefore(LocalDateTime dateTime);
}