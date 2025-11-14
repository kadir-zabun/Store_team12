package org.example.onlinestorebackend.Dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
public class InvoiceResponseDto {

    private String invoiceId;
    private LocalDateTime createdAt;
    private BigDecimal totalAmount;
    private List<PaymentRequestDto.ItemDto> items;
}
