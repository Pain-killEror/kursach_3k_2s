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

@Service
public class PortfolioFinanceService {

    @Autowired
    private PortfolioTransactionRepository transactionRepository;

    @Autowired
    private PortfolioItemRepository itemRepository;

    /**
     * Сохранение новой транзакции (чека или дохода)
     * Именно этот метод потерялся при компиляции!
     */
    public PortfolioTransaction addTransaction(PortfolioTransaction transaction) {
        return transactionRepository.save(transaction);
    }

    /**
     * Сбор всей финансовой аналитики по конкретному объекту
     */
    public PortfolioSummaryDto getSummary(UUID portfolioItemId) {
    // 1. Ищем сам объект в портфеле
    PortfolioItem item = itemRepository.findById(portfolioItemId)
            .orElseThrow(() -> new RuntimeException("Объект в портфеле не найден"));

    // 2. Достаем все его транзакции
    List<PortfolioTransaction> transactions = transactionRepository
            .findAllByPortfolioItemIdOrderByTransactionDateDesc(portfolioItemId);

    // 3. Считаем фактические суммы расходов и доходов
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

    // 4. Заполняем DTO данными
    PortfolioSummaryDto summary = new PortfolioSummaryDto();
    summary.setPortfolioItemId(item.getId());
    summary.setStrategyName(item.getStrategyName());
    summary.setTargetAmount(item.getTargetAmount());
    summary.setExitTaxRate(item.getExitTaxRate());
    
    // --- ЗАПОЛНЯЕМ ИНФОРМАЦИЮ ОБ ОБЪЕКТЕ ---
    if (item.getRealEstateObject() != null) {
        summary.setObjectCategory(item.getRealEstateObject().getCategory());
        summary.setObjectAddress(item.getRealEstateObject().getAddress());
        summary.setObjectTitle(item.getRealEstateObject().getTitle());
    }
    // summary.setCustomName(item.getCustomName()); // Если добавишь это поле в Entity позже
    
    summary.setTotalInvested(totalInvested);
    summary.setTotalIncome(totalIncome);
    summary.setCurrentBalance(currentBalance);
    summary.setTransactions(transactions);

    // --- УМНАЯ АНАЛИТИКА (Точка безубыточности и прогноз) ---
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
     * Получение сводки по всем объектам пользователя
     */
    public List<PortfolioSummaryDto> getUserPortfolioSummary(UUID userId) {
        List<PortfolioItem> items = itemRepository.findByPortfolioUserId(userId);
        
        return items.stream()
                .map(item -> getSummary(item.getId()))
                .toList();
    }
}