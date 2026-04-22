package com.example.backend.services;

import com.example.backend.config.JwtUtils;
import com.example.backend.dto.JwtResponse;
import com.example.backend.entities.Role;
import com.example.backend.entities.Status;
import com.example.backend.entities.User;
import com.example.backend.repositories.UserRepository;
import com.example.backend.entities.enums.EntityType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtils jwtUtils;

    @InjectMocks
    private AuthService authService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setEmail("test@test.com");
        testUser.setPasswordHash("hashed_password");
        testUser.setRole(Role.USER);
        testUser.setStatus(Status.ACTIVE);
        testUser.setEntityType(EntityType.INDIVIDUAL);
    }

    @Test
    void login_Success() {
        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("password", "hashed_password")).thenReturn(true);
        when(jwtUtils.generateToken("test@test.com", "USER")).thenReturn("mocked_jwt_token");

        JwtResponse response = authService.login("test@test.com", "password");

        assertNotNull(response);
        assertEquals("mocked_jwt_token", response.getToken());
        assertEquals(testUser, response.getUser());
    }

    @Test
    void login_UserNotFound() {
        when(userRepository.findByEmail("notfound@test.com")).thenReturn(Optional.empty());

        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            authService.login("notfound@test.com", "password");
        });

        assertEquals("Пользователь с таким email не найден", exception.getMessage());
    }

    @Test
    void login_GoogleAccountWithoutPassword() {
        testUser.setPasswordHash(null);
        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(testUser));

        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            authService.login("test@test.com", "password");
        });

        assertTrue(exception.getMessage().contains("Этот аккаунт привязан к Google"));
    }

    @Test
    void login_WrongPassword() {
        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("wrong_password", "hashed_password")).thenReturn(false);

        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            authService.login("test@test.com", "wrong_password");
        });

        assertEquals("Неверный пароль", exception.getMessage());
    }

    @Test
    void login_BlockedUser() {
        testUser.setStatus(Status.BLOCKED);
        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("password", "hashed_password")).thenReturn(true);

        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            authService.login("test@test.com", "password");
        });

        assertEquals("Ваш аккаунт заблокирован администратором", exception.getMessage());
    }

    @Test
    void register_Success() {
        User newUser = new User();
        newUser.setEmail("new@test.com");
        newUser.setPasswordHash("raw_password");

        when(userRepository.findByEmail("new@test.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("raw_password")).thenReturn("encoded_password");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User registeredUser = authService.register(newUser);

        assertNotNull(registeredUser);
        assertEquals(Role.USER, registeredUser.getRole());
        assertEquals(Status.ACTIVE, registeredUser.getStatus());
        assertEquals(EntityType.INDIVIDUAL, registeredUser.getEntityType());
        assertEquals("encoded_password", registeredUser.getPasswordHash());
        assertNotNull(registeredUser.getCreatedAt());
        
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    void register_EmailAlreadyExists() {
        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(testUser));

        User duplicateUser = new User();
        duplicateUser.setEmail("test@test.com");

        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            authService.register(duplicateUser);
        });

        assertEquals("Пользователь с таким email уже существует", exception.getMessage());
        verify(userRepository, never()).save(any(User.class));
    }
}
