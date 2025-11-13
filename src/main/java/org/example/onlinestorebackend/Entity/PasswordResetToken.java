package org.example.onlinestorebackend.Entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.Data;

import java.time.Instant;

@Entity
@Data
public class PasswordResetToken {

    @Id
    private String id;          // veya ObjectId / Long, projede ne kullanıyorsanız

    private String userId;      // reset isteğini yapan kullanıcının id'si
    private String token;       // ŞİFRE SIFIRLAMA TOKENI
    private Instant expiresAt;  // ne zamana kadar geçerli
}
