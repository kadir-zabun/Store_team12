package org.example.onlinestorebackend.Dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RefundDecisionDto {
    private boolean approved;
    private String decisionNote;

    @NotBlank
    private String refundId;
}

