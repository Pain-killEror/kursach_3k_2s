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

        // ОПРЕДЕЛЯЕМ РОЛЬ:
        // 1) Основная логика по ТЗ: portfolio.user.id == realEstateObject.user.id
        // 2) fallback для уже существующих сделок: ранее в SALE делалось object.setUser(buyer),
        //    из-за чего realEstateObject.user "уехал" на покупателя.
        //    Если объект SOLD и realEstateObject.user совпадает с currentOccupant — считаем оригинальным
        //    того, кто НЕ является currentOccupant.
        boolean isOriginalOwner = false;
        if (item.getPortfolio() != null && item.getPortfolio().getUser() != null && item.getRealEstateObject() != null) {
            UUID portfolioUserId = item.getPortfolio().getUser().getId();
            UUID objectUserId = item.getRealEstateObject().getUser() != null ? item.getRealEstateObject().getUser().getId() : null;

            UUID currentOccupantId = item.getRealEstateObject().getCurrentOccupant() != null
                ? item.getRealEstateObject().getCurrentOccupant().getId()
                : null;

            boolean isSold = item.getRealEstateObject().getObjectStatus() == com.example.backend.entities.ObjectStatus.SOLD;

            if (isSold && currentOccupantId != null && objectUserId != null && objectUserId.equals(currentOccupantId)) {
                // "user" уже перезаписан на buyer — инвертируем относительно currentOccupant
                isOriginalOwner = !portfolioUserId.equals(currentOccupantId);
            } else {
                isOriginalOwner = objectUserId != null && portfolioUserId.equals(objectUserId);
            }
        }

        // Финансовые составляющие:
        // - Доходы: INCOME
        // - Расходы на ремонт/услуги: EXPENSE кроме PURCHASE
        // - Цена покупки (реальная, если она добавлена транзакцией PURCHASE): EXPENSE с категорией PURCHASE
        BigDecimal totalIncome = BigDecimal.ZERO;
        BigDecimal operatingExpense = BigDecimal.ZERO; // ремонт/услуги
        BigDecimal purchaseTxExpense = BigDecimal.ZERO; // real PURCHASE transactions
        boolean hasManualPurchaseTx = false;

        for (PortfolioTransaction t : transactions) {
            BigDecimal amount = t.getAmount() != null ? t.getAmount() : BigDecimal.ZERO;

            if (t.getType() == FlowType.INCOME) {
                totalIncome = totalIncome.add(amount);
            } else if (t.getType() == FlowType.EXPENSE) {
                if (t.getCategory() == com.example.backend.entities.enums.TransactionCategory.PURCHASE) {
                    purchaseTxExpense = purchaseTxExpense.add(amount);
                    hasManualPurchaseTx = true;
                } else {
                    operatingExpense = operatingExpense.add(amount);
                }
            }
        }

        // Баланс:
        // - Продавец: Доходы - Расходы на ремонт/услуги
        // - Покупатель: Доходы - (Цена покупки + Расходы на ремонт/услуги)
        //   Цена покупки берется:
        //   - из реальных PURCHASE-транзакций, если они есть
        //   - иначе из purchasePrice (investedAmount)
        BigDecimal effectivePurchaseExpense = isOriginalOwner
            ? BigDecimal.ZERO
            : (hasManualPurchaseTx ? purchaseTxExpense : purchasePrice);

        BigDecimal currentBalance = totalIncome.subtract(effectivePurchaseExpense.add(operatingExpense));
        BigDecimal additionalInvestments = operatingExpense; // DTO: ремонт/услуги
        BigDecimal totalInvested = effectivePurchaseExpense.add(operatingExpense);

        BigDecimal taxRate = getSystemTaxRate(item);

        return new PortfolioSummaryDto(
            item.getId(),
            item.getStrategyName(),
            item.getTargetAmount(),
            taxRate,
            item.getStatus(),
            item.getRealEstateObject().getCategory(),
            item.getRealEstateObject().getAddress(),
            item.getRealEstateObject().getTitle(),
            null, // customName
            totalInvested,
            totalIncome,
            currentBalance,
            BigDecimal.ZERO, // breakEvenPrice
            null, // expectedProfit
            purchasePrice,
            additionalInvestments,
            transactions,
            isOriginalOwner
        );
    }

    /**
     * Сводка для главной страницы портфеля
     */
    public List<PortfolioSummaryDto> getUserPortfolioSummary(UUID userId) {
        List<PortfolioItem> items = itemRepository.findAllByPortfolio_User_Id(userId);
        
        return items.stream().map(item -> {
            BigDecimal totalIncome = BigDecimal.ZERO;
            BigDecimal operatingExpense = BigDecimal.ZERO;
            BigDecimal purchaseTxExpense = BigDecimal.ZERO;
            boolean hasManualPurchaseTx = false;

            for (PortfolioTransaction t : item.getTransactions()) {
                BigDecimal amount = t.getAmount() != null ? t.getAmount() : BigDecimal.ZERO;

                if (t.getType() == FlowType.INCOME) {
                    totalIncome = totalIncome.add(amount);
                } else if (t.getType() == FlowType.EXPENSE) {
                    if (t.getCategory() == com.example.backend.entities.enums.TransactionCategory.PURCHASE) {
                        purchaseTxExpense = purchaseTxExpense.add(amount);
                        hasManualPurchaseTx = true;
                    } else {
                        operatingExpense = operatingExpense.add(amount);
                    }
                }
            }

            boolean isOriginalOwner = false;
            if (item.getPortfolio() != null && item.getPortfolio().getUser() != null && item.getRealEstateObject() != null) {
                UUID portfolioUserId = item.getPortfolio().getUser().getId();
                UUID objectUserId = item.getRealEstateObject().getUser() != null ? item.getRealEstateObject().getUser().getId() : null;

                UUID currentOccupantId = item.getRealEstateObject().getCurrentOccupant() != null
                    ? item.getRealEstateObject().getCurrentOccupant().getId()
                    : null;

                boolean isSold = item.getRealEstateObject().getObjectStatus() == com.example.backend.entities.ObjectStatus.SOLD;

                if (isSold && currentOccupantId != null && objectUserId != null && objectUserId.equals(currentOccupantId)) {
                    isOriginalOwner = !portfolioUserId.equals(currentOccupantId);
                } else {
                    isOriginalOwner = objectUserId != null && portfolioUserId.equals(objectUserId);
                }
            }

            BigDecimal purchasePrice = item.getInvestedAmount() != null ? item.getInvestedAmount() : BigDecimal.ZERO;
            BigDecimal effectivePurchaseExpense = isOriginalOwner
                ? BigDecimal.ZERO
                : (hasManualPurchaseTx ? purchaseTxExpense : purchasePrice);

            BigDecimal currentBalance = totalIncome.subtract(effectivePurchaseExpense.add(operatingExpense));
            BigDecimal totalInvested = effectivePurchaseExpense.add(operatingExpense);
            BigDecimal additionalInvestments = operatingExpense;

            String objectTitle = null, objectCategory = null, objectAddress = null;
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
                null, // customName
                totalInvested,
                totalIncome,
                currentBalance,
                null, // breakEvenPrice
                null, // expectedProfit
                purchasePrice,
                additionalInvestments,
                null, // transactions
                isOriginalOwner
            );
        }).collect(Collectors.toList());
    }
}