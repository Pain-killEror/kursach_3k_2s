package com.example.backend.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public class InvestmentCalculationResult {
    // Investment
    private BigDecimal totalPurchaseCost;
    private BigDecimal totalRenovation;
    private BigDecimal totalOwnFunds;
    private BigDecimal legalFees;
    private Map<String, Object> mortgageInfo;

    // Income
    private BigDecimal grossAnnualIncome;
    private BigDecimal effectiveGrossIncome;

    // Expenses
    private BigDecimal totalOperatingExpenses;
    private BigDecimal annualMaintenance;
    private BigDecimal annualUtilities;
    private BigDecimal annualInsurance;
    private BigDecimal annualManagement;
    private BigDecimal annualPropertyTax;

    // Taxes
    private BigDecimal incomeTaxRate;
    private String incomeTaxLabel;
    private BigDecimal annualIncomeTax;
    private BigDecimal annualVAT;
    private BigDecimal totalAnnualTax;

    // Cash Flow
    private BigDecimal noi;
    private BigDecimal annualDebtService;
    private BigDecimal annualCashFlow;
    private BigDecimal monthlyCashFlow;

    // Key Metrics
    private BigDecimal capRate;
    private BigDecimal cashOnCash;
    private String paybackYears;
    private BigDecimal dscr;
    private String grm;
    private BigDecimal breakEvenOccupancy;

    // Long-term Forecast
    private BigDecimal futurePropertyValue;
    private BigDecimal capitalGain;
    private BigDecimal totalCashFlowOverHorizon;
    private BigDecimal totalProfit;
    private BigDecimal totalROI;
    private BigDecimal annualizedROI;

    private List<Map<String, Object>> yearlyForecast;

    public InvestmentCalculationResult() {}

    public static InvestmentCalculationResultBuilder builder() {
        return new InvestmentCalculationResultBuilder();
    }

    // Getters and Setters (Manual)
    public BigDecimal getTotalPurchaseCost() { return totalPurchaseCost; }
    public void setTotalPurchaseCost(BigDecimal totalPurchaseCost) { this.totalPurchaseCost = totalPurchaseCost; }
    public BigDecimal getTotalRenovation() { return totalRenovation; }
    public void setTotalRenovation(BigDecimal totalRenovation) { this.totalRenovation = totalRenovation; }
    public BigDecimal getTotalOwnFunds() { return totalOwnFunds; }
    public void setTotalOwnFunds(BigDecimal totalOwnFunds) { this.totalOwnFunds = totalOwnFunds; }
    public BigDecimal getLegalFees() { return legalFees; }
    public void setLegalFees(BigDecimal legalFees) { this.legalFees = legalFees; }
    public Map<String, Object> getMortgageInfo() { return mortgageInfo; }
    public void setMortgageInfo(Map<String, Object> mortgageInfo) { this.mortgageInfo = mortgageInfo; }
    public BigDecimal getGrossAnnualIncome() { return grossAnnualIncome; }
    public void setGrossAnnualIncome(BigDecimal grossAnnualIncome) { this.grossAnnualIncome = grossAnnualIncome; }
    public BigDecimal getEffectiveGrossIncome() { return effectiveGrossIncome; }
    public void setEffectiveGrossIncome(BigDecimal effectiveGrossIncome) { this.effectiveGrossIncome = effectiveGrossIncome; }
    public BigDecimal getTotalOperatingExpenses() { return totalOperatingExpenses; }
    public void setTotalOperatingExpenses(BigDecimal totalOperatingExpenses) { this.totalOperatingExpenses = totalOperatingExpenses; }
    public BigDecimal getAnnualMaintenance() { return annualMaintenance; }
    public void setAnnualMaintenance(BigDecimal annualMaintenance) { this.annualMaintenance = annualMaintenance; }
    public BigDecimal getAnnualUtilities() { return annualUtilities; }
    public void setAnnualUtilities(BigDecimal annualUtilities) { this.annualUtilities = annualUtilities; }
    public BigDecimal getAnnualInsurance() { return annualInsurance; }
    public void setAnnualInsurance(BigDecimal annualInsurance) { this.annualInsurance = annualInsurance; }
    public BigDecimal getAnnualManagement() { return annualManagement; }
    public void setAnnualManagement(BigDecimal annualManagement) { this.annualManagement = annualManagement; }
    public BigDecimal getAnnualPropertyTax() { return annualPropertyTax; }
    public void setAnnualPropertyTax(BigDecimal annualPropertyTax) { this.annualPropertyTax = annualPropertyTax; }
    public BigDecimal getIncomeTaxRate() { return incomeTaxRate; }
    public void setIncomeTaxRate(BigDecimal incomeTaxRate) { this.incomeTaxRate = incomeTaxRate; }
    public String getIncomeTaxLabel() { return incomeTaxLabel; }
    public void setIncomeTaxLabel(String incomeTaxLabel) { this.incomeTaxLabel = incomeTaxLabel; }
    public BigDecimal getAnnualIncomeTax() { return annualIncomeTax; }
    public void setAnnualIncomeTax(BigDecimal annualIncomeTax) { this.annualIncomeTax = annualIncomeTax; }
    public BigDecimal getAnnualVAT() { return annualVAT; }
    public void setAnnualVAT(BigDecimal annualVAT) { this.annualVAT = annualVAT; }
    public BigDecimal getTotalAnnualTax() { return totalAnnualTax; }
    public void setTotalAnnualTax(BigDecimal totalAnnualTax) { this.totalAnnualTax = totalAnnualTax; }
    public BigDecimal getNoi() { return noi; }
    public void setNoi(BigDecimal noi) { this.noi = noi; }
    public BigDecimal getAnnualDebtService() { return annualDebtService; }
    public void setAnnualDebtService(BigDecimal annualDebtService) { this.annualDebtService = annualDebtService; }
    public BigDecimal getAnnualCashFlow() { return annualCashFlow; }
    public void setAnnualCashFlow(BigDecimal annualCashFlow) { this.annualCashFlow = annualCashFlow; }
    public BigDecimal getMonthlyCashFlow() { return monthlyCashFlow; }
    public void setMonthlyCashFlow(BigDecimal monthlyCashFlow) { this.monthlyCashFlow = monthlyCashFlow; }
    public BigDecimal getCapRate() { return capRate; }
    public void setCapRate(BigDecimal capRate) { this.capRate = capRate; }
    public BigDecimal getCashOnCash() { return cashOnCash; }
    public void setCashOnCash(BigDecimal cashOnCash) { this.cashOnCash = cashOnCash; }
    public String getPaybackYears() { return paybackYears; }
    public void setPaybackYears(String paybackYears) { this.paybackYears = paybackYears; }
    public BigDecimal getDscr() { return dscr; }
    public void setDscr(BigDecimal dscr) { this.dscr = dscr; }
    public String getGrm() { return grm; }
    public void setGrm(String grm) { this.grm = grm; }
    public BigDecimal getBreakEvenOccupancy() { return breakEvenOccupancy; }
    public void setBreakEvenOccupancy(BigDecimal breakEvenOccupancy) { this.breakEvenOccupancy = breakEvenOccupancy; }
    public BigDecimal getFuturePropertyValue() { return futurePropertyValue; }
    public void setFuturePropertyValue(BigDecimal futurePropertyValue) { this.futurePropertyValue = futurePropertyValue; }
    public BigDecimal getCapitalGain() { return capitalGain; }
    public void setCapitalGain(BigDecimal capitalGain) { this.capitalGain = capitalGain; }
    public BigDecimal getTotalCashFlowOverHorizon() { return totalCashFlowOverHorizon; }
    public void setTotalCashFlowOverHorizon(BigDecimal totalCashFlowOverHorizon) { this.totalCashFlowOverHorizon = totalCashFlowOverHorizon; }
    public BigDecimal getTotalProfit() { return totalProfit; }
    public void setTotalProfit(BigDecimal totalProfit) { this.totalProfit = totalProfit; }
    public BigDecimal getTotalROI() { return totalROI; }
    public void setTotalROI(BigDecimal totalROI) { this.totalROI = totalROI; }
    public BigDecimal getAnnualizedROI() { return annualizedROI; }
    public void setAnnualizedROI(BigDecimal annualizedROI) { this.annualizedROI = annualizedROI; }
    public List<Map<String, Object>> getYearlyForecast() { return yearlyForecast; }
    public void setYearlyForecast(List<Map<String, Object>> yearlyForecast) { this.yearlyForecast = yearlyForecast; }

    public static class InvestmentCalculationResultBuilder {
        private final InvestmentCalculationResult result = new InvestmentCalculationResult();

        public InvestmentCalculationResultBuilder totalPurchaseCost(BigDecimal v) { result.setTotalPurchaseCost(v); return this; }
        public InvestmentCalculationResultBuilder totalRenovation(BigDecimal v) { result.setTotalRenovation(v); return this; }
        public InvestmentCalculationResultBuilder totalOwnFunds(BigDecimal v) { result.setTotalOwnFunds(v); return this; }
        public InvestmentCalculationResultBuilder legalFees(BigDecimal v) { result.setLegalFees(v); return this; }
        public InvestmentCalculationResultBuilder mortgageInfo(Map<String, Object> v) { result.setMortgageInfo(v); return this; }
        public InvestmentCalculationResultBuilder grossAnnualIncome(BigDecimal v) { result.setGrossAnnualIncome(v); return this; }
        public InvestmentCalculationResultBuilder effectiveGrossIncome(BigDecimal v) { result.setEffectiveGrossIncome(v); return this; }
        public InvestmentCalculationResultBuilder totalOperatingExpenses(BigDecimal v) { result.setTotalOperatingExpenses(v); return this; }
        public InvestmentCalculationResultBuilder annualMaintenance(BigDecimal v) { result.setAnnualMaintenance(v); return this; }
        public InvestmentCalculationResultBuilder annualUtilities(BigDecimal v) { result.setAnnualUtilities(v); return this; }
        public InvestmentCalculationResultBuilder annualInsurance(BigDecimal v) { result.setAnnualInsurance(v); return this; }
        public InvestmentCalculationResultBuilder annualManagement(BigDecimal v) { result.setAnnualManagement(v); return this; }
        public InvestmentCalculationResultBuilder annualPropertyTax(BigDecimal v) { result.setAnnualPropertyTax(v); return this; }
        public InvestmentCalculationResultBuilder incomeTaxRate(BigDecimal v) { result.setIncomeTaxRate(v); return this; }
        public InvestmentCalculationResultBuilder incomeTaxLabel(String v) { result.setIncomeTaxLabel(v); return this; }
        public InvestmentCalculationResultBuilder annualIncomeTax(BigDecimal v) { result.setAnnualIncomeTax(v); return this; }
        public InvestmentCalculationResultBuilder annualVAT(BigDecimal v) { result.setAnnualVAT(v); return this; }
        public InvestmentCalculationResultBuilder totalAnnualTax(BigDecimal v) { result.setTotalAnnualTax(v); return this; }
        public InvestmentCalculationResultBuilder noi(BigDecimal v) { result.setNoi(v); return this; }
        public InvestmentCalculationResultBuilder annualDebtService(BigDecimal v) { result.setAnnualDebtService(v); return this; }
        public InvestmentCalculationResultBuilder annualCashFlow(BigDecimal v) { result.setAnnualCashFlow(v); return this; }
        public InvestmentCalculationResultBuilder monthlyCashFlow(BigDecimal v) { result.setMonthlyCashFlow(v); return this; }
        public InvestmentCalculationResultBuilder capRate(BigDecimal v) { result.setCapRate(v); return this; }
        public InvestmentCalculationResultBuilder cashOnCash(BigDecimal v) { result.setCashOnCash(v); return this; }
        public InvestmentCalculationResultBuilder paybackYears(String v) { result.setPaybackYears(v); return this; }
        public InvestmentCalculationResultBuilder dscr(BigDecimal v) { result.setDscr(v); return this; }
        public InvestmentCalculationResultBuilder grm(String v) { result.setGrm(v); return this; }
        public InvestmentCalculationResultBuilder breakEvenOccupancy(BigDecimal v) { result.setBreakEvenOccupancy(v); return this; }
        public InvestmentCalculationResultBuilder futurePropertyValue(BigDecimal v) { result.setFuturePropertyValue(v); return this; }
        public InvestmentCalculationResultBuilder capitalGain(BigDecimal v) { result.setCapitalGain(v); return this; }
        public InvestmentCalculationResultBuilder totalCashFlowOverHorizon(BigDecimal v) { result.setTotalCashFlowOverHorizon(v); return this; }
        public InvestmentCalculationResultBuilder totalProfit(BigDecimal v) { result.setTotalProfit(v); return this; }
        public InvestmentCalculationResultBuilder totalROI(BigDecimal v) { result.setTotalROI(v); return this; }
        public InvestmentCalculationResultBuilder annualizedROI(BigDecimal v) { result.setAnnualizedROI(v); return this; }
        public InvestmentCalculationResultBuilder yearlyForecast(List<Map<String, Object>> v) { result.setYearlyForecast(v); return this; }

        public InvestmentCalculationResult build() {
            return result;
        }
    }
}
