package com.example.backend.controllers;

import com.example.backend.config.JwtUtils;
import com.example.backend.dto.JwtResponse;
import com.example.backend.dto.LoginRequest;
import com.example.backend.entities.Role;
import com.example.backend.entities.Status;
import com.example.backend.entities.User;
import com.example.backend.repositories.UserRepository;
import com.example.backend.services.AuthService;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;
    private final JwtUtils jwtUtils;

    @Value("${google.client.id}")
    private String googleClientId;

    public AuthController(AuthService authService, UserRepository userRepository, JwtUtils jwtUtils) {
        this.authService = authService;
        this.userRepository = userRepository;
        this.jwtUtils = jwtUtils;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        return ResponseEntity.ok(authService.login(loginRequest.getEmail(), loginRequest.getPassword()));
    }

    @GetMapping("/check-email")
    public ResponseEntity<?> checkEmail(@RequestParam String email) {
        // Просто проверяем, есть ли такой email в БД
        if (userRepository.findByEmail(email).isPresent()) {
            // Если есть, кидаем ошибку 400
            return ResponseEntity.badRequest().body(Map.of("message", "Пользователь с таким email уже существует"));
        }
        // Если нет, возвращаем 200 OK
        return ResponseEntity.ok().build();
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        try {
            // Если регистрация идет после Google OAuth, пароля может не быть. Ставим пустую строку вместо null
            if (user.getPasswordHash() == null) {
                user.setPasswordHash("");
            }
            return ResponseEntity.ok(authService.register(user));
        } catch (RuntimeException e) {
            // Перехватываем ошибку о занятом email и отправляем статус 400 с текстом
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/google")
    public ResponseEntity<?> googleAuth(@RequestBody Map<String, String> request) {
        String idTokenString = request.get("token");

        GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), new GsonFactory())
                .setAudience(Collections.singletonList(googleClientId))
                .build();

        try {
            GoogleIdToken idToken = verifier.verify(idTokenString);
            if (idToken != null) {
                GoogleIdToken.Payload payload = idToken.getPayload();
                String email = payload.getEmail();
                String name = (String) payload.get("name");

                User user = userRepository.findByEmail(email).orElse(null);

                // ЕСЛИ ПОЛЬЗОВАТЕЛЬ НОВЫЙ (через Google)
                if (user == null) {
                    // Возвращаем данные на фронтенд, чтобы он запросил номер телефона и роль
                    Map<String, Object> response = new HashMap<>();
                    response.put("needsRegistration", true);
                    response.put("email", email);
                    response.put("name", name);
                    return ResponseEntity.ok(response);
                }

                // Если пользователь уже существует в базе
                if (user.getStatus() == Status.BLOCKED) {
                    return ResponseEntity.status(403).body(Map.of("message", "User is blocked"));
                }

                // Успешный вход
                String jwt = jwtUtils.generateToken(user.getEmail());
                return ResponseEntity.ok(new JwtResponse(jwt, user));
            }
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("message", "Invalid Google Token"));
        }
        return ResponseEntity.status(401).build();
    }
}