package com.example.backend.services;

import com.example.backend.config.JwtUtils;
import com.example.backend.dto.JwtResponse;
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
    private final JwtUtils jwtUtils;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtils jwtUtils) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtils = jwtUtils;
    }

    public JwtResponse login(String email, String password) {
        User user = userRepository.findByEmail(email).orElse(null);
        
        // 1. Если пользователя вообще нет в базе -> ругаемся на ПОЧТУ
        if (user == null) {
            throw new RuntimeException("Пользователь с таким email не найден");
        }

        // 2. Проверка на GOOGLE АККАУНТ -> ругаемся ОБЩЕЙ ошибкой сверху
        if (user.getPasswordHash() == null || user.getPasswordHash().isEmpty()) {
            throw new RuntimeException("Этот аккаунт привязан к Google. Пожалуйста, используйте кнопку 'Вход через Google' ниже.");
        }

        // 3. Обычная проверка пароля
        if (passwordEncoder.matches(password, user.getPasswordHash())) {
            String token = jwtUtils.generateToken(user.getEmail());
            return new JwtResponse(token, user);
        }
        
        // 4. Если пароль не подошел -> ругаемся на ПАРОЛЬ
        throw new RuntimeException("Неверный пароль");
    }

    public User register(User user) {
        // Защита от дублей
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            throw new RuntimeException("Пользователь с таким email уже существует");
        }

        // Если роль не передали с фронтенда, ставим инвестора по умолчанию (страховка)
        if (user.getRole() == null) {
            user.setRole(Role.INVESTOR);
        }
        if (user.getStatus() == null) {
            user.setStatus(Status.ACTIVE);
        }
        if (user.getCreatedAt() == null) {
            user.setCreatedAt(LocalDateTime.now());
        }
        
        // Хешируем пароль, если он не пустой. Для Google регистрации он будет пустой строкой ""
        if (user.getPasswordHash() != null && !user.getPasswordHash().isEmpty()) {
            user.setPasswordHash(passwordEncoder.encode(user.getPasswordHash()));
        }

        return userRepository.save(user);
    }
}