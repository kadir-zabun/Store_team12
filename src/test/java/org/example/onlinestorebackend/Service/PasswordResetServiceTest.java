package org.example.onlinestorebackend.Service;

import org.example.onlinestorebackend.Entity.PasswordResetToken;
import org.example.onlinestorebackend.Entity.User;
import org.example.onlinestorebackend.exception.ResourceNotFoundException;
import org.example.onlinestorebackend.Repository.PasswordResetTokenRepository;
import org.example.onlinestorebackend.Repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Mock
    private MailService mailService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private PasswordResetService passwordResetService;

    private User user;
    private String email;
    private String token;
    private PasswordResetToken resetToken;

    @BeforeEach
    void setUp() {
        email = "test@example.com";
        token = UUID.randomUUID().toString();

        user = new User();
        user.setUserId(UUID.randomUUID().toString());
        user.setEmail(email);
        user.setUsername("testuser");
        user.setPassword("oldEncodedPassword");

        resetToken = new PasswordResetToken();
        resetToken.setId(UUID.randomUUID().toString());
        resetToken.setUserId(user.getUserId());
        resetToken.setToken(token);
        resetToken.setExpiresAt(Instant.now().plusSeconds(900)); // 15 minutes

        ReflectionTestUtils.setField(passwordResetService, "frontendBaseUrl", "http://localhost:5173");
    }

    @Test
    void requestReset_validEmail_returnsResetLink() {
        // Given
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));
        when(passwordResetTokenRepository.save(any(PasswordResetToken.class))).thenAnswer(invocation -> {
            PasswordResetToken token = invocation.getArgument(0);
            return token;
        });
        when(mailService.sendPasswordResetLink(eq(email), anyString())).thenReturn("http://localhost:5173/reset-password?token=" + token);

        // When
        String result = passwordResetService.requestReset(email);

        // Then
        assertNotNull(result);
        assertTrue(result.contains("reset-password"));
        verify(userRepository).findByEmail(email);
        verify(passwordResetTokenRepository).save(any(PasswordResetToken.class));
        verify(mailService).sendPasswordResetLink(eq(email), anyString());
    }

    @Test
    void requestReset_invalidEmail_throwsResourceNotFoundException() {
        // Given
        String invalidEmail = "nonexistent@example.com";
        when(userRepository.findByEmail(invalidEmail)).thenReturn(Optional.empty());

        // When & Then
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> {
            passwordResetService.requestReset(invalidEmail);
        });

        assertTrue(exception.getMessage().contains("User not found"));
        verify(passwordResetTokenRepository, never()).save(any(PasswordResetToken.class));
        verify(mailService, never()).sendPasswordResetLink(anyString(), anyString());
    }

    @Test
    void resetPassword_validToken_resetsPassword() {
        // Given
        String newPassword = "newPassword123";
        when(passwordResetTokenRepository.findByTokenAndExpiresAtAfter(eq(token), any(Instant.class)))
                .thenReturn(Optional.of(resetToken));
        when(userRepository.findById(user.getUserId())).thenReturn(Optional.of(user));
        when(passwordEncoder.encode(newPassword)).thenReturn("newEncodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(user);

        // When
        passwordResetService.resetPassword(token, newPassword);

        // Then
        verify(passwordResetTokenRepository).findByTokenAndExpiresAtAfter(eq(token), any(Instant.class));
        verify(userRepository).findById(user.getUserId());
        verify(passwordEncoder).encode(newPassword);
        verify(userRepository).save(any(User.class));
        verify(passwordResetTokenRepository).delete(resetToken);
    }

    @Test
    void resetPassword_invalidToken_throwsResourceNotFoundException() {
        // Given
        String invalidToken = "invalid-token";
        String newPassword = "newPassword123";
        when(passwordResetTokenRepository.findByTokenAndExpiresAtAfter(eq(invalidToken), any(Instant.class)))
                .thenReturn(Optional.empty());

        // When & Then
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> {
            passwordResetService.resetPassword(invalidToken, newPassword);
        });

        assertTrue(exception.getMessage().contains("Invalid or expired reset token"));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void resetPassword_expiredToken_throwsResourceNotFoundException() {
        // Given
        String newPassword = "newPassword123";
        resetToken.setExpiresAt(Instant.now().minusSeconds(60)); // Expired
        when(passwordResetTokenRepository.findByTokenAndExpiresAtAfter(eq(token), any(Instant.class)))
                .thenReturn(Optional.empty());

        // When & Then
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> {
            passwordResetService.resetPassword(token, newPassword);
        });

        assertTrue(exception.getMessage().contains("Invalid or expired reset token"));
        verify(userRepository, never()).save(any(User.class));
    }
}

