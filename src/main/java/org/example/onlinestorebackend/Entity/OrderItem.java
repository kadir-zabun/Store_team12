package org.example.onlinestorebackend.Entity;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class OrderItem {

    private String productId;
    private String productName;
    private Integer quantity;
    private BigDecimal priceAtPurchase;

}