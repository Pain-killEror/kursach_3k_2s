package com.example.backend.services;

import com.example.backend.dto.ChatRoomDto;
import com.example.backend.dto.MessageDto;
import com.example.backend.entities.*;
import com.example.backend.repositories.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import com.example.backend.entities.ObjectStatus;

@Service
public class ChatService {

    private final ChatRoomRepository chatRoomRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final RealEstateObjectRepository objectRepository;
    private final RentBookingRepository rentBookingRepository;
    private final PortfolioItemRepository portfolioItemRepository;
    private final PortfolioRepository portfolioRepository; 
    private final PortfolioTransactionRepository portfolioTransactionRepository;
    private final GlobalSettingRepository globalSettingRepository;

    public ChatService(ChatRoomRepository chatRoomRepository, 
                       MessageRepository messageRepository, 
                       UserRepository userRepository, 
                       RealEstateObjectRepository objectRepository,
                       RentBookingRepository rentBookingRepository, 
                       PortfolioItemRepository portfolioItemRepository,
                       PortfolioRepository portfolioRepository,
                       PortfolioTransactionRepository portfolioTransactionRepository,
                       GlobalSettingRepository globalSettingRepository) {
        this.chatRoomRepository = chatRoomRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.objectRepository = objectRepository;
        this.rentBookingRepository = rentBookingRepository;
        this.portfolioItemRepository = portfolioItemRepository;
        this.portfolioRepository = portfolioRepository; 
        this.portfolioTransactionRepository = portfolioTransactionRepository;
        this.globalSettingRepository = globalSettingRepository;
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

        Optional<ChatRoom> existingChat = chatRoomRepository.findByInvestorIdAndSellerIdAndRealEstateObjectId(investorId, sellerId, objectId);
        if (existingChat.isPresent()) {
            return existingChat.get().getId();
        }

        User investor = userRepository.findById(investorId).orElseThrow();
        User seller = userRepository.findById(sellerId).orElseThrow();

        ChatRoom newChat = new ChatRoom();
        newChat.setInvestor(investor);
        newChat.setSeller(seller);
        newChat.setRealEstateObject(object);
        newChat = chatRoomRepository.save(newChat);

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

    @Transactional
    public MessageDto sendOffer(UUID chatId, UUID senderId, BigDecimal amount, 
                                String currency, String contractTypeStr, 
                                LocalDate startDate, LocalDate endDate) {
        ChatRoom chat = chatRoomRepository.findById(chatId)
                .orElseThrow(() -> new RuntimeException("Чат не найден"));
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));

        List<Message> existingMessages = messageRepository.findByChatRoomIdOrderByCreatedAtAsc(chatId);
        for (Message msg : existingMessages) {
            if (msg.getMessageType() == Message.MessageType.OFFER && msg.getOfferStatus() == Message.OfferStatus.ACTIVE) {
                msg.setOfferStatus(Message.OfferStatus.CANCELED);
                messageRepository.save(msg);
            }
        }

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
                offer.setOfferContractType(Message.OfferContractType.SALE);
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

    private BigDecimal getSystemTaxRate(User user) {
        try {
            String entityType = user.getEntityType() != null ? user.getEntityType().name() : "INDIVIDUAL";
            String settingKey = switch (entityType) {
                case "ENTREPRENEUR" -> "TAX_ENTREPRENEUR_INCOME";
                case "LEGAL" -> "TAX_LEGAL_USN";
                default -> "TAX_INDIVIDUAL_INCOME";
            };
            Optional<GlobalSetting> settingOpt = globalSettingRepository.findBySettingKey(settingKey);
            if (settingOpt.isPresent() && settingOpt.get().getSettingValue() != null) {
                return settingOpt.get().getSettingValue();
            }
        } catch (Exception e) {}
        return new BigDecimal("13.0");
    }

