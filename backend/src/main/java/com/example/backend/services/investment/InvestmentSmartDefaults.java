package com.example.backend.services.investment;

import com.example.backend.dto.InvestmentCalculationRequest;
import com.example.backend.entities.RealEstateObject;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;

@Service
public class InvestmentSmartDefaults {

    private final ObjectMapper objectMapper;

    public InvestmentSmartDefaults(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    // Кастомная аннотация + Reflection API:
    // используется только для извлечения нескольких атрибутов из JSON.
    @Retention(RetentionPolicy.RUNTIME)
    @Target(ElementType.FIELD)
    private @interface AttrKey {
        String key();
        String defaultValue();
    }

    // Модель атрибутов квартиры (поле заполняется reflection-ом).
    private static class ApartmentAttrs {
        @AttrKey(key = "rooms_count", defaultValue = "1")
        private Integer rooms;

        @AttrKey(key = "renovation_state", defaultValue = "")
        private String renovation;

        @AttrKey(key = "has_balcony", defaultValue = "false")
        private Boolean hasBalcony;
    }

    private <T> T mapAnnotatedAttrs(Map<String, Object> attrs, Class<T> clazz) {
        try {
            T instance = clazz.getDeclaredConstructor().newInstance();

            for (Field field : clazz.getDeclaredFields()) {
                AttrKey ann = field.getAnnotation(AttrKey.class);
                if (ann == null) continue;

                field.setAccessible(true);
                String key = ann.key();
                String defaultValue = ann.defaultValue();

                Class<?> type = field.getType();
                if (type == Integer.class || type == int.class) {
                    int def = Integer.parseInt(defaultValue);
                    field.set(instance, getIntAttr(attrs, key, def));
                } else if (type == String.class) {
                    field.set(instance, getStringAttr(attrs, key, defaultValue));
                } else if (type == Boolean.class || type == boolean.class) {
                    boolean def = Boolean.parseBoolean(defaultValue);
                    field.set(instance, getBooleanAttr(attrs, key, def));
                } else if (type == Double.class || type == double.class) {
                    double def = Double.parseDouble(defaultValue);
                    field.set(instance, getDoubleAttr(attrs, key, def));
                }
            }

            return instance;
        } catch (Exception e) {
            // Не ломаем бизнес-логику: если reflection не сработал, вернем пустой объект.
            try {
                return clazz.getDeclaredConstructor().newInstance();
            } catch (Exception ignored) {
                return null;
            }
        }
    }

    public InvestmentCalculationRequest enrichWithDefaults(InvestmentCalculationRequest req, RealEstateObject obj) {
        try {
            Map<String, Object> attrs = parseAttributes(obj.getAttributes());
            
            String category = (obj.getCategory() != null) ? obj.getCategory().trim().toUpperCase() : "";
            
            BigDecimal price = obj.getPriceTotal() != null ? obj.getPriceTotal() : BigDecimal.ZERO;
            BigDecimal area = obj.getAreaTotal() != null && obj.getAreaTotal().compareTo(BigDecimal.ZERO) > 0 ? obj.getAreaTotal() : new BigDecimal("50");
            BigDecimal pricePerM2 = area.compareTo(BigDecimal.ZERO) > 0 ? price.divide(area, 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;

            // Calculate defaults based on category
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

            if (category.contains("КВАРТИР") || category.contains("APARTMENT")) {
                ApartmentAttrs apartmentAttrs = mapAnnotatedAttrs(attrs, ApartmentAttrs.class);
                int rooms = apartmentAttrs != null && apartmentAttrs.rooms != null ? apartmentAttrs.rooms : 1;
                String renovation = apartmentAttrs != null && apartmentAttrs.renovation != null ? apartmentAttrs.renovation : "";
                boolean hasBalcony = apartmentAttrs != null && apartmentAttrs.hasBalcony != null && apartmentAttrs.hasBalcony;
                
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
                BigDecimal minRepair = area.multiply(new BigDecimal("50"));
                if (defRepairCost.compareTo(minRepair) < 0) defRepairCost = minRepair;

                int[] rentByRooms = {0, 350, 450, 550, 700, 850};
                int rIdx = Math.min(Math.max(rooms, 1), 5);
                defMonthlyRent = new BigDecimal(rentByRooms[rIdx]);
                
                BigDecimal areaBasedRent = area.multiply(new BigDecimal("10"));
                if (defMonthlyRent.compareTo(areaBasedRent) < 0) defMonthlyRent = areaBasedRent;

                int[] dailyByRooms = {0, 35, 50, 65, 80};
                int dIdx = Math.min(Math.max(rooms, 1), 4);
                defDailyRate = new BigDecimal(dailyByRooms[dIdx]);

                if (hasBalcony) {
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
            } else if (category.contains("ДОМ") || category.contains("HOUSE")) {
                String houseType = getStringAttr(attrs, "house_type", "");
                String heating = getStringAttr(attrs, "heating_type", "Газ");

                int repairPerM2 = switch (houseType) {
                    case "Старый дом" -> 280;
                    case "Таунхаус" -> 100;
                    case "Коттедж" -> 60;
                    default -> 150;
                };
                defRepairCost = area.multiply(new BigDecimal(repairPerM2));
                BigDecimal minRepairHouse = area.multiply(new BigDecimal("50"));
                if (defRepairCost.compareTo(minRepairHouse) < 0) defRepairCost = minRepairHouse;

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
            } else if (category.contains("УЧАСТОК") || category.equals("PLOT")) {
                defAppreciationRate = new BigDecimal("5");
                defRepairCost = BigDecimal.ZERO; 
                defConstructionCost = new BigDecimal("50000");
                defExpectedSalePrice = price.add(defConstructionCost).multiply(new BigDecimal("1.3")).setScale(0, RoundingMode.HALF_UP);
                defMaintenancePct = new BigDecimal("0.5");
                defMonthlyRent = BigDecimal.ZERO;
                defFurnitureCost = BigDecimal.ZERO;
                defUtilityCost = BigDecimal.ZERO;
                defDailyRate = BigDecimal.ZERO;
            } else if (category.contains("КОММЕРЦИЯ") || category.equals("COMMERCIAL")) {
                String retailType = getStringAttr(attrs, "retail_type", "");
                int rentPerM2 = "Стрит-ритейл".equals(retailType) ? 35 : 25;
                defMonthlyRent = area.multiply(new BigDecimal(rentPerM2));
                defVacancyRate = "Стрит-ритейл".equals(retailType) ? new BigDecimal("8") : new BigDecimal("5");
                defUtilityCost = area.multiply(new BigDecimal("1.5")).setScale(0, RoundingMode.HALF_UP);
                defExpectedSalePrice = price.multiply(new BigDecimal("1.15")).setScale(0, RoundingMode.HALF_UP);
                defMaintenancePct = new BigDecimal("0.8");
                defInsuranceCost = price.multiply(new BigDecimal("0.002")).setScale(0, RoundingMode.HALF_UP);
                defRepairCost = area.multiply(new BigDecimal("70"));
            } else if (category.contains("ОФИС") || category.contains("OFFICE")) {
                String officeClass = getStringAttr(attrs, "business_center_class", "B");
                int rentPerM2 = switch (officeClass) {
                    case "A" -> 45;
                    case "B" -> 30;
                    case "C" -> 20;
                    default -> 25;
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
            } else if (category.equals("СКЛАД") || category.equals("WAREHOUSE")) {
                String whType = getStringAttr(attrs, "warehouse_type", "");
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
            } else if (category.contains("ГАРАЖ") || category.contains("GARAGE")) {
                String material = getStringAttr(attrs, "material", "Кирпичный");
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
            
            // --- GUARANTEED FALLBACK (if values are still 0) ---
            if (defMonthlyRent.compareTo(BigDecimal.ZERO) == 0 && !category.contains("УЧАСТОК")) {
                if (category.contains("КВАРТИР") || category.contains("ДОМ") || category.contains("HOUSE") || category.contains("APARTMENT")) {
                    defMonthlyRent = price.multiply(new BigDecimal("0.006")).setScale(0, RoundingMode.HALF_UP);
                } else if (category.contains("ОФИС") || category.contains("КОММЕРЦИЯ") || category.contains("OFFICE") || category.contains("COMMERCIAL")) {
                    defMonthlyRent = price.multiply(new BigDecimal("0.008")).setScale(0, RoundingMode.HALF_UP);
                } else if (category.contains("ГАРАЖ") || category.contains("GARAGE")) {
                    defMonthlyRent = new BigDecimal("70");
                }
            }

            // Renovation fallback: 5% of price if still 0
            if (defRepairCost.compareTo(BigDecimal.ZERO) <= 0 && !category.contains("УЧАСТОК")) {
                defRepairCost = price.multiply(new BigDecimal("0.05")).setScale(0, RoundingMode.HALF_UP);
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
