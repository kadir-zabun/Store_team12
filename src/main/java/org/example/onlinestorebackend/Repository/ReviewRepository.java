package org.example.onlinestorebackend.Repository;

import org.example.onlinestorebackend.Entity.Review;
import org.example.onlinestorebackend.Entity.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import javax.sound.sampled.ReverbType;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends MongoRepository<Review, String> {
    List<Review> findByProductId(String productId);
    List<Review> findByProductIdAndApprovedTrue(String productId);
    List<Review> findByUserId(String userId);
    List<Review> findByApprovedFalse(); // onay bekleyenler
    @Query("{ 'reviewId' : ?0 }")
    Optional<Review> findByReviewId(String reviewId);
}
