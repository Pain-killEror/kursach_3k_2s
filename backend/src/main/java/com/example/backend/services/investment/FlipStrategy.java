package com.example.backend.services.investment;

import com.example.backend.dto.InvestmentCalculationRequest;
import com.example.backend.dto.InvestmentCalculationResult;
import com.example.backend.entities.RealEstateObject;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Map;

@Component("FLIP")
public class FlipStrategy implements InvestmentStrategy {
    @Override
    public InvestmentCalculationResult calculate(InvestmentCalculationRequest request, RealEstateObject object, Map<String, BigDecimal> taxRates) {
        BigDecimal propPrice = object.getPriceTotal() != null ? object.getPriceTotal() : BigDecimal.ZERO;
        BigDecimal legalFeesPct = InvestmentMathUtils.getOrDefault(request.legalFeesPct(), new BigDecimal("2"));
        BigDecimal legalFees = propPrice.multiply(InvestmentMathUtils.safeDivide(legalFeesPct, new BigDecimal("100")));
        BigDecimal totalRenovation = InvestmentMathUtils.getOrDefault(request.repairCost(), BigDecimal.ZERO)
                .add(InvestmentMathUtils.getOrDefault(request.furnitureCost(), BigDecimal.ZERO));
        
        Map<String, Object> mortgage = InvestmentMathUtils.calculateMortgage(
            propPrice, 
            InvestmentMathUtils.getOrDefault(request.downPaymentPct(), new BigDecimal("30")), 
            InvestmentMathUtils.getOrDefault(request.mortgageRate(), new BigDecimal("12.5")), 
            request.mortgageTerm() > 0 ? request.mortgageTerm() : 15
        );
        
        BigDecimal totalOwnFunds;
        if (request.useMortgage()) {
            totalOwnFunds = ((BigDecimal) mortgage.get("downPayment")).add(totalRenovation).add(legalFees);
        } else {
            totalOwnFunds = propPrice.add(legalFees).add(totalRenovation);
        }

        BigDecimal durationMonths = new BigDecimal(request.flipDurationMonths() > 0 ? request.flipDurationMonths() : 4);
        BigDecimal holdingCostMortgage = ((BigDecimal) mortgage.get("monthlyPayment")).multiply(durationMonths);
        
        BigDecimal agentFeePct = InvestmentMathUtils.getOrDefault(request.agentFeePct(), new BigDecimal("3"));
        BigDecimal expectedSalePrice = InvestmentMathUtils.getOrDefault(request.expectedSalePrice(), propPrice.multiply(new BigDecimal("1.2")));
        BigDecimal agentFee = expectedSalePrice.multiply(InvestmentMathUtils.safeDivide(agentFeePct, new BigDecimal("100")));

        BigDecimal propertyTaxRate = taxRates.getOrDefault("PROPERTY_TAX_RATE", BigDecimal.ZERO);
        BigDecimal propertyTax = propPrice.multiply(InvestmentMathUtils.safeDivide(propertyTaxRate, new BigDecimal("100")))
                .multiply(InvestmentMathUtils.safeDivide(durationMonths, new BigDecimal("12")));

        BigDecimal grossProfit = expectedSalePrice.subtract(propPrice).subtract(totalRenovation).subtract(legalFees)
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
            .totalRenovation(totalRenovation)
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
            .netProfit(netProfit)
            .totalROI(roi)
            .roi(roi)
            .annualizedROI(annualizedROI)
            .durationMonths(durationMonths)
            .yearlyForecast(new ArrayList<>())
            .build();
    }
}
