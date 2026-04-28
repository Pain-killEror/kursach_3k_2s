package com.example.backend.services.investment;

import com.example.backend.dto.InvestmentCalculationRequest;
import com.example.backend.dto.InvestmentCalculationResult;
import com.example.backend.entities.RealEstateObject;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Map;

@Component("SHORT_RENT")
public class ShortTermRentalStrategy implements InvestmentStrategy {

    @Override
    public InvestmentCalculationResult calculate(InvestmentCalculationRequest request, RealEstateObject object, Map<String, BigDecimal> taxRates) {
        BigDecimal propPrice = BigDecimal.valueOf(object.getPriceTotal().doubleValue());
        BigDecimal legalFees = propPrice.multiply(request.legalFeesPct().divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP));
        BigDecimal totalPurchaseCost = propPrice.add(legalFees);
        BigDecimal totalRenovation = request.repairCost().add(request.furnitureCost());

        Map<String, Object> mortgage = InvestmentMathUtils.calculateMortgage(propPrice, request.downPaymentPct(), request.mortgageRate(), request.mortgageTerm());
        
        BigDecimal totalOwnFunds;
        if (request.useMortgage()) {
            totalOwnFunds = ((BigDecimal) mortgage.get("downPayment")).add(totalRenovation).add(legalFees);
        } else {
            totalOwnFunds = totalPurchaseCost.add(totalRenovation);
        }

        BigDecimal daysPerYear = new BigDecimal("365");
        BigDecimal occupiedDays = daysPerYear.multiply(request.occupancyRate().divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP));
        BigDecimal grossAnnualIncome = request.dailyRate().multiply(occupiedDays);
        
        BigDecimal platformFees = grossAnnualIncome.multiply(request.platformFeePct().divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP));
        BigDecimal avgStayDays = new BigDecimal("2.5");
        BigDecimal turnovers = InvestmentMathUtils.safeDivide(occupiedDays, avgStayDays);
        BigDecimal totalCleaningCost = turnovers.multiply(request.cleaningCost());
        
        BigDecimal effectiveGrossIncome = grossAnnualIncome.subtract(platformFees).subtract(totalCleaningCost);

        BigDecimal annualMaintenance = propPrice.multiply(request.maintenancePct().divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP));
        BigDecimal annualUtilities = request.utilityCost().multiply(new BigDecimal("12"));
        BigDecimal annualInsurance = request.insuranceCost();
        BigDecimal annualManagement = effectiveGrossIncome.multiply(request.managementFeePct().divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP));

        BigDecimal propertyTaxRate = taxRates.getOrDefault("PROPERTY_TAX_RATE", BigDecimal.ZERO);
        BigDecimal annualPropertyTax = propPrice.multiply(propertyTaxRate.divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP));

        BigDecimal totalOperatingExpenses = annualMaintenance.add(annualUtilities).add(annualInsurance).add(annualManagement).add(annualPropertyTax);
        BigDecimal noi = effectiveGrossIncome.subtract(totalOperatingExpenses);

        BigDecimal incomeTaxRate = taxRates.getOrDefault("INCOME_TAX_RATE", new BigDecimal("13"));
        BigDecimal annualIncomeTax = noi.compareTo(BigDecimal.ZERO) > 0 ? noi.multiply(incomeTaxRate.divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP)) : BigDecimal.ZERO;
        
        BigDecimal totalAnnualTax = annualIncomeTax.add(annualPropertyTax);

        BigDecimal annualDebtService = ((BigDecimal) mortgage.get("monthlyPayment")).multiply(new BigDecimal("12"));
        BigDecimal annualCashFlow = noi.subtract(annualIncomeTax).subtract(annualDebtService);
        BigDecimal monthlyCashFlow = annualCashFlow.divide(new BigDecimal("12"), 2, RoundingMode.HALF_UP);

        BigDecimal capRate = InvestmentMathUtils.safeDivide(noi, totalPurchaseCost).multiply(new BigDecimal("100"));
        BigDecimal cashOnCash = InvestmentMathUtils.safeDivide(annualCashFlow, totalOwnFunds).multiply(new BigDecimal("100"));

        
        return InvestmentCalculationResult.builder()
            .totalPurchaseCost(InvestmentMathUtils.round0(totalPurchaseCost))
            .totalRenovation(InvestmentMathUtils.round0(totalRenovation))
            .totalOwnFunds(InvestmentMathUtils.round0(totalOwnFunds))
            .legalFees(InvestmentMathUtils.round0(legalFees))
            .mortgageInfo(mortgage)
            .grossAnnualIncome(InvestmentMathUtils.round0(grossAnnualIncome))
            .effectiveGrossIncome(InvestmentMathUtils.round0(effectiveGrossIncome))
            .totalOperatingExpenses(InvestmentMathUtils.round0(totalOperatingExpenses))
            .annualMaintenance(InvestmentMathUtils.round0(annualMaintenance))
            .annualUtilities(InvestmentMathUtils.round0(annualUtilities))
            .annualInsurance(InvestmentMathUtils.round0(annualInsurance))
            .annualManagement(InvestmentMathUtils.round0(annualManagement))
            .annualPropertyTax(InvestmentMathUtils.round0(annualPropertyTax))
            .incomeTaxRate(incomeTaxRate)
            .incomeTaxLabel("Подоходный")
            .annualIncomeTax(InvestmentMathUtils.round0(annualIncomeTax))
            .annualVAT(BigDecimal.ZERO)
            .totalAnnualTax(InvestmentMathUtils.round0(totalAnnualTax))
            .noi(InvestmentMathUtils.round0(noi))
            .annualDebtService(InvestmentMathUtils.round0(annualDebtService))
            .annualCashFlow(InvestmentMathUtils.round0(annualCashFlow))
            .monthlyCashFlow(InvestmentMathUtils.round2(monthlyCashFlow))
            .capRate(InvestmentMathUtils.round2(capRate))
            .cashOnCash(InvestmentMathUtils.round2(cashOnCash))
            .yearlyForecast(new ArrayList<>())
            .build();
    }
}
