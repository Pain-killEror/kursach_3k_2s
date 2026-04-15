package com.example.backend.repositories;

import com.example.backend.entities.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MessageRepository extends JpaRepository<Message, UUID> {

    // Получить всю переписку в конкретном чате (от старых к новым)
    List<Message> findByChatRoomIdOrderByCreatedAtAsc(UUID chatRoomId);

    // Подсчет непрочитанных сообщений для конкретного пользователя в чате (где отправитель НЕ он сам)
    @Query("SELECT COUNT(m) FROM Message m WHERE m.chatRoom.id = :chatRoomId AND m.sender.id != :userId AND m.isRead = false")
    long countUnreadMessages(@Param("chatRoomId") UUID chatRoomId, @Param("userId") UUID userId);

    // Пометить все чужие сообщения в чате как прочитанные
    @Modifying
    @Query("UPDATE Message m SET m.isRead = true WHERE m.chatRoom.id = :chatRoomId AND m.sender.id != :userId AND m.isRead = false")
    void markMessagesAsRead(@Param("chatRoomId") UUID chatRoomId, @Param("userId") UUID userId);
}