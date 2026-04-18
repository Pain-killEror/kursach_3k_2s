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
    private final ChatService chatService;

    public WebSocketChatController(SimpMessagingTemplate messagingTemplate, MessageRepository messageRepository,
                                   ChatRoomRepository chatRoomRepository, UserRepository userRepository,
                                   ChatService chatService) {
        this.messagingTemplate = messagingTemplate;
        this.messageRepository = messageRepository;
        this.chatRoomRepository = chatRoomRepository;
        this.userRepository = userRepository;
        this.chatService = chatService;
    }

    @MessageMapping("/chat/{chatId}/sendMessage")
    @Transactional
    public void sendMessage(@DestinationVariable UUID chatId, @Payload MessageDto messageDto) {
        ChatRoom chat = chatRoomRepository.findById(chatId).orElseThrow();
        User sender = userRepository.findById(messageDto.getSenderId()).orElseThrow();

        Message message = new Message();
        message.setChatRoom(chat);
        message.setSender(sender);
        message.setContent(messageDto.getContent());
        messageRepository.save(message);

        chat.setLastMessageAt(message.getCreatedAt());
        chatRoomRepository.save(chat);

        messageDto.setId(message.getId());
        messageDto.setSenderName(sender.getName());
        messageDto.setCreatedAt(message.getCreatedAt());
        messageDto.setRead(false);

        messagingTemplate.convertAndSend("/topic/chat/" + chatId, messageDto);
    }

    // ==========================================
    // ЛОГИКА ДЛЯ ДОГОВОРОВ (СДЕЛОК)
    // ==========================================

    @MessageMapping("/chat/{chatId}/sendOffer")
    public void sendOffer(@DestinationVariable UUID chatId, @Payload MessageDto payload) {
        try {
            // Передаем новые поля: валюту, тип контракта и даты
            MessageDto result = chatService.sendOffer(
                    chatId, 
                    payload.getSenderId(), 
                    payload.getOfferAmount(),
                    payload.getOfferCurrency(),
                    payload.getOfferContractType(),
                    payload.getOfferStartDate(),
                    payload.getOfferEndDate()
            );
            messagingTemplate.convertAndSend("/topic/chat/" + chatId, result);
        } catch (Exception e) {
            sendErrorMessage(chatId, e.getMessage());
        }
    }

    @MessageMapping("/chat/{chatId}/cancelOffer")
    public void cancelOffer(@DestinationVariable UUID chatId, @Payload MessageDto payload) {
        try {
            MessageDto result = chatService.cancelOffer(payload.getId(), payload.getSenderId());
            messagingTemplate.convertAndSend("/topic/chat/" + chatId, result);
        } catch (Exception e) {
            sendErrorMessage(chatId, e.getMessage());
        }
    }

    @MessageMapping("/chat/{chatId}/rejectOffer")
    public void rejectOffer(@DestinationVariable UUID chatId, @Payload MessageDto payload) {
        try {
            MessageDto result = chatService.rejectOffer(payload.getId(), payload.getSenderId());
            messagingTemplate.convertAndSend("/topic/chat/" + chatId, result);
        } catch (Exception e) {
            sendErrorMessage(chatId, e.getMessage());
        }
    }

    @MessageMapping("/chat/{chatId}/acceptOffer")
    public void acceptOffer(@DestinationVariable UUID chatId, @Payload MessageDto payload) {
        try {
            MessageDto result = chatService.acceptOffer(payload.getId(), payload.getSenderId());
            messagingTemplate.convertAndSend("/topic/chat/" + chatId, result);
        } catch (Exception e) {
            // Если даты уже заняты (для краткосрочки), поймаем ошибку здесь и отправим в чат
            sendErrorMessage(chatId, "Ошибка: " + e.getMessage());
        }
    }

    // Вспомогательный метод для отправки ошибок в чат (чтобы фронтенд мог их показать)
    private void sendErrorMessage(UUID chatId, String errorMsg) {
        MessageDto errorDto = new MessageDto();
        errorDto.setMessageType("ERROR");
        errorDto.setContent(errorMsg);
        messagingTemplate.convertAndSend("/topic/chat/" + chatId, errorDto);
    }
}