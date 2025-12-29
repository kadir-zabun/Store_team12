package org.example.onlinestorebackend.Dto;

import lombok.Data;

@Data
public class RefundDecisionDto {
    private boolean approved;
    private String decisionNote;
    
    // refundId is set from path variable in controller, not from request body
    private String refundId;
}

