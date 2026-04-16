package com.example.backend.controllers;

import com.example.backend.dto.MessageDto;
import com.example.backend.entities.ChatRoom;
import com.example.backend.entities.Message;
import com.example.backend.entities.User;
import com.example.backend.repositories.ChatRoomRepository;
import com.example.backend.repositories.MessageRepository;
import com.example.backend.repositories.UserRepository;
import com.example.backend.services.ChatService;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Controller
public class WebSocketChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final MessageRepository messageRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final UserRepository userRepository;
    private final ChatService chatService; // Подключаем наш сервис с бизнес-логикой

    public WebSocketChatController(SimpMessagingTemplate messagingTemplate, MessageRepository messageRepository,
                                   ChatRoomRepository chatRoomRepository, UserRepository userRepository,
                                   ChatService chatService) {
        this.messagingTemplate = messagingTemplate;
        this.messageRepository = messageRepository;
        this.chatRoomRepository = chatRoomRepository;
        this.userRepository = userRepository;
        this.chatService = chatService;
    }

    // Стандартная отправка текстового сообщения (оставляем твою логику без изменений)
    @MessageMapping("/chat/{chatId}/sendMessage")
    @Transactional
    public void sendMessage(@DestinationVariable UUID chatId, @Payload MessageDto messageDto) {
        // 1. Ищем чат и отправителя
        ChatRoom chat = chatRoomRepository.findById(chatId).orElseThrow();
        User sender = userRepository.findById(messageDto.getSenderId()).orElseThrow();

        // 2. Создаем и сохраняем сообщение в БД
        Message message = new Message();
        message.setChatRoom(chat);
        message.setSender(sender);
        message.setContent(messageDto.getContent());
        messageRepository.save(message);

        // 3. Обновляем время последнего сообщения в чате (для сортировки в левом меню)
        chat.setLastMessageAt(message.getCreatedAt());
        chatRoomRepository.save(chat);

        // 4. Дополняем DTO данными из БД перед отправкой обратно на фронт
        messageDto.setId(message.getId());
        messageDto.setSenderName(sender.getName());
        messageDto.setCreatedAt(message.getCreatedAt());
        messageDto.setRead(false);

        // 5. Мгновенно рассылаем сообщение всем, кто подписан на топик этого чата
        messagingTemplate.convertAndSend("/topic/chat/" + chatId, messageDto);
    }

    // ==========================================
    // ЛОГИКА ДЛЯ ДОГОВОРОВ (СДЕЛОК)
    // ==========================================

    // 1. Отправка нового предложения
    @MessageMapping("/chat/{chatId}/sendOffer")
    public void sendOffer(@DestinationVariable UUID chatId, @Payload MessageDto payload) {
        // payload должен содержать senderId и offerAmount
        MessageDto result = chatService.sendOffer(chatId, payload.getSenderId(), payload.getOfferAmount());
        // Рассылаем созданный оффер в чат
        messagingTemplate.convertAndSend("/topic/chat/" + chatId, result);
    }

    // 2. Отправитель сам отзывает свое предложение
    @MessageMapping("/chat/{chatId}/cancelOffer")
    public void cancelOffer(@DestinationVariable UUID chatId, @Payload MessageDto payload) {
        // payload должен содержать id (сообщения) и senderId (кто нажал отмену)
        MessageDto result = chatService.cancelOffer(payload.getId(), payload.getSenderId());
        // Рассылаем обновленный статус (чтобы у всех посерело и пропали кнопки)
        messagingTemplate.convertAndSend("/topic/chat/" + chatId, result);
    }

    // 3. Получатель отклоняет предложение
    @MessageMapping("/chat/{chatId}/rejectOffer")
    public void rejectOffer(@DestinationVariable UUID chatId, @Payload MessageDto payload) {
        MessageDto result = chatService.rejectOffer(payload.getId(), payload.getSenderId());
        messagingTemplate.convertAndSend("/topic/chat/" + chatId, result);
    }

    // 4. Получатель ПРИНИМАЕТ предложение (Смена собственника!)
    @MessageMapping("/chat/{chatId}/acceptOffer")
    public void acceptOffer(@DestinationVariable UUID chatId, @Payload MessageDto payload) {
        MessageDto result = chatService.acceptOffer(payload.getId(), payload.getSenderId());
        messagingTemplate.convertAndSend("/topic/chat/" + chatId, result);
    }
}