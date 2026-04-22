package com.example.backend.services;

import com.example.backend.dto.PortfolioSummaryDto;
import com.example.backend.entities.GlobalSetting;
import com.example.backend.entities.Portfolio;
import com.example.backend.entities.PortfolioItem;
import com.example.backend.entities.PortfolioTransaction;
import com.example.backend.entities.RealEstateObject;
import com.example.backend.entities.User;
import com.example.backend.entities.enums.EntityType;
import com.example.backend.entities.enums.FlowType;
import com.example.backend.repositories.GlobalSettingRepository;
import com.example.backend.repositories.PortfolioItemRepository;
import com.example.backend.repositories.PortfolioTransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PortfolioFinanceServiceTest {

    @Mock
    private PortfolioTransactionRepository transactionRepository;

    @Mock
    private PortfolioItemRepository itemRepository;

    @Mock
    private GlobalSettingRepository globalSettingRepository;

    @InjectMocks
    private PortfolioFinanceService financeService;

    private PortfolioItem portfolioItem;
    private UUID itemId;

    @BeforeEach
    void setUp() {
        itemId = UUID.randomUUID();
        User user = new User();
        user.setEntityType(EntityType.INDIVIDUAL);

        Portfolio portfolio = new Portfolio();
        portfolio.setUser(user);

        RealEstateObject realEstateObject = new RealEstateObject();
        realEstateObject.setTitle("Test Object");
        realEstateObject.setCategory("Apartment");
        realEstateObject.setAddress("Test Address");

        portfolioItem = new PortfolioItem();
        portfolioItem.setId(itemId);
        portfolioItem.setPortfolio(portfolio);
        portfolioItem.setRealEstateObject(realEstateObject);
        portfolioItem.setInvestedAmount(new BigDecimal("1000000.00"));
        portfolioItem.setTargetAmount(new BigDecimal("1500000.00"));
    }

    @Test
    void addTransaction_Success() {
        PortfolioTransaction transaction = new PortfolioTransaction();
        transaction.setAmount(new BigDecimal("1000.00"));

        when(itemRepository.findById(itemId)).thenReturn(Optional.of(portfolioItem));
        when(transactionRepository.save(any(PortfolioTransaction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PortfolioTransaction savedTransaction = financeService.addTransaction(itemId, transaction);

        assertNotNull(savedTransaction);
        assertEquals(portfolioItem, savedTransaction.getPortfolioItem());
        verify(transactionRepository, times(1)).save(transaction);
    }

    @Test
    void addTransaction_ItemNotFound() {
        when(itemRepository.findById(itemId)).thenReturn(Optional.empty());

        PortfolioTransaction transaction = new PortfolioTransaction();

        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            financeService.addTransaction(itemId, transaction);
        });

        assertEquals("Объект портфеля не найден", exception.getMessage());
    }

    @Test
    void getSummary_Success() {
        // Arrange
        PortfolioTransaction income = new PortfolioTransaction();
        income.setType(FlowType.INCOME);
        income.setAmount(new BigDecimal("50000.00"));

        PortfolioTransaction expense = new PortfolioTransaction();
        expense.setType(FlowType.EXPENSE);
        expense.setAmount(new BigDecimal("10000.00"));

        when(itemRepository.findById(itemId)).thenReturn(Optional.of(portfolioItem));
        when(transactionRepository.findAllByPortfolioItem_IdOrderByTransactionDateDesc(itemId))
                .thenReturn(Arrays.asList(income, expense));

        GlobalSetting taxSetting = new GlobalSetting();
        taxSetting.setSettingKey("TAX_INDIVIDUAL_INCOME");
        taxSetting.setSettingValue(new BigDecimal("13.0"));
        when(globalSettingRepository.findBySettingKey("TAX_INDIVIDUAL_INCOME")).thenReturn(Optional.of(taxSetting));

        // Act
        PortfolioSummaryDto summary = financeService.getSummary(itemId);

        // Assert
        assertNotNull(summary);
        assertEquals(new BigDecimal("1000000.00"), summary.getPurchasePrice());
        assertEquals(new BigDecimal("10000.00"), summary.getAdditionalInvestments());
        assertEquals(new BigDecimal("1010000.00"), summary.getTotalInvested());
        assertEquals(new BigDecimal("50000.00"), summary.getTotalIncome());
        assertEquals(new BigDecimal("-960000.00"), summary.getCurrentBalance());
        assertEquals(new BigDecimal("13.0"), summary.getExitTaxRate());
    }

    @Test
    void getUserPortfolioSummary_Success() {
        // Arrange
        UUID userId = UUID.randomUUID();
        
        PortfolioTransaction income = new PortfolioTransaction();
        income.setType(FlowType.INCOME);
        income.setAmount(new BigDecimal("20000.00"));
        
        portfolioItem.setTransactions(Collections.singletonList(income));

        when(itemRepository.findAllByPortfolio_User_Id(userId)).thenReturn(Collections.singletonList(portfolioItem));

        // Act
        List<PortfolioSummaryDto> summaries = financeService.getUserPortfolioSummary(userId);

        // Assert
        assertNotNull(summaries);
        assertEquals(1, summaries.size());
        PortfolioSummaryDto summary = summaries.get(0);
        
        // Income (20000) - Purchase Price (1000000) = -980000
        assertEquals(new BigDecimal("-980000.00"), summary.getCurrentBalance());
        assertEquals("Test Object", summary.getObjectTitle());
    }
}
