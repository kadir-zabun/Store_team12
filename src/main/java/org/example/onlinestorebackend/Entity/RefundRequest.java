package org.example.onlinestorebackend.Entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Document(collection = "refundRequests")
public class RefundRequest {

    @Id
    private String refundId;

    private String userId;

    private String productId;

    private LocalDateTime requestDate;

    private Boolean approved;

    private Double refundAmount;

    private String reason;
}
