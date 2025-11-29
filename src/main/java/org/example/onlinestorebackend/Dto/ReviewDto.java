package org.example.onlinestorebackend.Dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ReviewDto {
    private String orderId;
    private String productId;
    private String comment;
    private int rating;
}
