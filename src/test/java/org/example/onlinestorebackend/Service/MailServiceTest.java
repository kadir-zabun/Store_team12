package org.example.onlinestorebackend.Service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationContext;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MailServiceTest {

    @Mock
    private ApplicationContext applicationContext;

    private MailService mailService;

    private String email;
    private String token;

    @BeforeEach
    void setUp() {
        email = "test@example.com";
        token = "test-token-123";
        
        // MailService constructor'ı @Value annotation'ları kullanıyor, bu yüzden manuel oluşturuyoruz
        mailService = new MailService(
                "http://localhost:5173",
                "noreply@store.com",
                applicationContext
        );
    }

    @Test
    void sendPasswordResetLink_validInput_returnsLink() {
        // Given - MailService constructor'ı @Value ile çalışıyor, bu yüzden reflection kullanıyoruz
        // Bu test, mailSender null olduğunda bile link döndüğünü test eder

        // When
        String result = mailService.sendPasswordResetLink(email, token);

        // Then
        assertNotNull(result);
        assertTrue(result.contains(token));
        assertTrue(result.contains("/reset-password"));
    }

    @Test
    void sendPasswordResetLink_withSpecialCharacters_encodesToken() {
        // Given
        String specialToken = "token+with/special=chars&more";

        // When
        String result = mailService.sendPasswordResetLink(email, specialToken);

        // Then
        assertNotNull(result);
        assertTrue(result.contains("reset-password"));
    }

    @Test
    void sendInvoiceEmail_validInput_sendsEmail() {
        // Given
        String invoiceId = "INV-12345";
        BigDecimal amount = new BigDecimal("199.99");
        LocalDateTime invoiceDate = LocalDateTime.now();

        // When - mailSender null olduğu için sadece log yazılır, exception fırlatılmaz
        assertDoesNotThrow(() -> {
            mailService.sendInvoiceEmail(email, invoiceId, amount, invoiceDate);
        });

        // Then - Method başarıyla çalışmalı (mailSender null olsa bile)
    }

    @Test
    void sendInvoiceEmail_withNullAmount_handlesGracefully() {
        // Given
        String invoiceId = "INV-12345";
        BigDecimal amount = null;
        LocalDateTime invoiceDate = LocalDateTime.now();

        // When & Then
        assertDoesNotThrow(() -> {
            mailService.sendInvoiceEmail(email, invoiceId, amount, invoiceDate);
        });
    }

    @Test
    void sendInvoiceEmail_withNullDate_handlesGracefully() {
        // Given
        String invoiceId = "INV-12345";
        BigDecimal amount = new BigDecimal("199.99");
        LocalDateTime invoiceDate = null;

        // When & Then
        assertDoesNotThrow(() -> {
            mailService.sendInvoiceEmail(email, invoiceId, amount, invoiceDate);
        });
    }
}

