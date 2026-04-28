package com.example.backend.services.investment;

import com.example.backend.dto.InvestmentCalculationRequest;
import com.example.backend.dto.InvestmentCalculationResult;
import com.example.backend.entities.RealEstateObject;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Map;

@Component("BUY_HOLD")
public class BuyAndHoldStrategy implements InvestmentStrategy {
    @Override
    public InvestmentCalculationResult calculate(InvestmentCalculationRequest request, RealEstateObject object, Map<String, BigDecimal> taxRates) {
        BigDecimal propPrice = BigDecimal.valueOf(object.getPriceTotal().doubleValue());
        BigDecimal legalFees = propPrice.multiply(request.legalFeesPct().divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP));
        BigDecimal repair = request.repairCost();
        
        Map<String, Object> mortgage = InvestmentMathUtils.calculateMortgage(propPrice, request.downPaymentPct(), request.mortgageRate(), request.mortgageTerm());
        
        BigDecimal totalOwnFunds;
        if (request.useMortgage()) {
            totalOwnFunds = ((BigDecimal) mortgage.get("downPayment")).add(repair).add(legalFees);
        } else {
            totalOwnFunds = propPrice.add(legalFees).add(repair);
        }

        int horizon = request.investmentHorizon();
        BigDecimal appRate = request.appreciationRate().divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);
        BigDecimal futureValue = propPrice.multiply(BigDecimal.ONE.add(appRate).pow(horizon));
        BigDecimal capitalGain = futureValue.subtract(propPrice);

        BigDecimal propertyTaxRate = taxRates.getOrDefault("PROPERTY_TAX_RATE", BigDecimal.ZERO);
        BigDecimal totalPropertyTax = propPrice.multiply(propertyTaxRate.divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP)).multiply(new BigDecimal(horizon));
        BigDecimal totalMortgageCost = ((BigDecimal) mortgage.get("monthlyPayment")).multiply(new BigDecimal("12")).multiply(new BigDecimal(Math.min(horizon, request.mortgageTerm())));

        BigDecimal incomeTaxRate = taxRates.getOrDefault("INCOME_TAX_RATE", new BigDecimal("13"));
        BigDecimal saleTax = capitalGain.compareTo(BigDecimal.ZERO) > 0 ? capitalGain.multiply(incomeTaxRate.divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP)) : BigDecimal.ZERO;
        
        BigDecimal netProfit = capitalGain.subtract(totalPropertyTax).subtract(totalMortgageCost).subtract(repair).subtract(legalFees).subtract(saleTax);
        BigDecimal roi = InvestmentMathUtils.safeDivide(netProfit, totalOwnFunds).multiply(new BigDecimal("100"));
        BigDecimal annualizedROI = InvestmentMathUtils.safeDivide(roi, new BigDecimal(horizon));


        return InvestmentCalculationResult.builder()
            .totalPurchaseCost(propPrice.add(legalFees))
            .totalRenovation(repair)
            .totalOwnFunds(totalOwnFunds)
            .legalFees(legalFees)
            .mortgageInfo(mortgage)
            .annualPropertyTax(totalPropertyTax)
            .incomeTaxRate(incomeTaxRate)
            .incomeTaxLabel("Налог")
            .annualIncomeTax(saleTax)
            .totalAnnualTax(saleTax.add(totalPropertyTax))
            .futurePropertyValue(futureValue)
            .capitalGain(capitalGain)
            .totalProfit(netProfit)
            .totalROI(roi)
            .annualizedROI(annualizedROI)
            .yearlyForecast(new ArrayList<>())
            .build();
    }
}
