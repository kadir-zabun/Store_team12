package org.example.onlinestorebackend.Dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceWithOrderDto {
    private String invoiceId;
    private String orderId;
    private LocalDateTime invoiceDate;
    private String customerId;
    private String customerName;
    private String customerEmail;
    private BigDecimal totalAmount;
    private LocalDateTime orderDate;
}

