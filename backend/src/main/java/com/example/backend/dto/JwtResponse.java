package com.example.backend.dto;

import com.example.backend.entities.User;

public class JwtResponse {
    private String token;
    private User user;

    public JwtResponse(String token, User user) {
        this.token = token;
        this.user = user;
    }

    // Геттеры и сеттеры
    public String getToken() { return token; }
    public User getUser() { return user; }
}