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
import org.example.onlinestorebackend.exception.ResourceNotFoundException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
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

    @PostMapping("/mock")
    public ResponseEntity<InvoiceResponseDto> mockPayment(@RequestBody PaymentRequestDto request) {

        // 1) MOCK BANKA ONAYI (şimdilik hep success)
        boolean paymentApproved = true;
        if (!paymentApproved) {
            throw new RuntimeException("Mock payment failed");
        }

        // 2) ORDER BUL / OLUŞTUR
        Order order = null;

        if (request.getOrderId() != null) {
            try {
                order = orderService.getOrderById(request.getOrderId());
            } catch (ResourceNotFoundException e) {
                order = null; // yoksa null bırak
            }
        } else if (request.getUserId() != null) {
            // orderId yoksa sepete göre yeni order yarat
            order = orderService.createOrderFromCart(request.getUserId());
            request.setOrderId(order.getOrderId());
        }

        // 3) TOTAL HESABI (amount boşsa order.totalPrice kullan)
        BigDecimal total;
        if (request.getAmount() != null) {
            total = request.getAmount();
        } else if (order != null && order.getTotalPrice() != null) {
            total = BigDecimal.valueOf(order.getTotalPrice());
        } else {
            total = BigDecimal.ZERO;
        }

        // 4) KART BİLGİLERİNİ KAYDET (eğer saveCard true ise)
        if (request.getSaveCard() != null && request.getSaveCard() && request.getUserId() != null) {
            try {
                Optional<User> userOpt = userRepository.findByUserId(request.getUserId());
                if (userOpt.isPresent()) {
                    User user = userOpt.get();
                    if (request.getCardNumber() != null && !request.getCardNumber().trim().isEmpty()) {
                        user.setCardNumber(request.getCardNumber());
                    }
                    if (request.getCardHolderName() != null && !request.getCardHolderName().trim().isEmpty()) {
                        user.setCardHolderName(request.getCardHolderName());
                    }
                    if (request.getExpiryDate() != null && !request.getExpiryDate().trim().isEmpty()) {
                        user.setExpiryDate(request.getExpiryDate());
                    }
                    userRepository.save(user);
                }
            } catch (Exception e) {
                System.err.println("Failed to save card information: " + e.getMessage());
            }
        }

        // 5) INVOICE ENTITY'Yİ KAYDET
        String invoiceId = UUID.randomUUID().toString();
        LocalDateTime now = LocalDateTime.now();

        Invoice invoiceEntity = new Invoice();
        invoiceEntity.setInvoiceId(invoiceId);
        invoiceEntity.setOrderId(request.getOrderId());
        invoiceEntity.setInvoiceDate(now);
        invoiceEntity.setPdfUrl(null);
        invoiceEntity.setPdfBytes(null); // İlk başta null, sonra generate edilince kaydedilecek

        // 6) USER + MAIL (PDF'li / PDFsiz) ve PDF'yi DB'ye kaydet
        byte[] pdfBytes = null;
        if (request.getUserId() != null) {
            Optional<User> userOpt = userRepository.findByUserId(request.getUserId());
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                if (user.getEmail() != null && !user.getEmail().isBlank()) {
                    try {
                        PaymentRequestDto.ItemDto[] itemsArray =
                                request.getItems() != null
                                        ? request.getItems().toArray(new PaymentRequestDto.ItemDto[0])
                                        : new PaymentRequestDto.ItemDto[0];

                        pdfBytes = invoiceService.generateInvoicePdf(
                                invoiceId, order, user, total, now, itemsArray
                        );

                        // PDF'yi Invoice entity'ye kaydet
                        invoiceEntity.setPdfBytes(pdfBytes);
                        System.out.println("PDF generated successfully, size: " + pdfBytes.length + " bytes");
                        
                        mailService.sendInvoiceEmailWithPdf(user.getEmail(), invoiceId, total, now, pdfBytes);
                        System.out.println("Invoice email sent to: " + user.getEmail());
                    } catch (Exception e) {
                        System.err.println("ERROR: Failed to generate or send invoice PDF");
                        e.printStackTrace();

                        // fallback: PDFsiz mail
                        try {
                            System.out.println("Attempting to send email without PDF as fallback...");
                            mailService.sendInvoiceEmail(user.getEmail(), invoiceId, total, now);
                        } catch (Exception e2) {
                            System.err.println("ERROR: Failed to send fallback email: " + e2.getMessage());
                            e2.printStackTrace();
                        }
                    }
                } else {
                    // Email yoksa bile PDF'yi generate edip kaydet
                    try {
                        PaymentRequestDto.ItemDto[] itemsArray =
                                request.getItems() != null
                                        ? request.getItems().toArray(new PaymentRequestDto.ItemDto[0])
                                        : new PaymentRequestDto.ItemDto[0];

                        pdfBytes = invoiceService.generateInvoicePdf(
                                invoiceId, order, userOpt.get(), total, now, itemsArray
                        );
                        invoiceEntity.setPdfBytes(pdfBytes);
                        System.out.println("PDF generated and saved to invoice (no email sent), size: " + pdfBytes.length + " bytes");
                    } catch (Exception e) {
                        System.err.println("ERROR: Failed to generate PDF for invoice");
                        e.printStackTrace();
                    }
                }
            }
        }
        
        // Invoice'ı kaydet (PDF ile birlikte)
        invoiceRepository.save(invoiceEntity);

        // 7) EKRANDA GÖSTERİLECEK DTO
        InvoiceResponseDto invoice = new InvoiceResponseDto(
                invoiceId,
                now,
                total,
                request.getItems()
        );

        return ResponseEntity.ok(invoice);
    }

    @GetMapping("/invoice/{orderId}/pdf")
    public ResponseEntity<byte[]> getInvoicePdf(@PathVariable String orderId,
                                                @AuthenticationPrincipal UserDetails userDetails) {
        try {
            Order order = orderService.getOrderById(orderId);
            
            String username = userDetails != null ? userDetails.getUsername() : null;
            if (username == null) {
                return ResponseEntity.status(401).build();
            }
            
            String userId = orderService.getUserIdByUsername(username);
            
            if (order.getCustomerId() == null || !order.getCustomerId().equals(userId)) {
                return ResponseEntity.status(403).build();
            }
            
            Invoice invoice = invoiceRepository.findByOrderId(orderId);
            byte[] pdfBytes = null;
            String invoiceId = orderId;
            LocalDateTime invoiceDate = order.getOrderDate();
            
            if (invoice != null) {
                invoiceId = invoice.getInvoiceId();
                invoiceDate = invoice.getInvoiceDate() != null ? invoice.getInvoiceDate() : order.getOrderDate();
                if (invoice.getPdfBytes() != null && invoice.getPdfBytes().length > 0) {
                    pdfBytes = invoice.getPdfBytes();
                }
            }
            
            if (pdfBytes == null || pdfBytes.length == 0) {
                Optional<User> userOpt = userRepository.findByUserId(userId);
                if (userOpt.isEmpty()) {
                    return ResponseEntity.status(404).build();
                }
                
                User user = userOpt.get();
                BigDecimal totalAmount = BigDecimal.valueOf(order.getTotalPrice() != null ? order.getTotalPrice() : 0);
                
                PaymentRequestDto.ItemDto[] itemsArray = new PaymentRequestDto.ItemDto[0];
                if (order.getItems() != null && !order.getItems().isEmpty()) {
                    itemsArray = order.getItems().stream()
                            .filter(item -> item != null && item.getProductId() != null)
                            .map(item -> {
                                PaymentRequestDto.ItemDto dto = new PaymentRequestDto.ItemDto();
                                dto.setProductId(item.getProductId());
                                dto.setQuantity(item.getQuantity() != null ? item.getQuantity() : 0);
                                dto.setPrice(item.getPriceAtPurchase() != null ? item.getPriceAtPurchase() : BigDecimal.ZERO);
                                return dto;
                            })
                            .toArray(PaymentRequestDto.ItemDto[]::new);
                }
                
                pdfBytes = invoiceService.generateInvoicePdf(
                        invoiceId, order, user, totalAmount, invoiceDate, itemsArray
                );
                
                if (pdfBytes == null || pdfBytes.length == 0) {
                    return ResponseEntity.status(500).build();
                }
                
                if (invoice == null) {
                    invoice = new Invoice();
                    invoice.setInvoiceId(invoiceId);
                    invoice.setOrderId(orderId);
                    invoice.setInvoiceDate(invoiceDate);
                }
                invoice.setPdfBytes(pdfBytes);
                invoiceRepository.save(invoice);
            }
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("inline", "invoice_" + invoiceId + ".pdf");
            headers.setContentLength(pdfBytes.length);
            
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(pdfBytes);
                    
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(404).build();
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }
}
