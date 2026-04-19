package com.example.backend.entities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public enum ObjectStatus {
    FOR_SALE,   
    FOR_RENT,   
    SOLD,       
    RENTED      
}