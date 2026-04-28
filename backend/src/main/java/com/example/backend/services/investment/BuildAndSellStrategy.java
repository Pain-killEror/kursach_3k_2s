package com.example.backend.services.investment;

import com.example.backend.dto.InvestmentCalculationRequest;
import com.example.backend.dto.InvestmentCalculationResult;
import com.example.backend.entities.RealEstateObject;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Map;

@Component("BUILD_SELL")
public class BuildAndSellStrategy implements InvestmentStrategy {
    @Override
    public InvestmentCalculationResult calculate(InvestmentCalculationRequest request, RealEstateObject object, Map<String, BigDecimal> taxRates) {
        BigDecimal propPrice = object.getPriceTotal() != null ? object.getPriceTotal() : BigDecimal.ZERO;
        BigDecimal legalFeesPct = InvestmentMathUtils.getOrDefault(request.legalFeesPct(), new BigDecimal("2"));
        BigDecimal legalFees = propPrice.multiply(InvestmentMathUtils.safeDivide(legalFeesPct, new BigDecimal("100")));
        
        // Use constructionCost instead of repairCost as requested
        BigDecimal constructionCost = InvestmentMathUtils.getOrDefault(request.constructionCost(), BigDecimal.ZERO);
        BigDecimal furnitureCost = InvestmentMathUtils.getOrDefault(request.furnitureCost(), BigDecimal.ZERO);
        BigDecimal totalConstruction = constructionCost.add(furnitureCost);
        
        Map<String, Object> mortgage = InvestmentMathUtils.calculateMortgage(
            propPrice, 
            InvestmentMathUtils.getOrDefault(request.downPaymentPct(), new BigDecimal("30")), 
            InvestmentMathUtils.getOrDefault(request.mortgageRate(), new BigDecimal("12.5")), 
            request.mortgageTerm() > 0 ? request.mortgageTerm() : 15
        );
        
        BigDecimal totalOwnFunds;
        if (request.useMortgage()) {
            totalOwnFunds = ((BigDecimal) mortgage.get("downPayment")).add(totalConstruction).add(legalFees);
        } else {
            totalOwnFunds = propPrice.add(legalFees).add(totalConstruction);
        }

        BigDecimal durationMonths = new BigDecimal(request.buildSellDuration() > 0 ? request.buildSellDuration() : 12);
        BigDecimal holdingCostMortgage = ((BigDecimal) mortgage.get("monthlyPayment")).multiply(durationMonths);
        
        BigDecimal agentFeePct = InvestmentMathUtils.getOrDefault(request.agentFeePct(), new BigDecimal("3"));
        BigDecimal expectedSalePrice = InvestmentMathUtils.getOrDefault(request.expectedSalePrice(), propPrice.multiply(new BigDecimal("1.5")));
        BigDecimal agentFee = expectedSalePrice.multiply(InvestmentMathUtils.safeDivide(agentFeePct, new BigDecimal("100")));

        BigDecimal propertyTaxRate = taxRates.getOrDefault("PROPERTY_TAX_RATE", BigDecimal.ZERO);
        BigDecimal propertyTax = propPrice.multiply(InvestmentMathUtils.safeDivide(propertyTaxRate, new BigDecimal("100")))
                .multiply(InvestmentMathUtils.safeDivide(durationMonths, new BigDecimal("12")));

        BigDecimal grossProfit = expectedSalePrice.subtract(propPrice).subtract(totalConstruction).subtract(legalFees)
                .subtract(agentFee).subtract(holdingCostMortgage).subtract(propertyTax);

        BigDecimal incomeTaxRate = taxRates.getOrDefault("INCOME_TAX_RATE", new BigDecimal("13"));
        BigDecimal incomeTax = grossProfit.compareTo(BigDecimal.ZERO) > 0 
                ? grossProfit.multiply(InvestmentMathUtils.safeDivide(incomeTaxRate, new BigDecimal("100"))) 
                : BigDecimal.ZERO;
        BigDecimal netProfit = grossProfit.subtract(incomeTax);

        BigDecimal roi = InvestmentMathUtils.safeDivide(netProfit, totalOwnFunds).multiply(new BigDecimal("100"));
        BigDecimal annualizedROI = InvestmentMathUtils.safeDivide(roi.multiply(new BigDecimal("12")), durationMonths);


        return InvestmentCalculationResult.builder()
            .totalPurchaseCost(propPrice.add(legalFees))
            .totalRenovation(totalConstruction) // Showing construction as "renovation" for UI consistency or we can update DTO
            .totalOwnFunds(totalOwnFunds)
            .legalFees(legalFees)
            .mortgageInfo(mortgage)
            .annualPropertyTax(propertyTax)
            .incomeTaxRate(incomeTaxRate)
            .incomeTaxLabel("Налог")
            .annualIncomeTax(incomeTax)
            .totalAnnualTax(incomeTax.add(propertyTax))
            .futurePropertyValue(request.expectedSalePrice())
            .capitalGain(grossProfit)
            .totalProfit(netProfit)
            .totalROI(roi)
            .annualizedROI(annualizedROI)
            .yearlyForecast(new ArrayList<>())
            .build();
    }
}
