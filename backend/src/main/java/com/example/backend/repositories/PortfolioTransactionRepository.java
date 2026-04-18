package com.example.backend.repositories;

import com.example.backend.entities.PortfolioTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PortfolioTransactionRepository extends JpaRepository<PortfolioTransaction, UUID> {
    List<PortfolioTransaction> findAllByPortfolioItemIdOrderByTransactionDateDesc(UUID portfolioItemId);
}