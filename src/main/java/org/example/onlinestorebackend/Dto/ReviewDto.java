package org.example.onlinestorebackend.Dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ReviewDto {
    // İstek sırasında kullanılan alanlar
    private String orderId;
    private String productId;
    private String comment;
    private int rating;

    // Cevap (response) tarafında dönecek ekstra alanlar
    private String reviewId;
    private String userId;
    private Boolean approved;
}
