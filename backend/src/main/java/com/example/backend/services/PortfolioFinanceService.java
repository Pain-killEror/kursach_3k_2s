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

        // ОПРЕДЕЛЯЕМ РОЛЬ: Создатель объекта (Продавец) или нет (Покупатель)
        boolean isOriginalOwner = false;
        if (item.getRealEstateObject() != null && item.getRealEstateObject().getUser() != null) {
            isOriginalOwner = item.getRealEstateObject().getUser().getId()
                                  .equals(item.getPortfolio().getUser().getId());
        }

        // БАЛАНС: 
        // Если Продавец: Доход - Расходы
        // Если Покупатель: Доход - (Цена покупки + Расходы)
        BigDecimal costBasis = isOriginalOwner ? BigDecimal.ZERO : purchasePrice;
        BigDecimal currentBalance = totalIncome.subtract(costBasis.add(additionalInvestments));

        BigDecimal taxRate = getSystemTaxRate(item);
        // ... (остальные расчеты breakEvenPrice и expectedProfit оставляем как были)
        
        return new PortfolioSummaryDto(
            item.getId(), item.getStrategyName(), item.getTargetAmount(), taxRate, item.getStatus(),
            item.getRealEstateObject().getCategory(), item.getRealEstateObject().getAddress(), 
            item.getRealEstateObject().getTitle(), null,
            costBasis.add(additionalInvestments), totalIncome, currentBalance, 
            BigDecimal.ZERO, null, purchasePrice, additionalInvestments, transactions, isOriginalOwner
        );
    }

    /**
     * Сводка для главной страницы портфеля
     */
    public List<PortfolioSummaryDto> getUserPortfolioSummary(UUID userId) {
        List<PortfolioItem> items = itemRepository.findAllByPortfolio_User_Id(userId);
        
        return items.stream().map(item -> {
            BigDecimal transactionsBalance = BigDecimal.ZERO;
            boolean hasPurchaseTx = false;
            
            for (PortfolioTransaction t : item.getTransactions()) {
                if (t.getCategory() == com.example.backend.entities.enums.TransactionCategory.PURCHASE) hasPurchaseTx = true;
                if (t.getType() == FlowType.INCOME) transactionsBalance = transactionsBalance.add(t.getAmount());
                else if (t.getType() == FlowType.EXPENSE) transactionsBalance = transactionsBalance.subtract(t.getAmount());
            }

            boolean isOriginalOwner = false;
            if (item.getRealEstateObject() != null && item.getRealEstateObject().getUser() != null) {
                isOriginalOwner = item.getRealEstateObject().getUser().getId().equals(userId);
            }

            BigDecimal purchasePrice = item.getInvestedAmount() != null ? item.getInvestedAmount() : BigDecimal.ZERO;
            // Если он создатель или уже есть ручная транзакция - не вычитаем цену покупки из баланса автоматически
            BigDecimal effectivePrice = (isOriginalOwner || hasPurchaseTx) ? BigDecimal.ZERO : purchasePrice;
            BigDecimal currentBalance = transactionsBalance.subtract(effectivePrice);

            String objectTitle = null, objectCategory = null, objectAddress = null;
            if (item.getRealEstateObject() != null) {
                objectTitle = item.getRealEstateObject().getTitle();
                objectCategory = item.getRealEstateObject().getCategory();
                objectAddress = item.getRealEstateObject().getAddress();
            }
            
            return new PortfolioSummaryDto(
                item.getId(), item.getStrategyName(), item.getTargetAmount(), item.getExitTaxRate(),
                item.getStatus(), objectCategory, objectAddress, objectTitle, null, 
                null, null, currentBalance, null, null, purchasePrice, null, null, isOriginalOwner
            );
        }).collect(Collectors.toList());
    }
}