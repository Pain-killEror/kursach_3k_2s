package com.example.backend.controllers;

import com.example.backend.dto.ChatRoomDto;
import com.example.backend.dto.MessageDto;
import com.example.backend.entities.User;
import com.example.backend.repositories.UserRepository;
import com.example.backend.services.ChatService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/api/chats", "/api/v1/chats"})
public class ChatController {

    private final ChatService chatService;
    private final UserRepository userRepository;

    public ChatController(ChatService chatService, UserRepository userRepository) {
        this.chatService = chatService;
        this.userRepository = userRepository;
    }

    // Получить текущего пользователя из Security Context
    private User getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
    }

    // Инициализация чата с карточки объекта
    @PostMapping("/init")
    public ResponseEntity<UUID> initChat(@RequestParam UUID objectId) {
        User me = getCurrentUser();
        UUID chatId = chatService.initChat(me.getId(), objectId);
        return ResponseEntity.ok(chatId);
    }


    @GetMapping
    public ResponseEntity<List<ChatRoomDto>> getMyChats() {
        User me = getCurrentUser();
        return ResponseEntity.ok(chatService.getUserChats(me.getId()));
    }

   
    @GetMapping("/{chatId}/messages")
    public ResponseEntity<List<MessageDto>> getChatMessages(@PathVariable UUID chatId) {
        User me = getCurrentUser();
        return ResponseEntity.ok(chatService.getChatMessages(chatId, me.getId()));
    }

    @DeleteMapping("/all")
    public ResponseEntity<String> deleteAllChats() {
        chatService.deleteAllChatsForTesting();
        return ResponseEntity.ok("Все чаты и сообщения успешно удалены!");
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Long> getUnreadCount() {
        User me = getCurrentUser();
        return ResponseEntity.ok(chatService.getTotalUnreadCount(me.getId()));
    }
}