    @Transactional
    public MessageDto acceptOffer(UUID messageId, UUID userId) {
        Message msg = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Сообщение не найдено"));

        if (msg.getSender().getId().equals(userId)) {
            throw new RuntimeException("Отправитель не может принять свое же предложение");
        }
        if (msg.getOfferStatus() != Message.OfferStatus.ACTIVE) {
            throw new RuntimeException("Это предложение уже неактивно");
        }

        ChatRoom chat = msg.getChatRoom();
        RealEstateObject object = chat.getRealEstateObject();
        User buyer = chat.getInvestor(); 
        User seller = chat.getSeller();  

        Portfolio buyerPortfolio = portfolioRepository.findByUserId(buyer.getId())
                .orElseGet(() -> {
                    Portfolio newP = new Portfolio();
                    newP.setUser(buyer);
                    newP.setName("Основной портфель");
                    return portfolioRepository.save(newP);
                });

        Portfolio sellerPortfolio = portfolioRepository.findByUserId(seller.getId())
                .orElseGet(() -> {
                    Portfolio newP = new Portfolio();
                    newP.setUser(seller);
                    newP.setName("Основной портфель");
                    return portfolioRepository.save(newP);
                });

        PortfolioItem sItem = portfolioItemRepository.findAllByPortfolio_User_Id(seller.getId())
                .stream()
                .filter(item -> item.getRealEstateObject().getId().equals(object.getId()))
                .findFirst()
                .orElseGet(() -> {
                    PortfolioItem newItem = new PortfolioItem();
                    newItem.setPortfolio(sellerPortfolio);
                    newItem.setRealEstateObject(object);
                    newItem.setStatus("ACTIVE");
                    newItem.setStrategyName("Сдача в аренду");
                    newItem.setInvestedAmount(object.getPriceTotal() != null ? object.getPriceTotal() : BigDecimal.ZERO);
                    newItem.setPurchaseDate(LocalDate.now());
                    return portfolioItemRepository.save(newItem);
                });

        Message.OfferContractType contractType = msg.getOfferContractType() != null 
                ? msg.getOfferContractType() 
                : Message.OfferContractType.SALE;

        switch (contractType) {
            case SALE:
                BigDecimal taxRate = getSystemTaxRate(seller);
                BigDecimal taxMultiplier = BigDecimal.ONE.subtract(taxRate.divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP));
                BigDecimal netProceeds = msg.getOfferAmount().multiply(taxMultiplier);

                PortfolioTransaction saleTx = new PortfolioTransaction();
                saleTx.setPortfolioItem(sItem);
                saleTx.setAmount(netProceeds);
                saleTx.setType(com.example.backend.entities.enums.FlowType.INCOME);
                saleTx.setCategory(com.example.backend.entities.enums.TransactionCategory.SALE_PROCEEDS); 
                saleTx.setTitle("🟢 Объект продан (вычтен налог " + taxRate + "%)"); 
                saleTx.setTransactionDate(LocalDate.now());
                portfolioTransactionRepository.save(saleTx);

                sItem.setStatus("SOLD");
                portfolioItemRepository.save(sItem);

                object.setUser(buyer); 
                object.setCurrentOccupant(buyer);
                object.setObjectStatus(ObjectStatus.SOLD);
                object.setIsVisible(false);
                objectRepository.save(object);

                createPortfolioEntry(buyerPortfolio, object, "Перепродажа", msg.getOfferAmount());
                break;

            case LONG_RENT:
                PortfolioTransaction rentTx = new PortfolioTransaction();
                rentTx.setPortfolioItem(sItem);
                rentTx.setAmount(msg.getOfferAmount()); // Сумма аренды
                rentTx.setType(com.example.backend.entities.enums.FlowType.INCOME);
                rentTx.setCategory(com.example.backend.entities.enums.TransactionCategory.RENT_INCOME); 
                rentTx.setTitle("🔵 Сдан в долгосрочную аренду");
                rentTx.setTransactionDate(msg.getOfferStartDate() != null ? msg.getOfferStartDate() : LocalDate.now());
                portfolioTransactionRepository.save(rentTx);

                sItem.setStatus("RENTED");
                portfolioItemRepository.save(sItem);

                object.setCurrentOccupant(buyer);
                object.setIsVisible(false);
                objectRepository.save(object);

                PortfolioItem buyerLongRentItem = createPortfolioEntry(buyerPortfolio, object, "Долгосрочная аренда", BigDecimal.ZERO);
                
                PortfolioTransaction buyerRentTx = new PortfolioTransaction();
                buyerRentTx.setPortfolioItem(buyerLongRentItem);
                buyerRentTx.setAmount(msg.getOfferAmount());
                buyerRentTx.setType(com.example.backend.entities.enums.FlowType.EXPENSE);
                buyerRentTx.setCategory(com.example.backend.entities.enums.TransactionCategory.OTHER); 
                buyerRentTx.setTitle("🔵 Взят в долгосрочную аренду (Заезд: " + (msg.getOfferStartDate() != null ? msg.getOfferStartDate() : LocalDate.now()) + ")");
                buyerRentTx.setTransactionDate(msg.getOfferStartDate() != null ? msg.getOfferStartDate() : LocalDate.now());
                portfolioTransactionRepository.save(buyerRentTx);
                break;

            case SHORT_RENT:
                PortfolioTransaction shortRentTx = new PortfolioTransaction();
                shortRentTx.setPortfolioItem(sItem);
                shortRentTx.setAmount(msg.getOfferAmount());
                shortRentTx.setType(com.example.backend.entities.enums.FlowType.INCOME);
                shortRentTx.setCategory(com.example.backend.entities.enums.TransactionCategory.RENT_INCOME); 
                shortRentTx.setTitle("🔵 Сдан посуточно (с " + msg.getOfferStartDate() + " по " + msg.getOfferEndDate() + ")");
                shortRentTx.setTransactionDate(msg.getOfferStartDate() != null ? msg.getOfferStartDate() : LocalDate.now());
                portfolioTransactionRepository.save(shortRentTx);

                sItem.setStatus("RENTED");
                portfolioItemRepository.save(sItem);

                if (rentBookingRepository.hasOverlappingBookings(object.getId(), msg.getOfferStartDate(), msg.getOfferEndDate())) {
                    throw new RuntimeException("Выбранные даты уже забронированы");
                }
                RentBooking booking = new RentBooking();
                booking.setRealEstateObject(object);
                booking.setTenant(buyer);
                booking.setStartDate(msg.getOfferStartDate());
                booking.setEndDate(msg.getOfferEndDate());
                rentBookingRepository.save(booking);

                PortfolioItem buyerShortRentItem = createPortfolioEntry(buyerPortfolio, object, "Краткосрочная аренда", BigDecimal.ZERO);
                
                PortfolioTransaction buyerShortRentTx = new PortfolioTransaction();
                buyerShortRentTx.setPortfolioItem(buyerShortRentItem);
                buyerShortRentTx.setAmount(msg.getOfferAmount());
                buyerShortRentTx.setType(com.example.backend.entities.enums.FlowType.EXPENSE);
                buyerShortRentTx.setCategory(com.example.backend.entities.enums.TransactionCategory.OTHER); 
                buyerShortRentTx.setTitle("🔵 Взят посуточно (Заезд: " + msg.getOfferStartDate() + ", Выезд: " + msg.getOfferEndDate() + ")");
                buyerShortRentTx.setTransactionDate(msg.getOfferStartDate() != null ? msg.getOfferStartDate() : LocalDate.now());
                portfolioTransactionRepository.save(buyerShortRentTx);
                break;

            case TERMINATION:
                object.setCurrentOccupant(null);
                object.setAvailableFrom(LocalDateTime.now().plusDays(30));
                objectRepository.save(object);
                
                sItem.setStatus("ACTIVE");
                portfolioItemRepository.save(sItem);
                break;
        }

