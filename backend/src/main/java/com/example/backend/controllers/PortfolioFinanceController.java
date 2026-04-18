package com.example.backend.controllers;

import com.example.backend.dto.PortfolioSummaryDto;
import com.example.backend.entities.PortfolioTransaction;
import com.example.backend.entities.PortfolioItem;
import com.example.backend.entities.User;
import com.example.backend.repositories.PortfolioItemRepository;
import com.example.backend.repositories.UserRepository; // Добавили
import com.example.backend.services.PortfolioFinanceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/portfolio")
@CrossOrigin(origins = "*")
public class PortfolioFinanceController {

    @Autowired
    private PortfolioFinanceService financeService;

    @Autowired
    private PortfolioItemRepository itemRepository;

    @Autowired
    private UserRepository userRepository; // Нужно для поиска юзера по email

    @GetMapping("/my")
    public ResponseEntity<List<PortfolioSummaryDto>> getMyPortfolio() {
        // Твой JwtFilter кладет в Principal строку (email)
        String userEmail = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        
        // Находим реального пользователя в базе
        User currentUser = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));

        return ResponseEntity.ok(financeService.getUserPortfolioSummary(currentUser.getId()));
    }

    @GetMapping("/items/{itemId}/summary")
    public ResponseEntity<PortfolioSummaryDto> getSummary(@PathVariable UUID itemId) {
        return ResponseEntity.ok(financeService.getSummary(itemId));
    }

    @PostMapping("/transactions")
    public ResponseEntity<PortfolioTransaction> addTransaction(@RequestBody PortfolioTransaction transaction) {
        return ResponseEntity.ok(financeService.addTransaction(transaction));
    }

    @PutMapping("/items/{itemId}/settings")
    public ResponseEntity<PortfolioItem> updateItemSettings(
            @PathVariable UUID itemId,
            @RequestBody PortfolioItem settings) {
        
        PortfolioItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Объект не найден"));

        item.setStrategyName(settings.getStrategyName());
        item.setTargetAmount(settings.getTargetAmount());
        item.setExitTaxRate(settings.getExitTaxRate());
        item.setStatus(settings.getStatus());

        return ResponseEntity.ok(itemRepository.save(item));
    }
}