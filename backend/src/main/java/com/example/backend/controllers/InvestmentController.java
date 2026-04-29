package com.example.backend.controllers;

import com.example.backend.dto.InvestmentCalculationRequest;
import com.example.backend.dto.InvestmentCalculationResult;
import com.example.backend.services.investment.InvestmentCalculatorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/investments", "/api/v1/investments"})
public class InvestmentController {

    @Autowired
    private InvestmentCalculatorService calculationService;

    @PostMapping("/calculate")
    public ResponseEntity<InvestmentCalculationResult> calculate(@RequestBody InvestmentCalculationRequest request, Authentication authentication) {
        String email = authentication.getName();
        InvestmentCalculationResult result = calculationService.calculate(request, email);
        return ResponseEntity.ok(result);
    }
}
