package com.example.backend.controllers;

import com.example.backend.entities.RealEstateObject;
import com.example.backend.services.RealEstateObjectService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/objects")
public class RealEstateObjectController {

    private final RealEstateObjectService service;

    public RealEstateObjectController(RealEstateObjectService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<RealEstateObject>> getAllObjects() {
        return ResponseEntity.ok(service.getAllObjects());
    }
}
