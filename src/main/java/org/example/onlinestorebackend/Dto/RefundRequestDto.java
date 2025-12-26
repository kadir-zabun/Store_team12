package org.example.onlinestorebackend.Dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RefundRequestDto {
    @NotBlank
    private String orderId;

    @NotBlank
    private String productId;

    @NotNull
    @Min(1)
    private Integer quantity;

    private String reason;
}

