// src/main/java/.../Repository/PasswordResetTokenRepository.java
package org.example.onlinestorebackend.Repository;

import org.example.onlinestorebackend.Entity.PasswordResetToken;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.Optional;

public interface PasswordResetTokenRepository
        extends MongoRepository<PasswordResetToken, String> {

    Optional<PasswordResetToken> findByTokenAndExpiresAtAfter(String token, Instant now);
}
