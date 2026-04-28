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
        BigDecimal propPrice = object.getPriceTotal() != null ? object.getPriceTotal() : BigDecimal.ZERO;
        BigDecimal legalFeesPct = InvestmentMathUtils.getOrDefault(request.legalFeesPct(), new BigDecimal("2"));
        BigDecimal legalFees = propPrice.multiply(InvestmentMathUtils.safeDivide(legalFeesPct, new BigDecimal("100")));
        BigDecimal repair = InvestmentMathUtils.getOrDefault(request.repairCost(), BigDecimal.ZERO);
        
        Map<String, Object> mortgage = InvestmentMathUtils.calculateMortgage(
            propPrice, 
            InvestmentMathUtils.getOrDefault(request.downPaymentPct(), new BigDecimal("30")), 
            InvestmentMathUtils.getOrDefault(request.mortgageRate(), new BigDecimal("12.5")), 
            request.mortgageTerm() > 0 ? request.mortgageTerm() : 15
        );
        
        BigDecimal totalOwnFunds;
        if (request.useMortgage()) {
            totalOwnFunds = ((BigDecimal) mortgage.get("downPayment")).add(repair).add(legalFees);
        } else {
            totalOwnFunds = propPrice.add(legalFees).add(repair);
        }

        int horizon = request.investmentHorizon() > 0 ? request.investmentHorizon() : 10;
        BigDecimal appRate = InvestmentMathUtils.safeDivide(InvestmentMathUtils.getOrDefault(request.appreciationRate(), new BigDecimal("5")), new BigDecimal("100"));
        
        // Formula: FV = PV * (1 + r)^n
        BigDecimal futureValue = propPrice.multiply(BigDecimal.ONE.add(appRate).pow(horizon)).setScale(2, RoundingMode.HALF_UP);
        BigDecimal capitalGain = futureValue.subtract(propPrice);

        BigDecimal propertyTaxRate = taxRates.getOrDefault("PROPERTY_TAX_RATE", BigDecimal.ZERO);
        BigDecimal totalPropertyTax = propPrice.multiply(InvestmentMathUtils.safeDivide(propertyTaxRate, new BigDecimal("100"))).multiply(new BigDecimal(horizon));
        
        BigDecimal monthlyMortgage = (BigDecimal) mortgage.get("monthlyPayment");
        BigDecimal totalMortgageCost = monthlyMortgage.multiply(new BigDecimal("12")).multiply(new BigDecimal(Math.min(horizon, request.mortgageTerm() > 0 ? request.mortgageTerm() : 15)));

        BigDecimal incomeTaxRate = taxRates.getOrDefault("INCOME_TAX_RATE", new BigDecimal("13"));
        BigDecimal saleTax = capitalGain.compareTo(BigDecimal.ZERO) > 0 
            ? capitalGain.multiply(InvestmentMathUtils.safeDivide(incomeTaxRate, new BigDecimal("100"))) 
            : BigDecimal.ZERO;
        
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
            .netProfit(netProfit)
            .totalROI(roi)
            .roi(roi)
            .annualizedROI(annualizedROI)
            .horizon(horizon)
            .yearlyForecast(new ArrayList<>())
            .build();
    }
}
