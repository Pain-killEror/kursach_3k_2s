package com.example.backend.services.investment;

import com.example.backend.dto.InvestmentCalculationRequest;
import com.example.backend.entities.RealEstateObject;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;

@Service
public class InvestmentSmartDefaults {

    private final ObjectMapper objectMapper;

    public InvestmentSmartDefaults(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public InvestmentCalculationRequest enrichWithDefaults(InvestmentCalculationRequest req, RealEstateObject obj) {
        try {
            Map<String, Object> attrs = parseAttributes(obj.getAttributes());
            
            String category = obj.getCategory() != null ? obj.getCategory().toUpperCase() : "";
            String type = obj.getType() != null ? obj.getType() : "Квартира";
            
            // Priority for УЧАСТОК/КОММЕРЦИЯ if specified in category
            if ("УЧАСТОК".equals(category)) {
                type = "Участок";
            } else if ("КОММЕРЦИЯ".equals(category) || "COMMERCIAL".equals(category)) {
                type = "Коммерция";
            }

            BigDecimal price = obj.getPriceTotal() != null ? obj.getPriceTotal() : BigDecimal.ZERO;
            BigDecimal area = obj.getAreaTotal() != null && obj.getAreaTotal().compareTo(BigDecimal.ZERO) > 0 ? obj.getAreaTotal() : new BigDecimal("50");
            BigDecimal pricePerM2 = area.compareTo(BigDecimal.ZERO) > 0 ? price.divide(area, 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;

            // Calculate defaults based on type
            BigDecimal defRepairCost = BigDecimal.ZERO;
            BigDecimal defFurnitureCost = BigDecimal.ZERO;
            BigDecimal defMonthlyRent = BigDecimal.ZERO;
            BigDecimal defVacancyRate = new BigDecimal("5");
            BigDecimal defDailyRate = BigDecimal.ZERO;
            BigDecimal defOccupancyRate = new BigDecimal("65");
            BigDecimal defCleaningCost = new BigDecimal("15");
            BigDecimal defPlatformFeePct = new BigDecimal("15");
            BigDecimal defExpectedSalePrice = BigDecimal.ZERO;
            int defFlipDurationMonths = 4;
            BigDecimal defAgentFeePct = new BigDecimal("3");
            BigDecimal defConstructionCost = BigDecimal.ZERO;
            int defBuildSellDuration = 12;
            BigDecimal defAppreciationRate = new BigDecimal("5");
            BigDecimal defMaintenancePct = new BigDecimal("1");
            BigDecimal defUtilityCost = BigDecimal.ZERO;
            BigDecimal defInsuranceCost = BigDecimal.ZERO;
            BigDecimal defManagementFeePct = BigDecimal.ZERO;

            if ("Квартира".equals(type)) {
                int rooms = getIntAttr(attrs, "rooms_count", 1);
                String renovation = getStringAttr(attrs, "renovation_state", obj.getCategory() != null ? obj.getCategory() : "");
                
                int repairPerM2 = switch (renovation) {
                    case "Черновая отделка" -> 350;
                    case "Предчистовая" -> 250;
                    case "Плохой ремонт" -> 200;
                    case "Средний ремонт" -> 80;
                    case "Хороший ремонт" -> 20;
                    case "Элитный ремонт" -> 0;
                    default -> 100;
                };
                defRepairCost = area.multiply(new BigDecimal(repairPerM2));

                int[] rentByRooms = {0, 350, 450, 550, 700, 850};
                int rIdx = Math.min(Math.max(rooms, 1), 5);
                defMonthlyRent = new BigDecimal(rentByRooms[rIdx]);

                int[] dailyByRooms = {0, 35, 50, 65, 80};
                int dIdx = Math.min(Math.max(rooms, 1), 4);
                defDailyRate = new BigDecimal(dailyByRooms[dIdx]);

                if (getBooleanAttr(attrs, "has_balcony", false)) {
                    defMonthlyRent = defMonthlyRent.multiply(new BigDecimal("1.03")).setScale(0, RoundingMode.HALF_UP);
                }

                Integer floor = obj.getFloor();
                Integer floorsTotal = obj.getFloorsTotal();
                if (floor != null && (floor == 1 || (floorsTotal != null && floor.equals(floorsTotal)))) {
                    defMonthlyRent = defMonthlyRent.multiply(new BigDecimal("0.95")).setScale(0, RoundingMode.HALF_UP);
                }

                if ("Черновая отделка".equals(renovation) || "Предчистовая".equals(renovation) || "Плохой ремонт".equals(renovation)) {
                    defFurnitureCost = area.multiply(new BigDecimal("30"));
                }

                defUtilityCost = new BigDecimal(50 + rooms * 15);
                defExpectedSalePrice = price.multiply(new BigDecimal("1.2")).setScale(0, RoundingMode.HALF_UP);
                defInsuranceCost = price.multiply(new BigDecimal("0.001")).setScale(0, RoundingMode.HALF_UP);
            } else if ("Дом".equals(type)) {
                String houseType = getStringAttr(attrs, "house_type", obj.getCategory() != null ? obj.getCategory() : "");
                String heating = getStringAttr(attrs, "heating_type", "Газ");

                int repairPerM2 = switch (houseType) {
                    case "Старый дом" -> 280;
                    case "Таунхаус" -> 100;
                    case "Коттедж" -> 60;
                    default -> 150;
                };
                defRepairCost = area.multiply(new BigDecimal(repairPerM2));

                defMonthlyRent = pricePerM2.multiply(area).multiply(new BigDecimal("0.004")).setScale(0, RoundingMode.HALF_UP);
                if (defMonthlyRent.compareTo(new BigDecimal("300")) < 0) defMonthlyRent = new BigDecimal("300");

                defUtilityCost = switch (heating) {
                    case "Газ" -> new BigDecimal("80");
                    case "Электричество" -> new BigDecimal("150");
                    case "Твердотопливный" -> new BigDecimal("60");
                    default -> new BigDecimal("100");
                };

                defDailyRate = defMonthlyRent.divide(new BigDecimal("20"), 0, RoundingMode.HALF_UP);
                defExpectedSalePrice = price.multiply(new BigDecimal("1.25")).setScale(0, RoundingMode.HALF_UP);
                defInsuranceCost = price.multiply(new BigDecimal("0.002")).setScale(0, RoundingMode.HALF_UP);
                defMaintenancePct = new BigDecimal("1.5");
            } else if ("Участок".equals(type)) {
                // For land plots, we keep it simple as requested
                defAppreciationRate = new BigDecimal("5");
                defRepairCost = BigDecimal.ZERO; 
                defConstructionCost = new BigDecimal("50000"); // Realistic construction default
                defExpectedSalePrice = price.add(defConstructionCost).multiply(new BigDecimal("1.3")).setScale(0, RoundingMode.HALF_UP);
                defMaintenancePct = new BigDecimal("0.5");
                // Explicitly zero-out apartment fields
                defMonthlyRent = BigDecimal.ZERO;
                defFurnitureCost = BigDecimal.ZERO;
                defUtilityCost = BigDecimal.ZERO;
                defDailyRate = BigDecimal.ZERO;
            } else if ("Коммерция".equals(type)) {
                String retailType = getStringAttr(attrs, "retail_type", obj.getCategory() != null ? obj.getCategory() : "");
                int rentPerM2 = "Стрит-ритейл".equals(retailType) ? 18 : 14;
                defMonthlyRent = area.multiply(new BigDecimal(rentPerM2));
                defVacancyRate = "Стрит-ритейл".equals(retailType) ? new BigDecimal("8") : new BigDecimal("5");
                defUtilityCost = area.multiply(new BigDecimal("1.5")).setScale(0, RoundingMode.HALF_UP);
                defExpectedSalePrice = price.multiply(new BigDecimal("1.15")).setScale(0, RoundingMode.HALF_UP);
                defMaintenancePct = new BigDecimal("0.8");
                defInsuranceCost = price.multiply(new BigDecimal("0.002")).setScale(0, RoundingMode.HALF_UP);
                defRepairCost = area.multiply(new BigDecimal("50"));
            } else if ("Офис".equals(type)) {
                String officeClass = getStringAttr(attrs, "business_center_class", obj.getCategory() != null ? obj.getCategory() : "B");
                int rentPerM2 = switch (officeClass) {
                    case "A" -> 22;
                    case "B" -> 14;
                    case "C" -> 8;
                    default -> 12;
                };
                defMonthlyRent = area.multiply(new BigDecimal(rentPerM2));
                if (getBooleanAttr(attrs, "access_24_7", false)) {
                    defMonthlyRent = defMonthlyRent.multiply(new BigDecimal("1.07")).setScale(0, RoundingMode.HALF_UP);
                }
                defVacancyRate = "C".equals(officeClass) ? new BigDecimal("12") : new BigDecimal("7");
                defUtilityCost = area.multiply(new BigDecimal("1.2")).setScale(0, RoundingMode.HALF_UP);
                defExpectedSalePrice = price.multiply(new BigDecimal("1.1")).setScale(0, RoundingMode.HALF_UP);
                defRepairCost = area.multiply(new BigDecimal("40"));
                defInsuranceCost = price.multiply(new BigDecimal("0.0015")).setScale(0, RoundingMode.HALF_UP);
            } else if ("Склад".equals(type)) {
                String whType = getStringAttr(attrs, "warehouse_type", obj.getCategory() != null ? obj.getCategory() : "");
                boolean hasRamp = getBooleanAttr(attrs, "has_ramp", false);
                double ceilingH = getDoubleAttr(attrs, "ceiling_height_m", 4.0);

                BigDecimal rentM2 = "Отапливаемый".equals(whType) ? new BigDecimal("6") : new BigDecimal("3.5");
                if (hasRamp) rentM2 = rentM2.multiply(new BigDecimal("1.15"));
                if (ceilingH >= 10) rentM2 = rentM2.multiply(new BigDecimal("1.2"));
                else if (ceilingH >= 6) rentM2 = rentM2.multiply(new BigDecimal("1.1"));

                defMonthlyRent = area.multiply(rentM2).setScale(0, RoundingMode.HALF_UP);
                defVacancyRate = new BigDecimal("10");
                defUtilityCost = area.multiply("Отапливаемый".equals(whType) ? new BigDecimal("1.8") : new BigDecimal("0.5")).setScale(0, RoundingMode.HALF_UP);
                defMaintenancePct = new BigDecimal("0.5");
                defRepairCost = area.multiply(new BigDecimal("15"));
                defInsuranceCost = price.multiply(new BigDecimal("0.003")).setScale(0, RoundingMode.HALF_UP);
            } else if ("Гараж".equals(type)) {
                String material = getStringAttr(attrs, "material", obj.getCategory() != null ? obj.getCategory() : "Кирпичный");
                boolean isCovered = getBooleanAttr(attrs, "is_covered", true);
                boolean hasPit = getBooleanAttr(attrs, "has_pit", false);

                BigDecimal baseRent = "Кирпичный".equals(material) ? new BigDecimal("100") : new BigDecimal("70");
                if (isCovered) baseRent = baseRent.multiply(new BigDecimal("1.15"));
                if (hasPit) baseRent = baseRent.multiply(new BigDecimal("1.10"));

                defMonthlyRent = baseRent.setScale(0, RoundingMode.HALF_UP);
                defVacancyRate = new BigDecimal("5");
                defUtilityCost = new BigDecimal("15");
                defRepairCost = "Металлический".equals(material) ? new BigDecimal("500") : new BigDecimal("300");
                defMaintenancePct = new BigDecimal("0.3");
                defInsuranceCost = price.multiply(new BigDecimal("0.002")).setScale(0, RoundingMode.HALF_UP);
                defAppreciationRate = new BigDecimal("3");
            }

            return new InvestmentCalculationRequest(
                req.objectId(),
                req.strategyId(),
                req.useMortgage(),
                req.downPaymentPct() != null ? req.downPaymentPct() : new BigDecimal("30"),
                req.mortgageRate() != null ? req.mortgageRate() : new BigDecimal("12.5"),
                req.mortgageTerm() > 0 ? req.mortgageTerm() : 15,
                req.legalFeesPct() != null ? req.legalFeesPct() : new BigDecimal("2"),
                req.repairCost() != null ? req.repairCost() : defRepairCost,
                req.furnitureCost() != null ? req.furnitureCost() : defFurnitureCost,
                req.monthlyRent() != null && req.monthlyRent().compareTo(BigDecimal.ZERO) != 0 ? req.monthlyRent() : defMonthlyRent,
                req.vacancyRate() != null ? req.vacancyRate() : defVacancyRate,
                req.dailyRate() != null && req.dailyRate().compareTo(BigDecimal.ZERO) != 0 ? req.dailyRate() : defDailyRate,
                req.occupancyRate() != null ? req.occupancyRate() : defOccupancyRate,
                req.cleaningCost() != null ? req.cleaningCost() : defCleaningCost,
                req.platformFeePct() != null ? req.platformFeePct() : defPlatformFeePct,
                req.expectedSalePrice() != null && req.expectedSalePrice().compareTo(BigDecimal.ZERO) != 0 ? req.expectedSalePrice() : defExpectedSalePrice,
                req.flipDurationMonths() > 0 ? req.flipDurationMonths() : defFlipDurationMonths,
                req.agentFeePct() != null ? req.agentFeePct() : defAgentFeePct,
                req.constructionCost() != null && req.constructionCost().compareTo(BigDecimal.ZERO) != 0 ? req.constructionCost() : defConstructionCost,
                req.buildSellDuration() > 0 ? req.buildSellDuration() : defBuildSellDuration,
                req.appreciationRate() != null ? req.appreciationRate() : defAppreciationRate,
                req.investmentHorizon() > 0 ? req.investmentHorizon() : 10,
                req.maintenancePct() != null ? req.maintenancePct() : defMaintenancePct,
                req.utilityCost() != null ? req.utilityCost() : defUtilityCost,
                req.insuranceCost() != null ? req.insuranceCost() : defInsuranceCost,
                req.managementFeePct() != null ? req.managementFeePct() : defManagementFeePct,
                req.useLegalUSN()
            );
        } catch (Exception e) {
            // Fallback safety
            return req;
        }
    }

    private Map<String, Object> parseAttributes(String attributesJson) {
        if (attributesJson == null || attributesJson.trim().isEmpty()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(attributesJson, new TypeReference<>() {});
        } catch (Exception e) {
            return Map.of();
        }
    }

    private String getStringAttr(Map<String, Object> attrs, String key, String defaultValue) {
        Object val = attrs.get(key);
        return val instanceof String ? (String) val : defaultValue;
    }

    private int getIntAttr(Map<String, Object> attrs, String key, int defaultValue) {
        Object val = attrs.get(key);
        if (val instanceof Number) return ((Number) val).intValue();
        if (val instanceof String) {
            try { return Integer.parseInt((String) val); } catch (NumberFormatException ignored) {}
        }
        return defaultValue;
    }

    private double getDoubleAttr(Map<String, Object> attrs, String key, double defaultValue) {
        Object val = attrs.get(key);
        if (val instanceof Number) return ((Number) val).doubleValue();
        if (val instanceof String) {
            try { return Double.parseDouble((String) val); } catch (NumberFormatException ignored) {}
        }
        return defaultValue;
    }

    private boolean getBooleanAttr(Map<String, Object> attrs, String key, boolean defaultValue) {
        Object val = attrs.get(key);
        if (val instanceof Boolean) return (Boolean) val;
        if (val instanceof String) return Boolean.parseBoolean((String) val);
        return defaultValue;
    }
}
