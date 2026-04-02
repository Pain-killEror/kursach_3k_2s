package com.example.backend.services;

import com.example.backend.entities.RealEstateObject;
import com.example.backend.repositories.RealEstateObjectRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RealEstateObjectService {

    private final RealEstateObjectRepository repository;

    public RealEstateObjectService(RealEstateObjectRepository repository) {
        this.repository = repository;
    }

    public List<RealEstateObject> getAllObjects() {
        return repository.findAll();
    }
}
