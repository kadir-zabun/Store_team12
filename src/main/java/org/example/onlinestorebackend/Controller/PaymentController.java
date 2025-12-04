package org.example.onlinestorebackend.Controller;

import lombok.RequiredArgsConstructor;
import org.example.onlinestorebackend.Dto.InvoiceResponseDto;
import org.example.onlinestorebackend.Dto.PaymentRequestDto;
import org.example.onlinestorebackend.Entity.Invoice;
import org.example.onlinestorebackend.Entity.Order;
import org.example.onlinestorebackend.Entity.User;
import org.example.onlinestorebackend.Repository.InvoiceRepository;
import org.example.onlinestorebackend.Repository.UserRepository;
import org.example.onlinestorebackend.Service.InvoiceService;
import org.example.onlinestorebackend.Service.MailService;
import org.example.onlinestorebackend.Service.OrderService;
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
    private final InvoiceService invoiceService;
    private final OrderService orderService;

    // /api/payment/mock
    @PostMapping("/mock")
    public ResponseEntity<InvoiceResponseDto> mockPayment(@RequestBody PaymentRequestDto request) {

        String invoiceId = UUID.randomUUID().toString();
        LocalDateTime now = LocalDateTime.now();

        BigDecimal total = request.getAmount() != null
                ? request.getAmount()
                : BigDecimal.ZERO;

        Invoice invoiceEntity = new Invoice();
        invoiceEntity.setInvoiceId(invoiceId);
        invoiceEntity.setOrderId(request.getOrderId());
        invoiceEntity.setInvoiceDate(now);
        invoiceEntity.setPdfUrl(null);
        invoiceRepository.save(invoiceEntity);

        if (request.getUserId() != null) {
            Optional<User> userOpt = userRepository.findByUserId(request.getUserId());
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                if (user.getEmail() != null && !user.getEmail().isBlank()) {
                    try {
                        Order order = null;
                        if (request.getOrderId() != null) {
                            try {
                                order = orderService.getOrderById(request.getOrderId());
                            } catch (Exception e) {
                                // Order not found, continue without it
                            }
                        }

                        PaymentRequestDto.ItemDto[] itemsArray = request.getItems() != null
                            ? request.getItems().toArray(new PaymentRequestDto.ItemDto[0])
                            : new PaymentRequestDto.ItemDto[0];

                        byte[] pdfBytes = invoiceService.generateInvoicePdf(
                            invoiceId, order, user, total, now, itemsArray
                        );

                        System.out.println("PDF generated successfully, size: " + pdfBytes.length + " bytes");
                        mailService.sendInvoiceEmailWithPdf(user.getEmail(), invoiceId, total, now, pdfBytes);
                        System.out.println("Invoice email sent to: " + user.getEmail());
                    } catch (Exception e) {
                        System.err.println("ERROR: Failed to generate or send invoice PDF");
                        System.err.println("Error message: " + e.getMessage());
                        System.err.println("Error class: " + e.getClass().getName());
                        e.printStackTrace();
                        
                        // Try to send email without PDF as fallback
                        try {
                            System.out.println("Attempting to send email without PDF as fallback...");
                            mailService.sendInvoiceEmail(user.getEmail(), invoiceId, total, now);
                        } catch (Exception e2) {
                            System.err.println("ERROR: Failed to send fallback email: " + e2.getMessage());
                            e2.printStackTrace();
                        }
                    }
                }
            }
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
