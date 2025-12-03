package org.example.onlinestorebackend.Controller;

import lombok.RequiredArgsConstructor;
import org.example.onlinestorebackend.Dto.InvoiceResponseDto;
import org.example.onlinestorebackend.Dto.PaymentRequestDto;
import org.example.onlinestorebackend.Entity.Invoice;
import org.example.onlinestorebackend.Entity.User;
import org.example.onlinestorebackend.Repository.InvoiceRepository;
import org.example.onlinestorebackend.Repository.UserRepository;
import org.example.onlinestorebackend.Service.MailService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
public class PaymentController {

    private final InvoiceRepository invoiceRepository;
    private final UserRepository userRepository;
    private final MailService mailService;

    // /api/payment/mock
    @PostMapping("/mock")
    public ResponseEntity<InvoiceResponseDto> mockPayment(@RequestBody PaymentRequestDto request) {

        String invoiceId = UUID.randomUUID().toString();
        LocalDateTime now = LocalDateTime.now();

        BigDecimal total = request.getAmount() != null
                ? request.getAmount()
                : BigDecimal.ZERO;

        // Invoice kaydını oluştur
        Invoice invoiceEntity = new Invoice();
        invoiceEntity.setInvoiceId(invoiceId);
        invoiceEntity.setOrderId(request.getOrderId());
        invoiceEntity.setInvoiceDate(now);
        invoiceEntity.setPdfUrl(null); // Gerçek PDF yok, mock
        invoiceRepository.save(invoiceEntity);

        // Kullanıcıya mock fatura maili gönder
        if (request.getUserId() != null) {
            Optional<User> userOpt = userRepository.findByUserId(request.getUserId());
            userOpt.ifPresent(user -> {
                if (user.getEmail() != null && !user.getEmail().isBlank()) {
                    mailService.sendInvoiceEmail(user.getEmail(), invoiceId, total, now);
                }
            });
        }

        // Ekranda gösterilecek invoice DTO
        InvoiceResponseDto invoice = new InvoiceResponseDto(
                invoiceId,
                now,
                total,
                request.getItems()
        );

        return ResponseEntity.ok(invoice);
    }
}
