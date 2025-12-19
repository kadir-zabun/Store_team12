package org.example.onlinestorebackend.Dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class SetPriceRequest {
    private String productId;
    private BigDecimal price;
}


