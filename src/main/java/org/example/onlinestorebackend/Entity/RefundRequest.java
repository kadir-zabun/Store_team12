package org.example.onlinestorebackend.Entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Document(collection = "refundRequests")
public class RefundRequest {

    @Id
    private String refundId;

    private String userId;

    private String orderId;

    private String productId;

    private Integer quantity;

    private LocalDateTime requestDate;

    private LocalDateTime decisionDate;

    /**
     * PENDING, APPROVED, REJECTED
     */
    private String status;

    private Boolean approved;

    private BigDecimal refundAmount;

    private String reason;

    private String decisionNote;
}
