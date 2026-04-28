package com.example.backend.specifications;

import com.example.backend.entities.ObjectStatus;
import com.example.backend.entities.RealEstateObject;
import com.example.backend.entities.Status;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class RealEstateObjectSpecifications {

    public static Specification<RealEstateObject> filterBy(
            String city,
            List<String> categories,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            BigDecimal minArea,
            BigDecimal maxArea,
            ObjectStatus transactionType,
            String rentType,
            Map<String, String> attributes) {

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Обязательная фильтрация: видимость и статус пользователя
            predicates.add(cb.or(
                    cb.isNull(root.get("isVisible")),
                    cb.equal(root.get("isVisible"), true)
            ));

            predicates.add(cb.or(
                    cb.isNull(root.get("user")),
                    cb.notEqual(root.get("user").get("status"), Status.BLOCKED)
            ));

            // 2. Динамические фильтры
            if (city != null && !city.isEmpty()) {
                predicates.add(cb.equal(root.get("city"), city));
            }

            if (categories != null && !categories.isEmpty()) {
                predicates.add(root.get("category").in(categories));
            }

            if (minPrice != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("priceTotal"), minPrice));
            }

            if (maxPrice != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("priceTotal"), maxPrice));
            }

            if (minArea != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("areaTotal"), minArea));
            }

            if (maxArea != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("areaTotal"), maxArea));
            }

            if (transactionType != null) {
                predicates.add(cb.equal(root.get("objectStatus"), transactionType));
            } else {
                // По умолчанию показываем только те, что в продаже или аренде
                predicates.add(cb.or(
                        cb.equal(root.get("category"), "УЧАСТОК"),
                        cb.equal(root.get("objectStatus"), ObjectStatus.FOR_SALE),
                        cb.equal(root.get("objectStatus"), ObjectStatus.FOR_RENT)
                ));
            }

            // 3. Фильтрация по rentType (через JSON атрибут rent_type)
            if (rentType != null && !rentType.isEmpty()) {
                predicates.add(cb.equal(
                    cb.function("JSON_UNQUOTE", String.class, 
                        cb.function("JSON_EXTRACT", String.class, root.get("attributes"), cb.literal("$.rent_type"))),
                    rentType
                ));
            }

            // 4. Фильтрация по произвольным атрибутам
            if (attributes != null && !attributes.isEmpty()) {
                attributes.forEach((key, value) -> {
                    if (value != null && !value.isEmpty()) {
                        // Обработка диапазонов (min/max)
                        if (key.endsWith("_min")) {
                            String attrName = key.replace("_min", "");
                            predicates.add(cb.greaterThanOrEqualTo(
                                cb.function("JSON_EXTRACT", BigDecimal.class, root.get("attributes"), cb.literal("$." + attrName)),
                                new BigDecimal(value)
                            ));
                        } else if (key.endsWith("_max")) {
                            String attrName = key.replace("_max", "");
                            predicates.add(cb.lessThanOrEqualTo(
                                cb.function("JSON_EXTRACT", BigDecimal.class, root.get("attributes"), cb.literal("$." + attrName)),
                                new BigDecimal(value)
                            ));
                        } else {
                            // Обычное сравнение
                            predicates.add(cb.equal(
                                cb.function("JSON_UNQUOTE", String.class, 
                                    cb.function("JSON_EXTRACT", String.class, root.get("attributes"), cb.literal("$." + key))),
                                value
                            ));
                        }
                    }
                });
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
