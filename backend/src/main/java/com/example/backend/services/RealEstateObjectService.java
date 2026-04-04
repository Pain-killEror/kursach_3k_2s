package com.example.backend.services;

import com.example.backend.entities.RealEstateObject;
import com.example.backend.repositories.RealEstateObjectRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class RealEstateObjectService {

    private final RealEstateObjectRepository repository;

    public RealEstateObjectService(RealEstateObjectRepository repository) {
        this.repository = repository;
    }

    public List<RealEstateObject> getAllObjects() {
        return repository.findAll();
    }

    public RealEstateObject getObjectById(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Объект не найден с ID: " + id));
    }
}
