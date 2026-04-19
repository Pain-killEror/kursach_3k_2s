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

        PortfolioSummaryDto summary = new PortfolioSummaryDto();
        summary.setPortfolioItemId(item.getId());
        summary.setStrategyName(item.getStrategyName());
        summary.setTargetAmount(item.getTargetAmount());
        
        // --- МАГИЯ ЗДЕСЬ: Получаем налог из глобальных настроек ---
        BigDecimal taxRate = getSystemTaxRate(item);
        summary.setExitTaxRate(taxRate); // Передаем на фронтенд актуальный системный налог!

        if (item.getRealEstateObject() != null) {
            summary.setObjectCategory(item.getRealEstateObject().getCategory());
            summary.setObjectAddress(item.getRealEstateObject().getAddress());
            summary.setObjectTitle(item.getRealEstateObject().getTitle());
        } else {
            summary.setObjectCategory("Объект");    
            summary.setObjectAddress("Адрес не указан");
        }
        
        // Передаем новые метрики для колонок "Куплено за" и "Вложено"
        summary.setPurchasePrice(purchasePrice);
        summary.setAdditionalInvestments(additionalInvestments);
        
        summary.setTotalInvested(totalInvested);
        summary.setTotalIncome(totalIncome);
        summary.setCurrentBalance(currentBalance);
        summary.setTransactions(transactions);

        BigDecimal netDebt = totalInvested.subtract(totalIncome);

        // 2. Считаем подсказки (Insights) используя СИСТЕМНЫЙ налог
        BigDecimal taxMultiplier = BigDecimal.ONE.subtract(taxRate.divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP));

        if (netDebt.compareTo(BigDecimal.ZERO) > 0) {
            if (taxMultiplier.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal breakEven = netDebt.divide(taxMultiplier, 2, RoundingMode.HALF_UP);
                summary.setBreakEvenPrice(breakEven);
            }
        } else {
            summary.setBreakEvenPrice(BigDecimal.ZERO);
        }

        if (item.getTargetAmount() != null && item.getTargetAmount().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal netRevenueFromSale = item.getTargetAmount().multiply(taxMultiplier);
            summary.setExpectedProfit(netRevenueFromSale.subtract(netDebt));
        }

        return summary;
    }

    /**
     * Получение сводки по всем объектам пользователя для главной страницы портфеля
     */
    public List<PortfolioSummaryDto> getUserPortfolioSummary(UUID userId) {
        List<PortfolioItem> items = itemRepository.findAllByPortfolio_User_Id(userId);
        
        return items.stream().map(item -> {
            PortfolioSummaryDto dto = new PortfolioSummaryDto();
            dto.setPortfolioItemId(item.getId());
            
            // 1. Достаем стоимость покупки объекта
            BigDecimal purchasePrice = item.getInvestedAmount() != null ? item.getInvestedAmount() : BigDecimal.ZERO;
            
            // 2. Считаем баланс по транзакциям (доходы минус расходы)
            BigDecimal transactionsBalance = item.getTransactions().stream()
                .map(t -> t.getType() == FlowType.INCOME ? t.getAmount() : t.getAmount().negate())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
                
            // 3. РЕАЛЬНЫЙ БАЛАНС: Баланс транзакций МИНУС цена покупки
            dto.setCurrentBalance(transactionsBalance.subtract(purchasePrice));
            
            // На всякий случай кладем цену покупки в DTO (чтобы фронт её видел)
            dto.setPurchasePrice(purchasePrice);
            
            if (item.getRealEstateObject() != null) {
                dto.setObjectTitle(item.getRealEstateObject().getTitle());
                dto.setObjectCategory(item.getRealEstateObject().getCategory());
                dto.setObjectAddress(item.getRealEstateObject().getAddress());
            }
            
            dto.setStatus(item.getStatus());
            return dto;
        }).collect(Collectors.toList());
    }
}