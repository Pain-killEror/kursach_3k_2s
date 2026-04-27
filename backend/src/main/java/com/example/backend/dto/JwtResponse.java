package com.example.backend.dto;

import com.example.backend.entities.User;

public record JwtResponse(String token, User user) {
}