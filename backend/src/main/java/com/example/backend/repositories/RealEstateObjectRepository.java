package com.example.backend.repositories;

import com.example.backend.entities.RealEstateObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RealEstateObjectRepository extends JpaRepository<RealEstateObject, UUID>, JpaSpecificationExecutor<RealEstateObject> {
    List<RealEstateObject> findByUserId(UUID userId);

    @Query("SELECT r FROM RealEstateObject r WHERE (r.isVisible IS NULL OR r.isVisible = true) " +
           "AND (r.user IS NULL OR r.user.status != com.example.backend.entities.Status.BLOCKED)")
    Page<RealEstateObject> findAllVisible(Pageable pageable);
}
