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
        BigDecimal propPrice = object.getPriceTotal() != null ? object.getPriceTotal() : BigDecimal.ZERO;
        BigDecimal legalFeesPct = InvestmentMathUtils.getOrDefault(request.legalFeesPct(), new BigDecimal("2"));
        BigDecimal legalFees = propPrice.multiply(InvestmentMathUtils.safeDivide(legalFeesPct, new BigDecimal("100")));
        BigDecimal totalPurchaseCost = propPrice.add(legalFees);
        BigDecimal repairCost = InvestmentMathUtils.getOrDefault(request.repairCost(), BigDecimal.ZERO);
        BigDecimal furnitureCost = InvestmentMathUtils.getOrDefault(request.furnitureCost(), BigDecimal.ZERO);
        BigDecimal totalRenovation = repairCost.add(furnitureCost);

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
            totalOwnFunds = totalPurchaseCost.add(totalRenovation);
        }

        BigDecimal daysPerYear = new BigDecimal("365");
        BigDecimal occupancyRate = InvestmentMathUtils.getOrDefault(request.occupancyRate(), new BigDecimal("65"));
        BigDecimal occupiedDays = daysPerYear.multiply(InvestmentMathUtils.safeDivide(occupancyRate, new BigDecimal("100")));
        BigDecimal dailyRate = InvestmentMathUtils.getOrDefault(request.dailyRate(), BigDecimal.ZERO);
        BigDecimal grossAnnualIncome = dailyRate.multiply(occupiedDays);
        
        BigDecimal platformFeePct = InvestmentMathUtils.getOrDefault(request.platformFeePct(), new BigDecimal("15"));
        BigDecimal platformFees = grossAnnualIncome.multiply(InvestmentMathUtils.safeDivide(platformFeePct, new BigDecimal("100")));
        
        BigDecimal avgStayDays = new BigDecimal("2.5");
        BigDecimal turnovers = InvestmentMathUtils.safeDivide(occupiedDays, avgStayDays);
        BigDecimal cleaningCost = InvestmentMathUtils.getOrDefault(request.cleaningCost(), BigDecimal.ZERO);
        BigDecimal totalCleaningCost = turnovers.multiply(cleaningCost);
        
        BigDecimal effectiveGrossIncome = grossAnnualIncome.subtract(platformFees).subtract(totalCleaningCost);

        BigDecimal maintenancePct = InvestmentMathUtils.getOrDefault(request.maintenancePct(), new BigDecimal("1"));
        BigDecimal annualMaintenance = propPrice.multiply(InvestmentMathUtils.safeDivide(maintenancePct, new BigDecimal("100")));
        BigDecimal utilityCost = InvestmentMathUtils.getOrDefault(request.utilityCost(), BigDecimal.ZERO);
        BigDecimal annualUtilities = utilityCost.multiply(new BigDecimal("12"));
        BigDecimal annualInsurance = InvestmentMathUtils.getOrDefault(request.insuranceCost(), BigDecimal.ZERO);
        BigDecimal managementFeePct = InvestmentMathUtils.getOrDefault(request.managementFeePct(), BigDecimal.ZERO);
        BigDecimal annualManagement = effectiveGrossIncome.multiply(InvestmentMathUtils.safeDivide(managementFeePct, new BigDecimal("100")));

        BigDecimal propertyTaxRate = taxRates.getOrDefault("PROPERTY_TAX_RATE", BigDecimal.ZERO);
        BigDecimal annualPropertyTax = propPrice.multiply(InvestmentMathUtils.safeDivide(propertyTaxRate, new BigDecimal("100")));

        BigDecimal totalOperatingExpenses = annualMaintenance.add(annualUtilities).add(annualInsurance).add(annualManagement).add(annualPropertyTax);
        BigDecimal noi = effectiveGrossIncome.subtract(totalOperatingExpenses);

        BigDecimal incomeTaxRate = taxRates.getOrDefault("INCOME_TAX_RATE", new BigDecimal("13"));
        BigDecimal annualIncomeTax = noi.compareTo(BigDecimal.ZERO) > 0 
                ? noi.multiply(InvestmentMathUtils.safeDivide(incomeTaxRate, new BigDecimal("100"))) 
                : BigDecimal.ZERO;
        
        BigDecimal totalAnnualTax = annualIncomeTax.add(annualPropertyTax);

        BigDecimal annualDebtService = ((BigDecimal) mortgage.get("monthlyPayment")).multiply(new BigDecimal("12"));
        BigDecimal annualCashFlow = noi.subtract(annualIncomeTax).subtract(annualDebtService);
        BigDecimal monthlyCashFlow = InvestmentMathUtils.safeDivide(annualCashFlow, new BigDecimal("12"));

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