        msg.setOfferStatus(Message.OfferStatus.ACCEPTED);
        msg = messageRepository.save(msg);

        return mapToMessageDto(msg);
    }

    private PortfolioItem createPortfolioEntry(Portfolio portfolio, RealEstateObject object, String strategy, BigDecimal amount) {
        UUID ownerId = portfolio.getUser().getId();

        Optional<PortfolioItem> existing = portfolioItemRepository.findAllByPortfolio_User_Id(ownerId)
                .stream()
                .filter(item -> item.getRealEstateObject().getId().equals(object.getId()))
                .findFirst();

        if (existing.isEmpty()) {
            PortfolioItem newItem = new PortfolioItem();
            newItem.setPortfolio(portfolio);
            newItem.setRealEstateObject(object);
            newItem.setStatus("ACTIVE");
            newItem.setStrategyName(strategy);
            newItem.setInvestedAmount(amount != null ? amount : BigDecimal.ZERO); 
            newItem.setPurchaseDate(LocalDate.now());
            
            if (amount != null && amount.compareTo(BigDecimal.ZERO) > 0) {
                newItem.setTargetAmount(amount.multiply(new BigDecimal("1.20")));
            }
            newItem.setExitTaxRate(new BigDecimal("13.0"));

            return portfolioItemRepository.save(newItem);
        }
        return existing.get();
    }

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