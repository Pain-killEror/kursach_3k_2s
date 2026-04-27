package com.example.backend.controllers;

import com.example.backend.config.JwtUtils;
import com.example.backend.dto.JwtResponse;
import com.example.backend.dto.LoginRequest;
import com.example.backend.entities.Status;
import com.example.backend.entities.User;
import com.example.backend.repositories.UserRepository;
import com.example.backend.services.AuthService;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173") // Настрой под свой фронтенд
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

    /**
     * Обычный логин через email и пароль
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        try {
            return ResponseEntity.ok(authService.login(loginRequest.email(), loginRequest.password()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Проверка существования email (используется фронтендом при регистрации)
     */
    @GetMapping("/check-email")
    public ResponseEntity<?> checkEmail(@RequestParam String email) {
        if (userRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Пользователь с таким email уже существует"));
        }
        return ResponseEntity.ok().build();
    }

    /**
     * Регистрация нового пользователя
     * Роль USER будет установлена принудительно внутри authService.register
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        try {
            // Если пароль не пришел (регистрация через Google), инициализируем пустой строкой
            if (user.getPasswordHash() == null) {
                user.setPasswordHash("");
            }
            return ResponseEntity.ok(authService.register(user));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Авторизация через Google
     */
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

                // Если пользователя нет, сообщаем фронтенду, что нужна дорегистрация (телефон, налоговый статус)
                if (user == null) {
                    Map<String, Object> response = new HashMap<>();
                    response.put("needsRegistration", true);
                    response.put("email", email);
                    response.put("name", name);
                    return ResponseEntity.ok(response);
                }

                // Проверка на блокировку
                if (user.getStatus() == Status.BLOCKED) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("message", "Ваш аккаунт заблокирован администратором"));
                }

                // Генерируем JWT. Роль берется из БД (у обычных пользователей там будет USER)
                String jwt = jwtUtils.generateToken(user.getEmail(), user.getRole().name());
                return ResponseEntity.ok(new JwtResponse(jwt, user));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Ошибка проверки Google токена"));
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
}