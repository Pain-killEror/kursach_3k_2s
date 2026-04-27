package com.example.backend.services;

import com.example.backend.entities.ChatRoom;
import com.example.backend.entities.Message;
import com.example.backend.repositories.ChatRoomRepository;
import com.example.backend.repositories.MessageRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class ChatCleanupScheduler {

    private final ChatRoomRepository chatRoomRepository;
    private final MessageRepository messageRepository;

    public ChatCleanupScheduler(ChatRoomRepository chatRoomRepository, MessageRepository messageRepository) {
        this.chatRoomRepository = chatRoomRepository;
        this.messageRepository = messageRepository;
    }

    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void checkAndCleanChats() {
        LocalDateTime now = LocalDateTime.now();
        List<ChatRoom> allChats = chatRoomRepository.findAll();

        for (ChatRoom chat : allChats) {
            LocalDateTime lastMsgTime = chat.getLastMessageAt();
            long daysInactive = ChronoUnit.DAYS.between(lastMsgTime, now);
            long hoursInactive = ChronoUnit.HOURS.between(lastMsgTime, now);

            if (daysInactive >= 180) {
                chatRoomRepository.delete(chat);
                continue;
            }

            if (daysInactive == 177 && hoursInactive % 24 == 0) {
                sendSystemWarning(chat, "Внимание! Этот чат неактивен почти полгода и будет удален через 3 дня. Напишите любое сообщение, чтобы сохранить его.");
            }
            else if (daysInactive == 178 && hoursInactive % 24 == 0) {
                sendSystemWarning(chat, "Напоминание: этот чат будет безвозвратно удален через 2 дня из-за неактивности.");
            }
            else if (hoursInactive == (180 * 24 - 5)) {
                sendSystemWarning(chat, "Финальное предупреждение! Чат будет удален через 5 часов. Отправьте сообщение для отмены.");
            }
        }
    }

    private void sendSystemWarning(ChatRoom chat, String text) {
        List<Message> msgs = messageRepository.findByChatRoomIdOrderByCreatedAtAsc(chat.getId());
        if (!msgs.isEmpty() && msgs.get(msgs.size() - 1).getContent().equals(text)) {
            return; 
        }

        Message warning = new Message();
        warning.setChatRoom(chat);
        warning.setSender(chat.getInvestor()); 
        warning.setContent("🤖 Система: " + text);
        messageRepository.save(warning);
    }
}