package com.example.backend.repositories;

import com.example.backend.entities.RealEstateObject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RealEstateObjectRepository extends JpaRepository<RealEstateObject, UUID>, JpaSpecificationExecutor<RealEstateObject> {
    List<RealEstateObject> findByUserId(UUID userId);
}
