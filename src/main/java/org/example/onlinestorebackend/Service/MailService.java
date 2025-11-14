// src/main/java/.../Service/MailService.java
package org.example.onlinestorebackend.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.Nullable;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Slf4j
//@Service  simdilik aktif değil buildde sorun çıkarıyor
@RequiredArgsConstructor
public class MailService {

    @Nullable
    private final JavaMailSender mailSender; // prod'da bean olur; dev'de null olabilir

    @Value("${app.frontend-base-url:http://localhost:3000}")
    private String frontendBaseUrl;

    public void sendPasswordResetLink(String email, String token) {
        String link = frontendBaseUrl + "/reset-password?token=" +
                URLEncoder.encode(token, StandardCharsets.UTF_8);

        if (mailSender == null) {
            log.info("[DEV] Password reset link for {} -> {}", email, link);
            return;
        }

        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setTo(email);
        msg.setSubject("Reset your password");
        msg.setText("Click to reset: " + link + "\nThis link expires soon.");
        mailSender.send(msg);
    }
}
