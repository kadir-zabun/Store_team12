package org.example.onlinestorebackend.Entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Document(collection = "reviews")
public class Review {

    @Id
    private String reviewId;

    private String userId;

    private String productId;

    private String orderId;
    private Integer rating;
    private String comment;
    private Boolean approved = false;

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();
}