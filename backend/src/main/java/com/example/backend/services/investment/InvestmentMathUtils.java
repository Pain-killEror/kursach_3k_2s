package com.example.backend.services.investment;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.Map;

public class InvestmentMathUtils {

    public static Map<String, Object> calculateMortgage(BigDecimal propertyPrice, BigDecimal downPaymentPct, BigDecimal annualRate, int termYears) {
        if (propertyPrice == null || propertyPrice.compareTo(BigDecimal.ZERO) == 0) {
            Map<String, Object> emptyResult = new HashMap<>();
            emptyResult.put("downPayment", BigDecimal.ZERO);
            emptyResult.put("loanAmount", BigDecimal.ZERO);
            emptyResult.put("monthlyPayment", BigDecimal.ZERO);
            emptyResult.put("totalPayment", BigDecimal.ZERO);
            emptyResult.put("totalInterest", BigDecimal.ZERO);
            return emptyResult;
        }
        
        BigDecimal downPayment = propertyPrice.multiply(downPaymentPct.divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP));
        BigDecimal loanAmount = propertyPrice.subtract(downPayment);

        Map<String, Object> result = new HashMap<>();
        result.put("downPayment", downPayment.setScale(0, RoundingMode.HALF_UP));
        result.put("loanAmount", loanAmount.setScale(0, RoundingMode.HALF_UP));

        if (loanAmount.compareTo(BigDecimal.ZERO) <= 0 || annualRate.compareTo(BigDecimal.ZERO) <= 0 || termYears <= 0) {
            result.put("monthlyPayment", BigDecimal.ZERO);
            result.put("totalPayment", BigDecimal.ZERO);
            result.put("totalInterest", BigDecimal.ZERO);
            return result;
        }

        // Monthly rate
        BigDecimal r = annualRate.divide(new BigDecimal("100"), 10, RoundingMode.HALF_UP).divide(new BigDecimal("12"), 10, RoundingMode.HALF_UP);
        int n = termYears * 12;

        // Formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
        BigDecimal onePlusR = BigDecimal.ONE.add(r);
        BigDecimal onePlusRPowN = onePlusR.pow(n);

        BigDecimal numerator = loanAmount.multiply(r).multiply(onePlusRPowN);
        BigDecimal denominator = onePlusRPowN.subtract(BigDecimal.ONE);

        BigDecimal monthlyPayment = numerator.divide(denominator, 2, RoundingMode.HALF_UP);
        BigDecimal totalPayment = monthlyPayment.multiply(new BigDecimal(n));
        BigDecimal totalInterest = totalPayment.subtract(loanAmount);

        result.put("monthlyPayment", monthlyPayment);
        result.put("totalPayment", totalPayment.setScale(0, RoundingMode.HALF_UP));
        result.put("totalInterest", totalInterest.setScale(0, RoundingMode.HALF_UP));

        return result;
    }

    public static BigDecimal round0(BigDecimal val) {
        return val == null ? BigDecimal.ZERO : val.setScale(0, RoundingMode.HALF_UP);
    }

    public static BigDecimal round1(BigDecimal val) {
        return val == null ? BigDecimal.ZERO : val.setScale(1, RoundingMode.HALF_UP);
    }

    public static BigDecimal round2(BigDecimal val) {
        return val == null ? BigDecimal.ZERO : val.setScale(2, RoundingMode.HALF_UP);
    }

    public static BigDecimal getOrDefault(BigDecimal value, BigDecimal defaultValue) {
        return value != null ? value : (defaultValue != null ? defaultValue : BigDecimal.ZERO);
    }

    public static BigDecimal safeDivide(BigDecimal dividend, BigDecimal divisor) {
        if (dividend == null || divisor == null || divisor.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return dividend.divide(divisor, 4, RoundingMode.HALF_UP);
    }
}
