package com.example.backend.services;

import com.example.backend.dto.ChatRoomDto;
import com.example.backend.dto.MessageDto;
import com.example.backend.entities.ChatRoom;
import com.example.backend.entities.Message;
import com.example.backend.entities.RealEstateObject;
import com.example.backend.entities.User;
import com.example.backend.repositories.ChatRoomRepository;
import com.example.backend.repositories.MessageRepository;
import com.example.backend.repositories.RealEstateObjectRepository;
import com.example.backend.repositories.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ChatService {

    private final ChatRoomRepository chatRoomRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final RealEstateObjectRepository objectRepository;

    public ChatService(ChatRoomRepository chatRoomRepository, MessageRepository messageRepository, 
                       UserRepository userRepository, RealEstateObjectRepository objectRepository) {
        this.chatRoomRepository = chatRoomRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.objectRepository = objectRepository;
    }

    @Transactional
    public void deleteAllChatsForTesting() {
        chatRoomRepository.deleteAll();
    }

    @Transactional
    public UUID initChat(UUID investorId, UUID objectId) {
        RealEstateObject object = objectRepository.findById(objectId)
                .orElseThrow(() -> new RuntimeException("Объект не найден"));
        
        UUID sellerId = object.getUser().getId();

        // Проверяем, есть ли уже чат
        Optional<ChatRoom> existingChat = chatRoomRepository.findByInvestorIdAndSellerIdAndRealEstateObjectId(investorId, sellerId, objectId);
        if (existingChat.isPresent()) {
            return existingChat.get().getId();
        }

        // Если чата нет - создаем
        User investor = userRepository.findById(investorId).orElseThrow();
        User seller = userRepository.findById(sellerId).orElseThrow();

        ChatRoom newChat = new ChatRoom();
        newChat.setInvestor(investor);
        newChat.setSeller(seller);
        newChat.setRealEstateObject(object);
        newChat = chatRoomRepository.save(newChat);

        // Отправляем автоматическое первое сообщение
        Message autoMessage = new Message();
        autoMessage.setChatRoom(newChat);
        autoMessage.setSender(investor); // От лица инвестора
        autoMessage.setContent("Здравствуйте! Меня заинтересовал ваш объект: " + object.getType() + ", " + object.getAddress() + ". Актуально?");
        messageRepository.save(autoMessage);

        return newChat.getId();
    }

    @Transactional(readOnly = true)
    public List<ChatRoomDto> getUserChats(UUID userId) {
        List<ChatRoom> chats = chatRoomRepository.findAllByUserId(userId);

        return chats.stream().map(chat -> {
            ChatRoomDto dto = new ChatRoomDto();
            dto.setId(chat.getId());
            
            // Определяем собеседника
            boolean isInvestor = chat.getInvestor().getId().equals(userId);
            User opponent = isInvestor ? chat.getSeller() : chat.getInvestor();
            
            dto.setOpponentId(opponent.getId());
            dto.setOpponentName(opponent.getName());
            
            // Информация об объекте
            RealEstateObject obj = chat.getRealEstateObject();
            dto.setObjectId(obj.getId());
            String rawCategory = obj.getCategory() != null ? obj.getCategory() : obj.getType();
            String formattedCategory = rawCategory;
            if (rawCategory != null && !rawCategory.isEmpty()) {
                formattedCategory = rawCategory.substring(0, 1).toUpperCase() + rawCategory.substring(1).toLowerCase();
            }
            dto.setObjectTitle(formattedCategory + " • " + (obj.getCity() != null ? obj.getCity() + ", " : "") + obj.getAddress());            
            // Парсим первую картинку из JSON массива
            try {
                String urls = obj.getImagesUrls();
                if (urls != null && !urls.isEmpty() && !urls.equals("[]")) {
                    String cleanString = urls.replace("[", "").replace("]", "").replace("\"", "");
                    String firstImage = cleanString.split(",")[0].trim();
                    dto.setObjectImageUrl(firstImage);
                }
            } catch (Exception e) { dto.setObjectImageUrl(null); }

            // Данные о последнем сообщении
            List<Message> msgs = messageRepository.findByChatRoomIdOrderByCreatedAtAsc(chat.getId());
            if (!msgs.isEmpty()) {
                Message last = msgs.get(msgs.size() - 1);
                // Если последнее сообщение — это оффер, пишем системный текст
                if (last.getMessageType() == Message.MessageType.OFFER) {
                    dto.setLastMessage("Предложение о сделке: " + last.getOfferAmount());
                } else {
                    dto.setLastMessage(last.getContent());
                }
                dto.setLastMessageAt(last.getCreatedAt());
            }

            dto.setUnreadCount(messageRepository.countUnreadMessages(chat.getId(), userId));
            return dto;
        }).collect(Collectors.toList());
    }

    @Transactional
    public List<MessageDto> getChatMessages(UUID chatId, UUID userId) {
        // Помечаем чужие сообщения как прочитанные, так как юзер открыл чат
        messageRepository.markMessagesAsRead(chatId, userId);

        List<Message> messages = messageRepository.findByChatRoomIdOrderByCreatedAtAsc(chatId);
        return messages.stream().map(this::mapToMessageDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public long getTotalUnreadCount(UUID userId) {
        List<ChatRoom> chats = chatRoomRepository.findAllByUserId(userId);
        long total = 0;
        for (ChatRoom chat : chats) {
            total += messageRepository.countUnreadMessages(chat.getId(), userId);
        }
        return total;
    }

    // ==========================================
    // НОВАЯ ЛОГИКА ДЛЯ ДОГОВОРОВ (ОФФЕРОВ)
    // ==========================================

    @Transactional
    public MessageDto sendOffer(UUID chatId, UUID senderId, BigDecimal amount) {
        ChatRoom chat = chatRoomRepository.findById(chatId)
                .orElseThrow(() -> new RuntimeException("Чат не найден"));
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));

        // 1. Находим все текущие активные предложения в этом чате и отменяем их
        List<Message> existingMessages = messageRepository.findByChatRoomIdOrderByCreatedAtAsc(chatId);
        for (Message msg : existingMessages) {
            if (msg.getMessageType() == Message.MessageType.OFFER && msg.getOfferStatus() == Message.OfferStatus.ACTIVE) {
                msg.setOfferStatus(Message.OfferStatus.CANCELED);
                messageRepository.save(msg);
            }
        }

        // 2. Создаем новое предложение
        Message offer = new Message();
        offer.setChatRoom(chat);
        offer.setSender(sender);
        offer.setMessageType(Message.MessageType.OFFER);
        offer.setOfferAmount(amount);
        offer.setOfferStatus(Message.OfferStatus.ACTIVE);
        offer.setContent("Системное сообщение: Договор на сумму " + amount); 
        
        offer = messageRepository.save(offer);
        return mapToMessageDto(offer);
    }

    @Transactional
    public MessageDto cancelOffer(UUID messageId, UUID userId) {
        Message msg = messageRepository.findById(messageId).orElseThrow();
        if (!msg.getSender().getId().equals(userId)) {
            throw new RuntimeException("Только отправитель может отозвать предложение");
        }
        if (msg.getOfferStatus() == Message.OfferStatus.ACTIVE) {
            msg.setOfferStatus(Message.OfferStatus.CANCELED);
            msg = messageRepository.save(msg);
        }
        return mapToMessageDto(msg);
    }

    @Transactional
    public MessageDto rejectOffer(UUID messageId, UUID userId) {
        Message msg = messageRepository.findById(messageId).orElseThrow();
        if (msg.getSender().getId().equals(userId)) {
            throw new RuntimeException("Отправитель не может отклонить свое же предложение");
        }
        if (msg.getOfferStatus() == Message.OfferStatus.ACTIVE) {
            msg.setOfferStatus(Message.OfferStatus.REJECTED);
            msg = messageRepository.save(msg);
        }
        return mapToMessageDto(msg);
    }

    @Transactional
    public MessageDto acceptOffer(UUID messageId, UUID userId) {
        Message msg = messageRepository.findById(messageId).orElseThrow();
        if (msg.getSender().getId().equals(userId)) {
            throw new RuntimeException("Отправитель не может принять свое же предложение");
        }
        if (msg.getOfferStatus() != Message.OfferStatus.ACTIVE) {
            throw new RuntimeException("Это предложение уже неактивно");
        }

        // 1. Меняем статус сообщения на ПРИНЯТО
        msg.setOfferStatus(Message.OfferStatus.ACCEPTED);
        msg = messageRepository.save(msg);

        // 2. Меняем владельца объекта на инвестора и скрываем объект из поиска
        ChatRoom chat = msg.getChatRoom();
        RealEstateObject object = chat.getRealEstateObject();
        
        // Владельцем всегда становится инвестор из этого чата
        object.setUser(chat.getInvestor()); 
        object.setIsVisible(false);// Делаем объявление неактивным для остальных
        
        objectRepository.save(object);

        return mapToMessageDto(msg);
    }

    // Вспомогательный метод маппинга
    private MessageDto mapToMessageDto(Message m) {
        MessageDto dto = new MessageDto();
        dto.setId(m.getId());
        dto.setChatRoomId(m.getChatRoom().getId());
        dto.setSenderId(m.getSender().getId());
        dto.setSenderName(m.getSender().getName());
        dto.setContent(m.getContent());
        dto.setCreatedAt(m.getCreatedAt());
        dto.setRead(m.isRead());
        
        // Маппим новые поля оффера
        if (m.getMessageType() != null) {
            dto.setMessageType(m.getMessageType().name());
        }
        dto.setOfferAmount(m.getOfferAmount());
        if (m.getOfferStatus() != null) {
            dto.setOfferStatus(m.getOfferStatus().name());
        }
        
        return dto;
    }
}