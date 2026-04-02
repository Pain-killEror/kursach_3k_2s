package com.example.backend.repositories;

import com.example.backend.entities.RealEstateObject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface RealEstateObjectRepository extends JpaRepository<RealEstateObject, UUID> {
}
