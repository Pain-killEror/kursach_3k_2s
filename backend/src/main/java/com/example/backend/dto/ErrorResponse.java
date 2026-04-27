package com.example.backend.dto;

public record ErrorResponse(String message, int status, long timestamp) {
}
