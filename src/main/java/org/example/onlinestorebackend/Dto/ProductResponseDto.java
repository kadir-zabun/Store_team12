package org.example.onlinestorebackend.Dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductResponseDto {

    private String productId;
    private String productName;
    private Integer quantity;
    private BigDecimal price;
    private BigDecimal discount;
    private String description;
    private List<String> images;
    private Boolean inStock;
    private String categoryId;
    private String categoryName; // Category bilgisi için
}