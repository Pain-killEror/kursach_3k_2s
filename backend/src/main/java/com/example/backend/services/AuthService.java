package com.example.backend.services;

import com.example.backend.entities.Role;
import com.example.backend.entities.Status;
import com.example.backend.entities.User;
import com.example.backend.repositories.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public User register(User user) {
        if (user.getRole() == null) {
            user.setRole(Role.INVESTOR);
        }
        if (user.getStatus() == null) {
            user.setStatus(Status.ACTIVE);
        }
        if (user.getCreatedAt() == null) {
            user.setCreatedAt(LocalDateTime.now());
        }
        if (user.getPasswordHash() != null) {
            user.setPasswordHash(passwordEncoder.encode(user.getPasswordHash()));
        }
        return userRepository.save(user);
    }

    public User login(String email, String password) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user != null && user.getPasswordHash() != null && passwordEncoder.matches(password, user.getPasswordHash())) {
            return user;
        }
        throw new RuntimeException("Неверный email или пароль");
    }
}
