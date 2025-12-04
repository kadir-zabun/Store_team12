package org.example.onlinestorebackend.Dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class PaymentRequestDto {

    // Ödeme yapan kullanıcının ID'si (fatura maili için)
    private String userId;

    // Ödeme ilişkilendirilecek sipariş ID'si (opsiyonel)
    private String orderId;

    private BigDecimal amount;
    private List<ItemDto> items;

    @Data
    public static class ItemDto {
        private String productId;
        private Integer quantity;
        private BigDecimal price;   // istersen frontend doldurur, istersen boş bırak
    }
}
