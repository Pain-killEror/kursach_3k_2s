package com.example.backend.repositories;

import com.example.backend.entities.Role;
import com.example.backend.entities.Status;
import com.example.backend.entities.User;
import com.example.backend.entities.enums.EntityType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
class UserRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    @Test
    void findByEmail_Success() {
        // Arrange
        User user = new User();
        user.setEmail("integration@test.com");
        user.setPasswordHash("hash");
        user.setName("Test User");
        user.setRole(Role.USER);
        user.setStatus(Status.ACTIVE);
        user.setEntityType(EntityType.INDIVIDUAL);
        user.setCreatedAt(LocalDateTime.now());
        
        userRepository.save(user);

        // Act
        Optional<User> foundUser = userRepository.findByEmail("integration@test.com");

        // Assert
        assertTrue(foundUser.isPresent());
        assertEquals("Test User", foundUser.get().getName());
        assertEquals(Role.USER, foundUser.get().getRole());
    }

    @Test
    void findByEmail_NotFound() {
        // Act
        Optional<User> foundUser = userRepository.findByEmail("nonexistent@test.com");

        // Assert
        assertFalse(foundUser.isPresent());
    }
}
