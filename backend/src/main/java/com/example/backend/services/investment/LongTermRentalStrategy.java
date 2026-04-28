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

        BigDecimal monthlyRent = InvestmentMathUtils.getOrDefault(request.monthlyRent(), BigDecimal.ZERO);
        BigDecimal grossAnnualIncome = monthlyRent.multiply(new BigDecimal("12"));
        BigDecimal vacancyRate = InvestmentMathUtils.getOrDefault(request.vacancyRate(), new BigDecimal("5"));
        BigDecimal effectiveGrossIncome = grossAnnualIncome.multiply(BigDecimal.ONE.subtract(InvestmentMathUtils.safeDivide(vacancyRate, new BigDecimal("100"))));

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
        String incomeTaxLabel = "НДФЛ";
        
        BigDecimal taxableIncome = noi.compareTo(BigDecimal.ZERO) > 0 ? noi : BigDecimal.ZERO;
        BigDecimal annualIncomeTax = taxableIncome.multiply(InvestmentMathUtils.safeDivide(incomeTaxRate, new BigDecimal("100")));
        
        BigDecimal annualVAT = BigDecimal.ZERO; 
        BigDecimal totalAnnualTax = annualIncomeTax.add(annualPropertyTax).add(annualVAT);

        BigDecimal annualDebtService = ((BigDecimal) mortgage.get("monthlyPayment")).multiply(new BigDecimal("12"));
        BigDecimal netIncomeAfterTax = noi.subtract(annualIncomeTax).subtract(annualVAT);
        BigDecimal annualCashFlow = netIncomeAfterTax.subtract(annualDebtService);
        BigDecimal monthlyCashFlow = InvestmentMathUtils.safeDivide(annualCashFlow, new BigDecimal("12"));

        BigDecimal capRate = InvestmentMathUtils.safeDivide(noi, totalPurchaseCost).multiply(new BigDecimal("100"));
        BigDecimal cashOnCash = InvestmentMathUtils.safeDivide(annualCashFlow, totalOwnFunds).multiply(new BigDecimal("100"));
        
        String paybackYears = annualCashFlow.compareTo(BigDecimal.ZERO) > 0 ? InvestmentMathUtils.safeDivide(totalOwnFunds, annualCashFlow).setScale(1, RoundingMode.HALF_UP).toString() : "∞";
        BigDecimal dscr = annualDebtService.compareTo(BigDecimal.ZERO) > 0 ? InvestmentMathUtils.safeDivide(noi, annualDebtService) : null;
        String grm = grossAnnualIncome.compareTo(BigDecimal.ZERO) > 0 ? InvestmentMathUtils.safeDivide(propPrice, grossAnnualIncome).setScale(1, RoundingMode.HALF_UP).toString() : "∞";
        
        BigDecimal breakEvenOccupancy = grossAnnualIncome.compareTo(BigDecimal.ZERO) > 0 
            ? InvestmentMathUtils.safeDivide(totalOperatingExpenses.add(annualDebtService), grossAnnualIncome).multiply(new BigDecimal("100"))
            : BigDecimal.ZERO;

        int horizon = request.investmentHorizon() > 0 ? request.investmentHorizon() : 10;
        BigDecimal appreciationRate = InvestmentMathUtils.getOrDefault(request.appreciationRate(), new BigDecimal("5"));
        BigDecimal appRate = InvestmentMathUtils.safeDivide(appreciationRate, new BigDecimal("100"));
        BigDecimal futurePropertyValue = propPrice.multiply(BigDecimal.ONE.add(appRate).pow(horizon)).setScale(2, RoundingMode.HALF_UP);
        BigDecimal capitalGain = futurePropertyValue.subtract(propPrice);
        
        BigDecimal totalCashFlowOverHorizon = annualCashFlow.multiply(new BigDecimal(horizon));
        
        BigDecimal remainingBalance = BigDecimal.ZERO;
        if (request.useMortgage()) {
             BigDecimal mortgageRate = InvestmentMathUtils.getOrDefault(request.mortgageRate(), new BigDecimal("12.5"));
             BigDecimal r = InvestmentMathUtils.safeDivide(mortgageRate, new BigDecimal("1200"));
             int n = (request.mortgageTerm() > 0 ? request.mortgageTerm() : 15) * 12;
             int pm = Math.min(horizon * 12, n);
             BigDecimal loan = (BigDecimal) mortgage.get("loanAmount");
             
             if (r.compareTo(BigDecimal.ZERO) > 0) {
                 BigDecimal factorN = BigDecimal.ONE.add(r).pow(n);
                 BigDecimal factorPM = BigDecimal.ONE.add(r).pow(pm);
                 
                 BigDecimal num = factorN.subtract(factorPM);
                 BigDecimal den = factorN.subtract(BigDecimal.ONE);
                 remainingBalance = loan.multiply(InvestmentMathUtils.safeDivide(num, den)).setScale(2, RoundingMode.HALF_UP);
             } else {
                 // Interest-free mortgage logic (though annualRate is likely > 0)
                 remainingBalance = loan.subtract(loan.multiply(InvestmentMathUtils.safeDivide(new BigDecimal(pm), new BigDecimal(n))));
             }
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
