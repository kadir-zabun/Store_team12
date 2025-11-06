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

    private Integer rating; // 1–5

    private String comment;

    private Boolean approved;

    private LocalDateTime createdAt;
}
