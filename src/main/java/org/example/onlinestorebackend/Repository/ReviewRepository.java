package org.example.onlinestorebackend.Repository;

import org.example.onlinestorebackend.Entity.Review;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends MongoRepository<Review, String> {
    List<Review> findByProductId(String productId);
    List<Review> findByProductIdAndApprovedTrue(String productId);
    List<Review> findByUserId(String userId);
    List<Review> findByApprovedFalse();
    Optional<Review> findByUserIdAndProductId(String userId, String productId);
    @Query("{ 'reviewId' : ?0 }")
    Optional<Review> findByReviewId(String reviewId);
}
