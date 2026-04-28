package com.example.backend.services;

import com.example.backend.config.JwtUtils;
import com.example.backend.dto.JwtResponse;
import com.example.backend.entities.Role;
import com.example.backend.entities.Status;
import com.example.backend.entities.User;
import com.example.backend.repositories.UserRepository;
import com.example.backend.entities.enums.EntityType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtils jwtUtils) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtils = jwtUtils;
    }

    public JwtResponse login(String email, String password) {
        User user = userRepository.findByEmail(email).orElse(null);
        
        if (user == null) {
            throw new RuntimeException("Пользователь с таким email не найден");
        }

        if (user.getPasswordHash() == null || user.getPasswordHash().isEmpty()) {
            throw new RuntimeException("Этот аккаунт привязан к Google. Пожалуйста, используйте кнопку 'Вход через Google' ниже.");
        }

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new RuntimeException("Неверный пароль");
        }

        if (user.getStatus() == Status.BLOCKED) {
            throw new RuntimeException("Ваш аккаунт заблокирован администратором");
        }

        String token = jwtUtils.generateToken(user.getEmail(), user.getRole().name());
        return new JwtResponse(token, user);
    }

    public User register(User user) {
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            throw new RuntimeException("Пользователь с таким email уже существует");
        }

        user.setRole(Role.USER);
        
        if (user.getEntityType() == null) {
            user.setEntityType(EntityType.INDIVIDUAL);
        }

        if (user.getStatus() == null) {
            user.setStatus(Status.ACTIVE);
        }

        if (user.getCreatedAt() == null) {
            user.setCreatedAt(LocalDateTime.now());
        }
        
        if (user.getPasswordHash() != null && !user.getPasswordHash().isEmpty()) {
            user.setPasswordHash(passwordEncoder.encode(user.getPasswordHash()));
        }

        if (user.getPhoneNumber() != null && !user.getPhoneNumber().isEmpty()) {
            String digits = user.getPhoneNumber().replaceAll("\\D", "");
            if (digits.length() < 8 || digits.length() > 15) {
                throw new RuntimeException("Номер телефона должен содержать от 8 до 15 цифр");
            }
        }

        return userRepository.save(user);
    }
}