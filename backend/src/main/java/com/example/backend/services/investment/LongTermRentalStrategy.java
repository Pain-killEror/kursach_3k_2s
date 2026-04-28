package com.example.backend.services.investment;

import com.example.backend.dto.InvestmentCalculationRequest;
import com.example.backend.dto.InvestmentCalculationResult;
import com.example.backend.entities.RealEstateObject;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Map;

@Component("LONG_RENT")
public class LongTermRentalStrategy implements InvestmentStrategy {

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

        BigDecimal grossAnnualIncome = request.monthlyRent().multiply(new BigDecimal("12"));
        BigDecimal effectiveGrossIncome = grossAnnualIncome.multiply(BigDecimal.ONE.subtract(request.vacancyRate().divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP)));

        BigDecimal annualMaintenance = propPrice.multiply(request.maintenancePct().divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP));
        BigDecimal annualUtilities = request.utilityCost().multiply(new BigDecimal("12"));
        BigDecimal annualInsurance = request.insuranceCost();
        BigDecimal annualManagement = effectiveGrossIncome.multiply(request.managementFeePct().divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP));

        BigDecimal propertyTaxRate = taxRates.getOrDefault("PROPERTY_TAX_RATE", BigDecimal.ZERO);
        BigDecimal annualPropertyTax = propPrice.multiply(propertyTaxRate.divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP));

        BigDecimal totalOperatingExpenses = annualMaintenance.add(annualUtilities).add(annualInsurance).add(annualManagement).add(annualPropertyTax);
        BigDecimal noi = effectiveGrossIncome.subtract(totalOperatingExpenses);

        BigDecimal incomeTaxRate = taxRates.getOrDefault("INCOME_TAX_RATE", new BigDecimal("13"));
        String incomeTaxLabel = "НДФЛ";
        
        BigDecimal taxableIncome = noi.compareTo(BigDecimal.ZERO) > 0 ? noi : BigDecimal.ZERO;
        BigDecimal annualIncomeTax = taxableIncome.multiply(incomeTaxRate.divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP));
        
        BigDecimal annualVAT = BigDecimal.ZERO; 
        BigDecimal totalAnnualTax = annualIncomeTax.add(annualPropertyTax).add(annualVAT);

        BigDecimal annualDebtService = ((BigDecimal) mortgage.get("monthlyPayment")).multiply(new BigDecimal("12"));
        BigDecimal netIncomeAfterTax = noi.subtract(annualIncomeTax).subtract(annualVAT);
        BigDecimal annualCashFlow = netIncomeAfterTax.subtract(annualDebtService);
        BigDecimal monthlyCashFlow = annualCashFlow.divide(new BigDecimal("12"), 2, RoundingMode.HALF_UP);

        BigDecimal capRate = InvestmentMathUtils.safeDivide(noi, totalPurchaseCost).multiply(new BigDecimal("100"));
        BigDecimal cashOnCash = InvestmentMathUtils.safeDivide(annualCashFlow, totalOwnFunds).multiply(new BigDecimal("100"));
        
        String paybackYears = annualCashFlow.compareTo(BigDecimal.ZERO) > 0 ? InvestmentMathUtils.safeDivide(totalOwnFunds, annualCashFlow).setScale(1, RoundingMode.HALF_UP).toString() : "∞";
        BigDecimal dscr = annualDebtService.compareTo(BigDecimal.ZERO) > 0 ? InvestmentMathUtils.safeDivide(noi, annualDebtService) : null;
        String grm = grossAnnualIncome.compareTo(BigDecimal.ZERO) > 0 ? InvestmentMathUtils.safeDivide(propPrice, grossAnnualIncome).setScale(1, RoundingMode.HALF_UP).toString() : "∞";
        
        BigDecimal breakEvenOccupancy = request.monthlyRent().compareTo(BigDecimal.ZERO) > 0 
            ? InvestmentMathUtils.safeDivide(totalOperatingExpenses.add(annualDebtService), request.monthlyRent().multiply(new BigDecimal("12"))).multiply(new BigDecimal("100"))

            : BigDecimal.ZERO;

        int horizon = request.investmentHorizon();
        BigDecimal appRate = request.appreciationRate().divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);
        BigDecimal futurePropertyValue = propPrice.multiply(BigDecimal.ONE.add(appRate).pow(horizon));
        BigDecimal capitalGain = futurePropertyValue.subtract(propPrice);
        
        BigDecimal totalCashFlowOverHorizon = annualCashFlow.multiply(new BigDecimal(horizon));
        
        BigDecimal remainingBalance = BigDecimal.ZERO;
        if (request.useMortgage()) {
             BigDecimal r = request.mortgageRate().divide(new BigDecimal("1200"), 10, RoundingMode.HALF_UP);
             int n = request.mortgageTerm() * 12;
             int pm = Math.min(horizon * 12, n);
             BigDecimal loan = (BigDecimal) mortgage.get("loanAmount");
             
             BigDecimal factorN = BigDecimal.ONE.add(r).pow(n);
             BigDecimal factorPM = BigDecimal.ONE.add(r).pow(pm);
             
             remainingBalance = loan.multiply(factorN.subtract(factorPM)).divide(factorN.subtract(BigDecimal.ONE), 2, RoundingMode.HALF_UP);
             if (remainingBalance.compareTo(BigDecimal.ZERO) < 0) remainingBalance = BigDecimal.ZERO;
        }
        
        BigDecimal equityAtEnd = futurePropertyValue.subtract(remainingBalance);
        BigDecimal totalProfit = equityAtEnd.add(totalCashFlowOverHorizon).subtract(totalOwnFunds);
        BigDecimal totalROI = InvestmentMathUtils.safeDivide(totalProfit, totalOwnFunds).multiply(new BigDecimal("100"));
        BigDecimal annualizedROI = InvestmentMathUtils.safeDivide(totalROI, new BigDecimal(horizon));

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
            .incomeTaxLabel(incomeTaxLabel)
            .annualIncomeTax(InvestmentMathUtils.round0(annualIncomeTax))
            .annualVAT(InvestmentMathUtils.round0(annualVAT))
            .totalAnnualTax(InvestmentMathUtils.round0(totalAnnualTax))
            .noi(InvestmentMathUtils.round0(noi))
            .annualDebtService(InvestmentMathUtils.round0(annualDebtService))
            .annualCashFlow(InvestmentMathUtils.round0(annualCashFlow))
            .monthlyCashFlow(InvestmentMathUtils.round2(monthlyCashFlow))
            .capRate(InvestmentMathUtils.round2(capRate))
            .cashOnCash(InvestmentMathUtils.round2(cashOnCash))
            .paybackYears(paybackYears)
            .dscr(dscr)
            .grm(grm)
            .breakEvenOccupancy(InvestmentMathUtils.round1(breakEvenOccupancy))
            .futurePropertyValue(InvestmentMathUtils.round0(futurePropertyValue))
            .capitalGain(InvestmentMathUtils.round0(capitalGain))
            .totalCashFlowOverHorizon(InvestmentMathUtils.round0(totalCashFlowOverHorizon))
            .totalProfit(InvestmentMathUtils.round0(totalProfit))
            .totalROI(InvestmentMathUtils.round2(totalROI))
            .annualizedROI(InvestmentMathUtils.round2(annualizedROI))
            .yearlyForecast(new ArrayList<>())
            .build();
    }
}
