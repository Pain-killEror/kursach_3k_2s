package com.example.backend.services;

import com.example.backend.dto.PortfolioSummaryDto;
import com.example.backend.entities.GlobalSetting;
import com.example.backend.entities.PortfolioItem;
import com.example.backend.entities.PortfolioTransaction;
import com.example.backend.entities.enums.FlowType;
import com.example.backend.repositories.GlobalSettingRepository;
import com.example.backend.repositories.PortfolioItemRepository;
import com.example.backend.repositories.PortfolioTransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class PortfolioFinanceService {

    @Autowired
    private PortfolioTransactionRepository transactionRepository;

    @Autowired
    private PortfolioItemRepository itemRepository;

    // Внедряем репозиторий глобальных настроек
    @Autowired
    private GlobalSettingRepository globalSettingRepository;

    /**
     * Сохранение новой транзакции
     */
    public PortfolioTransaction addTransaction(UUID itemId, PortfolioTransaction transaction) {
        PortfolioItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Объект портфеля не найден"));

        transaction.setPortfolioItem(item);
        return transactionRepository.save(transaction);
    }

    /**
     * Вспомогательный метод для получения налога из БД администратора
     */
    private BigDecimal getSystemTaxRate(PortfolioItem item) {
        try {
            // 1. Пытаемся определить статус пользователя
            String entityType = "INDIVIDUAL"; // По умолчанию Физлицо
            
            if (item.getPortfolio() != null && 
                item.getPortfolio().getUser() != null && 
                item.getPortfolio().getUser().getEntityType() != null) {
                entityType = item.getPortfolio().getUser().getEntityType().name();
            }

            // 2. Выбираем нужный ключ настройки
            String settingKey;
            switch (entityType) {
                case "ENTREPRENEUR":
                    settingKey = "TAX_ENTREPRENEUR_INCOME";
                    break;
                case "LEGAL":
                    settingKey = "TAX_LEGAL_USN"; // Для юрлиц берем УСН (или поменяй на TAX_LEGAL_PROFIT)
                    break;
                case "INDIVIDUAL":
                default:
                    settingKey = "TAX_INDIVIDUAL_INCOME";
                    break;
            }

            // 3. Достаем значение из БД
            Optional<GlobalSetting> settingOpt = globalSettingRepository.findBySettingKey(settingKey);
            if (settingOpt.isPresent() && settingOpt.get().getSettingValue() != null) {
                return settingOpt.get().getSettingValue();
            }
        } catch (Exception e) {
            System.err.println("Ошибка при получении налога из БД: " + e.getMessage());
        }

        // 4. Если в БД настройки нет или произошла ошибка, возвращаем 13.0 как страховку
        return new BigDecimal("13.0");
    }

    /**
     * Сбор аналитики по конкретному объекту
     */
    public PortfolioSummaryDto getSummary(UUID portfolioItemId) {
        PortfolioItem item = itemRepository.findById(portfolioItemId)
            .orElseThrow(() -> new RuntimeException("Объект не найден"));

        List<PortfolioTransaction> transactions = transactionRepository
            .findAllByPortfolioItem_IdOrderByTransactionDateDesc(portfolioItemId);

        // 1. Разделяем цену покупки и расходы на ремонт (чтобы на фронте были 3 красивые колонки)
        BigDecimal purchasePrice = item.getInvestedAmount() != null ? item.getInvestedAmount() : BigDecimal.ZERO;
        BigDecimal additionalInvestments = BigDecimal.ZERO;
        BigDecimal totalIncome = BigDecimal.ZERO;

        for (PortfolioTransaction t : transactions) {
            if (t.getType() == FlowType.EXPENSE) {
                additionalInvestments = additionalInvestments.add(t.getAmount());
            } else if (t.getType() == FlowType.INCOME) {
                totalIncome = totalIncome.add(t.getAmount());
            }
        }

        BigDecimal totalInvested = purchasePrice.add(additionalInvestments);
        BigDecimal currentBalance = totalIncome.subtract(totalInvested);

        BigDecimal netDebt = totalInvested.subtract(totalIncome);

        // --- МАГИЯ ЗДЕСЬ: Получаем налог из глобальных настроек ---
        BigDecimal taxRate = getSystemTaxRate(item);

        // 2. Считаем подсказки (Insights) используя СИСТЕМНЫЙ налог
        BigDecimal taxMultiplier = BigDecimal.ONE.subtract(taxRate.divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP));

        BigDecimal breakEvenPrice = BigDecimal.ZERO;
        if (netDebt.compareTo(BigDecimal.ZERO) > 0) {
            if (taxMultiplier.compareTo(BigDecimal.ZERO) > 0) {
                breakEvenPrice = netDebt.divide(taxMultiplier, 2, RoundingMode.HALF_UP);
            }
        }

        BigDecimal expectedProfit = null;
        if (item.getTargetAmount() != null && item.getTargetAmount().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal netRevenueFromSale = item.getTargetAmount().multiply(taxMultiplier);
            expectedProfit = netRevenueFromSale.subtract(netDebt);
        }

        String objectCategory = "Объект";
        String objectAddress = "Адрес не указан";
        String objectTitle = null;
        if (item.getRealEstateObject() != null) {
            objectCategory = item.getRealEstateObject().getCategory();
            objectAddress = item.getRealEstateObject().getAddress();
            objectTitle = item.getRealEstateObject().getTitle();
        }

        return new PortfolioSummaryDto(
            item.getId(),
            item.getStrategyName(),
            item.getTargetAmount(),
            taxRate,
            item.getStatus(),
            objectCategory,
            objectAddress,
            objectTitle,
            null, // customName
            totalInvested,
            totalIncome,
            currentBalance,
            breakEvenPrice,
            expectedProfit,
            purchasePrice,
            additionalInvestments,
            transactions
        );
    }

    /**
     * Получение сводки по всем объектам пользователя для главной страницы портфеля
     */
    public List<PortfolioSummaryDto> getUserPortfolioSummary(UUID userId) {
        List<PortfolioItem> items = itemRepository.findAllByPortfolio_User_Id(userId);
        
        return items.stream().map(item -> {
            boolean hasPurchaseTx = false;
            BigDecimal transactionsBalance = BigDecimal.ZERO;
            
            for (PortfolioTransaction t : item.getTransactions()) {
                if (t.getCategory() == com.example.backend.entities.enums.TransactionCategory.PURCHASE) {
                    hasPurchaseTx = true;
                }
                
                String text = t.getTitle() != null ? t.getTitle() : "";
                if (t.getDescription() != null) text += t.getDescription();
                boolean isRentMarker = text.startsWith("🔵");
                boolean isSaleMarker = text.startsWith("🟢");
                
                if (!isRentMarker && !isSaleMarker) {
                    if (t.getType() == FlowType.INCOME) {
                        transactionsBalance = transactionsBalance.add(t.getAmount());
                    } else if (t.getType() == FlowType.EXPENSE) {
                        transactionsBalance = transactionsBalance.subtract(t.getAmount());
                    }
                }
            }

            boolean isTenant = false;
            boolean isRentStrategy = item.getStrategyName() != null && item.getStrategyName().toLowerCase().contains("аренд");
            
            if (isRentStrategy && item.getRealEstateObject() != null && item.getRealEstateObject().getCurrentOccupant() != null) {
                if (item.getRealEstateObject().getCurrentOccupant().getId().equals(userId)) {
                    isTenant = true;
                }
            }

            BigDecimal purchasePrice = item.getInvestedAmount() != null ? item.getInvestedAmount() : BigDecimal.ZERO;
            BigDecimal effectivePurchasePrice = purchasePrice;
            
            if (!hasPurchaseTx && !isTenant) {
                if (isRentStrategy) {
                    effectivePurchasePrice = BigDecimal.ZERO;
                }
            }
            
            if (isTenant) {
                effectivePurchasePrice = BigDecimal.ZERO;
            }
            
            if (hasPurchaseTx) {
                effectivePurchasePrice = BigDecimal.ZERO; // Уже учтено в транзакциях
            }

            BigDecimal currentBalance = isTenant ? BigDecimal.ZERO : transactionsBalance.subtract(effectivePurchasePrice);

            String objectTitle = null;
            String objectCategory = null;
            String objectAddress = null;
            if (item.getRealEstateObject() != null) {
                objectTitle = item.getRealEstateObject().getTitle();
                objectCategory = item.getRealEstateObject().getCategory();
                objectAddress = item.getRealEstateObject().getAddress();
            }
            
            return new PortfolioSummaryDto(
                item.getId(),
                item.getStrategyName(),
                item.getTargetAmount(),
                item.getExitTaxRate(),
                item.getStatus(),
                objectCategory,
                objectAddress,
                objectTitle,
                null, 
                null, 
                null, 
                currentBalance,
                null, 
                null, 
                purchasePrice,
                null, 
                null  
            );
        }).collect(Collectors.toList());
    }
}