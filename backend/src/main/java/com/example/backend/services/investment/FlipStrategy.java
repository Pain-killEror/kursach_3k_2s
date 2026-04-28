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
        BigDecimal propPrice = BigDecimal.valueOf(object.getPriceTotal().doubleValue());
        BigDecimal legalFees = propPrice.multiply(request.legalFeesPct().divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP));
        BigDecimal totalRenovation = request.repairCost().add(request.furnitureCost());
        
        Map<String, Object> mortgage = InvestmentMathUtils.calculateMortgage(propPrice, request.downPaymentPct(), request.mortgageRate(), request.mortgageTerm());
        
        BigDecimal totalOwnFunds;
        if (request.useMortgage()) {
            totalOwnFunds = ((BigDecimal) mortgage.get("downPayment")).add(totalRenovation).add(legalFees);
        } else {
            totalOwnFunds = propPrice.add(legalFees).add(totalRenovation);
        }

        BigDecimal durationMonths = new BigDecimal(request.flipDurationMonths());
        BigDecimal holdingCostMortgage = ((BigDecimal) mortgage.get("monthlyPayment")).multiply(durationMonths);
        BigDecimal agentFee = request.expectedSalePrice().multiply(request.agentFeePct().divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP));

        BigDecimal propertyTaxRate = taxRates.getOrDefault("PROPERTY_TAX_RATE", BigDecimal.ZERO);
        BigDecimal propertyTax = propPrice.multiply(propertyTaxRate.divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP)).multiply(InvestmentMathUtils.safeDivide(durationMonths, new BigDecimal("12")));


        BigDecimal grossProfit = request.expectedSalePrice().subtract(propPrice).subtract(totalRenovation).subtract(legalFees).subtract(agentFee).subtract(holdingCostMortgage).subtract(propertyTax);

        BigDecimal incomeTaxRate = taxRates.getOrDefault("INCOME_TAX_RATE", new BigDecimal("13"));
        BigDecimal incomeTax = grossProfit.compareTo(BigDecimal.ZERO) > 0 ? grossProfit.multiply(incomeTaxRate.divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP)) : BigDecimal.ZERO;
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
            .totalROI(roi)
            .annualizedROI(annualizedROI)
            .yearlyForecast(new ArrayList<>())
            .build();
    }
}
