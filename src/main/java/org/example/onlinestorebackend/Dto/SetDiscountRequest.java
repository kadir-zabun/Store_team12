package org.example.onlinestorebackend.Dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class SetDiscountRequest {
    private List<String> productIds;
    /**
     * Percent value (e.g. 10 = 10%).
     */
    private BigDecimal discountPercent;
}


