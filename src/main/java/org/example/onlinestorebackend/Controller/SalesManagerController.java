package org.example.onlinestorebackend.Controller;

import lombok.RequiredArgsConstructor;
import org.example.onlinestorebackend.Dto.SalesMetricResponse;
import org.example.onlinestorebackend.Dto.SetDiscountRequest;
import org.example.onlinestorebackend.Dto.SetPriceRequest;
import org.example.onlinestorebackend.Entity.Invoice;
import org.example.onlinestorebackend.Entity.Product;
import org.example.onlinestorebackend.Entity.RefundRequest;
import org.example.onlinestorebackend.Repository.InvoiceRepository;
import org.example.onlinestorebackend.Dto.RefundDecisionDto;
import org.example.onlinestorebackend.Service.SalesManagerService;
import org.example.onlinestorebackend.Service.RefundService;
import org.example.onlinestorebackend.exception.ResourceNotFoundException;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/sales")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SALES_MANAGER')")
public class SalesManagerController {

    private final SalesManagerService salesManagerService;
    private final InvoiceRepository invoiceRepository;
    private final RefundService refundService;

    @PutMapping("/products/discount")
    public ResponseEntity<List<Product>> setDiscount(@RequestBody SetDiscountRequest request) {
        return ResponseEntity.ok(
                salesManagerService.setDiscount(request.getProductIds(), request.getDiscountPercent())
        );
    }

    @PutMapping("/products/price")
    public ResponseEntity<Product> setPrice(@RequestBody SetPriceRequest request) {
        return ResponseEntity.ok(
                salesManagerService.setPrice(request.getProductId(), request.getPrice())
        );
    }

    @GetMapping("/invoices")
    public ResponseEntity<List<Invoice>> getInvoices(
            @RequestParam("from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam("to") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to
    ) {
        return ResponseEntity.ok(salesManagerService.getInvoices(from, to));
    }

    @GetMapping("/invoices/{invoiceId}/pdf")
    public ResponseEntity<byte[]> getInvoicePdf(@PathVariable String invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found: " + invoiceId));

        byte[] pdfBytes = invoice.getPdfBytes();
        if (pdfBytes == null || pdfBytes.length == 0) {
            return ResponseEntity.status(404).build();
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("inline", "invoice_" + invoiceId + ".pdf");
        headers.setContentLength(pdfBytes.length);
        return ResponseEntity.ok().headers(headers).body(pdfBytes);
    }

    @GetMapping("/metrics")
    public ResponseEntity<SalesMetricResponse> getMetrics(
            @RequestParam("from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam("to") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to
    ) {
        return ResponseEntity.ok(salesManagerService.getMetrics(from, to));
    }

    @GetMapping("/refunds/pending")
    public ResponseEntity<List<RefundRequest>> getPendingRefunds() {
        return ResponseEntity.ok(refundService.getPendingRefunds());
    }

    @PutMapping("/refunds/{refundId}/decision")
    public ResponseEntity<RefundRequest> decideRefund(
            @PathVariable String refundId,
            @RequestBody @Valid RefundDecisionDto dto) {
        dto.setRefundId(refundId);
        return ResponseEntity.ok(refundService.decideRefund(dto));
    }
}


