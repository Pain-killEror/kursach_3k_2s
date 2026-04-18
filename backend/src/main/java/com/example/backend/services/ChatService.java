package com.example.backend.services;

import com.example.backend.dto.ChatRoomDto;
import com.example.backend.dto.MessageDto;
import com.example.backend.entities.ChatRoom;
import com.example.backend.entities.Message;
import com.example.backend.entities.RealEstateObject;
import com.example.backend.entities.RentBooking;
import com.example.backend.entities.User;
import com.example.backend.repositories.ChatRoomRepository;
import com.example.backend.repositories.MessageRepository;
import com.example.backend.repositories.RealEstateObjectRepository;
import com.example.backend.repositories.RentBookingRepository;
import com.example.backend.repositories.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
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
    private final RentBookingRepository rentBookingRepository;

    public ChatService(ChatRoomRepository chatRoomRepository, 
                       MessageRepository messageRepository, 
                       UserRepository userRepository, 
                       RealEstateObjectRepository objectRepository,
                       RentBookingRepository rentBookingRepository) {
        this.chatRoomRepository = chatRoomRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.objectRepository = objectRepository;
        this.rentBookingRepository = rentBookingRepository;
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
        autoMessage.setSender(investor);
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
            
            boolean isInvestor = chat.getInvestor().getId().equals(userId);
            User opponent = isInvestor ? chat.getSeller() : chat.getInvestor();
            
            dto.setOpponentId(opponent.getId());
            dto.setOpponentName(opponent.getName());
            
            RealEstateObject obj = chat.getRealEstateObject();
            dto.setObjectId(obj.getId());
            
            if (obj.getPriceTotal() != null) {
                dto.setPriceUsd(obj.getPriceTotal().doubleValue());
            } else {
                dto.setPriceUsd(null);
            }
            
            dto.setPriceByn(null); 

            String rawCategory = obj.getCategory() != null ? obj.getCategory() : obj.getType();
            String formattedCategory = rawCategory;
            if (rawCategory != null && !rawCategory.isEmpty()) {
                formattedCategory = rawCategory.substring(0, 1).toUpperCase() + rawCategory.substring(1).toLowerCase();
            }
            dto.setObjectTitle(formattedCategory + " • " + (obj.getCity() != null ? obj.getCity() + ", " : "") + obj.getAddress());            
            
            try {
                String urls = obj.getImagesUrls();
                if (urls != null && !urls.isEmpty() && !urls.equals("[]")) {
                    String cleanString = urls.replace("[", "").replace("]", "").replace("\"", "");
                    String firstImage = cleanString.split(",")[0].trim();
                    dto.setObjectImageUrl(firstImage);
                }
            } catch (Exception e) { dto.setObjectImageUrl(null); }

            List<Message> msgs = messageRepository.findByChatRoomIdOrderByCreatedAtAsc(chat.getId());
            if (!msgs.isEmpty()) {
                Message last = msgs.get(msgs.size() - 1);
                if (last.getMessageType() == Message.MessageType.OFFER) {
                    dto.setLastMessage("Предложение о сделке: " + last.getOfferAmount() + " " + (last.getOfferCurrency() != null ? last.getOfferCurrency() : ""));
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
    // ЛОГИКА ДЛЯ ДОГОВОРОВ (ОФФЕРОВ) С НОВЫМИ ПОЛЯМИ
    // ==========================================

    @Transactional
    public MessageDto sendOffer(UUID chatId, UUID senderId, BigDecimal amount, 
                                String currency, String contractTypeStr, 
                                LocalDate startDate, LocalDate endDate) {
        ChatRoom chat = chatRoomRepository.findById(chatId)
                .orElseThrow(() -> new RuntimeException("Чат не найден"));
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));

        // 1. Отменяем старые предложения
        List<Message> existingMessages = messageRepository.findByChatRoomIdOrderByCreatedAtAsc(chatId);
        for (Message msg : existingMessages) {
            if (msg.getMessageType() == Message.MessageType.OFFER && msg.getOfferStatus() == Message.OfferStatus.ACTIVE) {
                msg.setOfferStatus(Message.OfferStatus.CANCELED);
                messageRepository.save(msg);
            }
        }

        // 2. Создаем новое предложение с новыми полями
        Message offer = new Message();
        offer.setChatRoom(chat);
        offer.setSender(sender);
        offer.setMessageType(Message.MessageType.OFFER);
        offer.setOfferAmount(amount);
        offer.setOfferCurrency(currency);
        
        try {
            if (contractTypeStr != null) {
                offer.setOfferContractType(Message.OfferContractType.valueOf(contractTypeStr.toUpperCase()));
            } else {
                offer.setOfferContractType(Message.OfferContractType.SALE); // Дефолт, если фронтенд не прислал
            }
        } catch (IllegalArgumentException e) {
            offer.setOfferContractType(Message.OfferContractType.SALE);
        }

        offer.setOfferStartDate(startDate);
        offer.setOfferEndDate(endDate);
        offer.setOfferStatus(Message.OfferStatus.ACTIVE);
        
        String typeLabel = offer.getOfferContractType() == Message.OfferContractType.TERMINATION ? "Расторжение договора" : "Договор";
        offer.setContent("Системное сообщение: " + typeLabel + " (" + amount + " " + currency + ")"); 
        
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

        ChatRoom chat = msg.getChatRoom();
        RealEstateObject object = chat.getRealEstateObject();
        User tenantOrBuyer = chat.getInvestor(); // Покупатель/Арендатор - это всегда тот, кто начал чат

        // Проверяем тип контракта
        Message.OfferContractType contractType = msg.getOfferContractType() != null 
                ? msg.getOfferContractType() 
                : Message.OfferContractType.SALE; // Фоллбэк для старых записей

        switch (contractType) {
            case SHORT_RENT:
                // Проверяем занятость дат
                if (rentBookingRepository.hasOverlappingBookings(object.getId(), msg.getOfferStartDate(), msg.getOfferEndDate())) {
                    throw new RuntimeException("Выбранные даты уже забронированы другим пользователем");
                }
                // Создаем запись бронирования
                RentBooking booking = new RentBooking();
                booking.setRealEstateObject(object);
                booking.setTenant(tenantOrBuyer);
                booking.setStartDate(msg.getOfferStartDate());
                booking.setEndDate(msg.getOfferEndDate());
                rentBookingRepository.save(booking);
                // Объект остается видимым
                break;

            case LONG_RENT:
                object.setCurrentOccupant(tenantOrBuyer);
                object.setIsVisible(false); // Прячем с главной
                objectRepository.save(object);
                break;

            case SALE:
                // При продаже можно полностью сменить владельца (getUser) или записать в currentOccupant.
                // Запишем в currentOccupant для гибкости (чтобы у прошлого владельца осталась история объекта)
                object.setCurrentOccupant(tenantOrBuyer);
                object.setObjectStatus(com.example.backend.entities.ObjectStatus.SOLD);
                object.setIsVisible(false);
                objectRepository.save(object);
                break;

            case TERMINATION:
                // Расторжение долгосрока
                object.setCurrentOccupant(null);
                // Объект появится на главной только через 30 дней
                object.setAvailableFrom(LocalDateTime.now().plusDays(30));
                // isVisible остается false, пока фоновая задача не включит его обратно
                objectRepository.save(object);
                break;
        }

        // Меняем статус сообщения на ПРИНЯТО
        msg.setOfferStatus(Message.OfferStatus.ACCEPTED);
        msg = messageRepository.save(msg);

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
        
        if (m.getMessageType() != null) {
            dto.setMessageType(m.getMessageType().name());
        }
        
        dto.setOfferAmount(m.getOfferAmount());
        dto.setOfferCurrency(m.getOfferCurrency());
        
        if (m.getOfferContractType() != null) {
            dto.setOfferContractType(m.getOfferContractType().name());
        }
        
        dto.setOfferStartDate(m.getOfferStartDate());
        dto.setOfferEndDate(m.getOfferEndDate());
        
        if (m.getOfferStatus() != null) {
            dto.setOfferStatus(m.getOfferStatus().name());
        }
        
        return dto;
    }
}