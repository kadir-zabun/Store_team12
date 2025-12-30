package org.example.onlinestorebackend.Service;

import org.example.onlinestorebackend.Dto.ReviewDto;
import org.example.onlinestorebackend.Dto.ProfileResponseDto;
import org.example.onlinestorebackend.Entity.Order;
import org.example.onlinestorebackend.Entity.OrderItem;
import org.example.onlinestorebackend.Entity.Review;
import org.example.onlinestorebackend.Entity.User;
import org.example.onlinestorebackend.Repository.OrderRepository;
import org.example.onlinestorebackend.Repository.ReviewRepository;
import org.example.onlinestorebackend.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private OrderRepository orderRepository;
    @Autowired
    private ReviewRepository reviewRepository;

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public Optional<User> findByUsernameOrEmail(String usernameOrEmail) {
        return userRepository.findByUsername(usernameOrEmail)
                .or(() -> userRepository.findByEmail(usernameOrEmail));
    }

    public ProfileResponseDto getMyProfile(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found with username: " + username));
        return ProfileResponseDto.builder()
                .name(user.getName())
                .email(user.getEmail())
                .homeAddress(user.getHomeAddress())
                .build();
    }

    public String getUsernameByUserId(String userId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("User not found with userID: " + userId));
        return user.getUsername();
    }

    public String getUserIdByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found with username: " + username));
        return user.getUserId(); // Assuming the ID is of type String
    }

    public String getUserIdByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + email));
        return user.getUserId(); // Assuming the ID is of type String
    }

    public String getEmailByUserId(String userId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("User not found with userID: " + userId));
        return user.getEmail(); // Assuming the ID is of type String
    }

    public String createReview(String userId, ReviewDto dto) {
        Order order = orderRepository.findByOrderId(dto.getOrderId())
                .orElseThrow(() -> new RuntimeException("Order not found with orderId: " + dto.getOrderId()));

        String orderStatus = order.getStatus();

        if (!orderStatus.equals("DELIVERED")) {
            return "You cannot make comment or give rating before the order is delivered.";
        }

        List<OrderItem> products = order.getItems();
        List<String> productIds = new ArrayList<>();

        for (OrderItem product : products) {
            productIds.add(product.getProductId());
        }

        if (!productIds.contains(dto.getProductId())) {
            return "Your order does not contain this product.";
        }

        if (dto.getRating() < 1 || dto.getRating() > 10) {
            return "Rating must be between 1 and 10.";
        }

        Optional<Review> existingReviewOpt = reviewRepository.findByUserIdAndProductId(userId, dto.getProductId());

        Review review;
        if (existingReviewOpt.isPresent()) {
            review = existingReviewOpt.get();
            review.setUpdatedAt(LocalDateTime.now());
        } else {
            review = new Review();
            review.setReviewId(UUID.randomUUID().toString());
            review.setUserId(userId);
            review.setProductId(dto.getProductId());
            review.setCreatedAt(LocalDateTime.now());
            review.setUpdatedAt(LocalDateTime.now());
        }

        review.setOrderId(dto.getOrderId());
        review.setRating(dto.getRating());
        
        if (dto.getComment() != null && !dto.getComment().trim().isEmpty()) {
            review.setComment(dto.getComment().trim());
            review.setApproved(false);
        }

        reviewRepository.save(review);
        
        String message = "Your review has been submitted. ";
        if (review.getRating() != null && review.getRating() > 0) {
            message += "Rating is visible immediately. ";
        }
        if (review.getComment() != null && !review.getComment().trim().isEmpty()) {
            message += "Comment will be visible after approval.";
        }
        
        return message;
    }

    public List<ReviewDto> getUserReviews(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
        String userId = user.getUserId();
        
        List<Review> reviews = reviewRepository.findByUserId(userId);
        return reviews.stream()
                .map(review -> {
                    ReviewDto dto = new ReviewDto();
                    dto.setReviewId(review.getReviewId());
                    dto.setProductId(review.getProductId());
                    dto.setOrderId(review.getOrderId());
                    dto.setUserId(review.getUserId());
                    dto.setRating(review.getRating() != null ? review.getRating() : 0);
                    dto.setComment(review.getComment());
                    dto.setApproved(review.getApproved());
                    return dto;
                })
                .collect(java.util.stream.Collectors.toList());
    }

    public void saveCardInfo(String username, org.example.onlinestorebackend.Controller.UserController.CardInfoDto cardInfo) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
        
        user.setCardNumber(cardInfo.getCardNumber());
        user.setCardHolderName(cardInfo.getCardHolderName());
        user.setExpiryDate(cardInfo.getExpiryDate());
        
        userRepository.save(user);
    }

    public org.example.onlinestorebackend.Controller.UserController.CardInfoDto getCardInfo(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
        
        org.example.onlinestorebackend.Controller.UserController.CardInfoDto cardInfo = 
                new org.example.onlinestorebackend.Controller.UserController.CardInfoDto();
        cardInfo.setCardNumber(user.getCardNumber());
        cardInfo.setCardHolderName(user.getCardHolderName());
        cardInfo.setExpiryDate(user.getExpiryDate());
        
        return cardInfo;
    }
}