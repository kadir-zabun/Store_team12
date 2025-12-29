package org.example.onlinestorebackend.Entity;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class OrderItem {

    private String productId;
    private String productName;
    private Integer quantity;
    private BigDecimal priceAtPurchase;
    /**
     * Unit cost captured at purchase time for profit calculations.
     * If null for legacy orders, services may fallback to 50% of priceAtPurchase.
     */
    private BigDecimal costAtPurchase;
    /**
     * Product image URL captured at purchase time.
     * First image from product.images list, or null if no images available.
     */
    private String imageUrl;

}