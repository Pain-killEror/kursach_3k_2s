package com.example.backend.specifications;

import com.example.backend.entities.ObjectStatus;
import com.example.backend.entities.RealEstateObject;
import com.example.backend.entities.Status;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class RealEstateObjectSpecifications {

    public static Specification<RealEstateObject> filterBy(
            String city,
            String category,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            BigDecimal minArea,
            BigDecimal maxArea,
            ObjectStatus transactionType) {

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Обязательная фильтрация: видимость и статус пользователя (как было в findAllVisible)
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

            if (category != null && !category.isEmpty()) {
                predicates.add(cb.equal(root.get("category"), category));
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
                // Если тип сделки указан, фильтруем по objectStatus
                // УЧАСТОК обычно не имеет статуса сделки в классическом понимании, но если он указан в фильтрах,
                // мы всё равно применяем статус, если он есть.
                predicates.add(cb.equal(root.get("objectStatus"), transactionType));
            } else {
                // По умолчанию показываем только те, что в продаже или аренде (не проданные/сданные)
                // Но если пользователь хочет видеть всё, это можно изменить.
                // В оригинальном коде была логика: obj.category === 'УЧАСТОК' || obj.objectStatus === 'FOR_SALE' || obj.objectStatus === 'FOR_RENT'
                predicates.add(cb.or(
                        cb.equal(root.get("category"), "УЧАСТОК"),
                        cb.equal(root.get("objectStatus"), ObjectStatus.FOR_SALE),
                        cb.equal(root.get("objectStatus"), ObjectStatus.FOR_RENT)
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
