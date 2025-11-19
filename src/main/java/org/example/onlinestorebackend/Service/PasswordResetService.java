package org.example.onlinestorebackend.Service;

import org.example.onlinestorebackend.Entity.User;
import org.example.onlinestorebackend.Entity.PasswordResetToken;
import org.example.onlinestorebackend.exception.ResourceNotFoundException;
import org.example.onlinestorebackend.Repository.PasswordResetTokenRepository;
import org.example.onlinestorebackend.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

@Service
public class PasswordResetService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final MailService mailService;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.frontend-base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    public PasswordResetService(
            UserRepository userRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            MailService mailService,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.mailService = mailService;
        this.passwordEncoder = passwordEncoder;
    }

    public String requestReset(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found with email: " + email)
                );

        String token = UUID.randomUUID().toString();

        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setId(UUID.randomUUID().toString());
        resetToken.setUserId(user.getUserId());
        resetToken.setToken(token);
        resetToken.setExpiresAt(Instant.now().plus(15, ChronoUnit.MINUTES));

        passwordResetTokenRepository.save(resetToken);

        String resetLink = mailService.sendPasswordResetLink(user.getEmail(), token);
        return resetLink;
    }

    public void resetPassword(String token, String newPassword) {
        Optional<PasswordResetToken> tokenOpt = passwordResetTokenRepository
                .findByTokenAndExpiresAtAfter(token, Instant.now());

        if (tokenOpt.isEmpty()) {
            throw new ResourceNotFoundException("Invalid or expired reset token");
        }

        PasswordResetToken resetToken = tokenOpt.get();
        User user = userRepository.findById(resetToken.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        passwordResetTokenRepository.delete(resetToken);
    }
}
