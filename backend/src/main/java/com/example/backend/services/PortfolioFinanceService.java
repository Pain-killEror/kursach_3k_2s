package com.example.backend.services;

import com.example.backend.dto.PortfolioSummaryDto;
import com.example.backend.entities.PortfolioItem;
import com.example.backend.entities.PortfolioTransaction;
import com.example.backend.entities.enums.FlowType;
import com.example.backend.repositories.PortfolioItemRepository;
import com.example.backend.repositories.PortfolioTransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors; // Обязательный импорт!

@Service
public class PortfolioFinanceService {

    @Autowired
    private PortfolioTransactionRepository transactionRepository;

    @Autowired
    private PortfolioItemRepository itemRepository;

    /**
     * Сохранение новой транзакции
     */
    public PortfolioTransaction addTransaction(UUID itemId, PortfolioTransaction transaction) {
        // 1. Находим объект портфеля, к которому крепим чек/трату
        PortfolioItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Объект портфеля не найден"));

        // 2. Устанавливаем связь (это то, чего не хватало!)
        transaction.setPortfolioItem(item);
        
        // 3. Сохраняем
        return transactionRepository.save(transaction);
    }

    /**
     * Сбор аналитики по конкретному объекту
     */
    public PortfolioSummaryDto getSummary(UUID portfolioItemId) {
        PortfolioItem item = itemRepository.findById(portfolioItemId)
            .orElseThrow(() -> new RuntimeException("Объект не найден"));

        // Используем метод с нижним подчеркиванием из репозитория
        List<PortfolioTransaction> transactions = transactionRepository
            .findAllByPortfolioItem_IdOrderByTransactionDateDesc(portfolioItemId);

        BigDecimal purchasePrice = item.getInvestedAmount() != null ? item.getInvestedAmount() : BigDecimal.ZERO;
        BigDecimal totalInvested = purchasePrice; 
        BigDecimal totalIncome = BigDecimal.ZERO;

        for (PortfolioTransaction t : transactions) {
            if (t.getType() == FlowType.EXPENSE) {
                totalInvested = totalInvested.add(t.getAmount());
            } else if (t.getType() == FlowType.INCOME) {
                totalIncome = totalIncome.add(t.getAmount());
            }
        }

        BigDecimal currentBalance = totalIncome.subtract(totalInvested);

        PortfolioSummaryDto summary = new PortfolioSummaryDto();
        summary.setPortfolioItemId(item.getId());
        summary.setStrategyName(item.getStrategyName());
        summary.setTargetAmount(item.getTargetAmount());
        summary.setExitTaxRate(item.getExitTaxRate());
        
        if (item.getRealEstateObject() != null) {
            summary.setObjectCategory(item.getRealEstateObject().getCategory());
            summary.setObjectAddress(item.getRealEstateObject().getAddress());
            summary.setObjectTitle(item.getRealEstateObject().getTitle());
        } else {
            summary.setObjectCategory("Объект");    
            summary.setObjectAddress("Адрес не указан");
        }
        
        summary.setTotalInvested(totalInvested);
        summary.setTotalIncome(totalIncome);
        summary.setCurrentBalance(currentBalance);
        summary.setTransactions(transactions);

        BigDecimal netDebt = totalInvested.subtract(totalIncome);

        if (netDebt.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal taxRate = item.getExitTaxRate() != null ? item.getExitTaxRate() : new BigDecimal("13.0");
            BigDecimal taxMultiplier = BigDecimal.ONE.subtract(taxRate.divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP));
            
            if (taxMultiplier.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal breakEven = netDebt.divide(taxMultiplier, 2, RoundingMode.HALF_UP);
                summary.setBreakEvenPrice(breakEven);
            }
        } else {
            summary.setBreakEvenPrice(BigDecimal.ZERO);
        }

        if (item.getTargetAmount() != null && item.getTargetAmount().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal taxRate = item.getExitTaxRate() != null ? item.getExitTaxRate() : new BigDecimal("13.0");
            BigDecimal taxMultiplier = BigDecimal.ONE.subtract(taxRate.divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP));
            
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
            
            // Считаем баланс на основе транзакций
            BigDecimal balance = item.getTransactions().stream()
                .map(t -> t.getType() == FlowType.INCOME ? t.getAmount() : t.getAmount().negate())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
                
            dto.setCurrentBalance(balance);
            
            if (item.getRealEstateObject() != null) {
                dto.setObjectTitle(item.getRealEstateObject().getTitle());
                dto.setObjectCategory(item.getRealEstateObject().getCategory().toString());
                dto.setObjectAddress(item.getRealEstateObject().getAddress());
            }
            
            dto.setStatus(item.getStatus());
            return dto;
        }).collect(Collectors.toList());
    } // СКОБКА 1: закрывает метод
} // СКОБКА 2: закрывает класс