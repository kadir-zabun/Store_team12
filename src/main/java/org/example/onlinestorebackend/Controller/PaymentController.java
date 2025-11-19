package org.example.onlinestorebackend.Controller;

import org.example.onlinestorebackend.Dto.InvoiceResponseDto;
import org.example.onlinestorebackend.Dto.PaymentRequestDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/payment")
public class PaymentController {

    // /api/payment/mock
    @PostMapping("/mock")
    public ResponseEntity<InvoiceResponseDto> mockPayment(@RequestBody PaymentRequestDto request) {

        String invoiceId = UUID.randomUUID().toString();
        LocalDateTime now = LocalDateTime.now();

        BigDecimal total = request.getAmount() != null
                ? request.getAmount()
                : BigDecimal.ZERO;

        InvoiceResponseDto invoice = new InvoiceResponseDto(
                invoiceId,
                now,
                total,
                request.getItems()
        );

        return ResponseEntity.ok(invoice);
    }
}
