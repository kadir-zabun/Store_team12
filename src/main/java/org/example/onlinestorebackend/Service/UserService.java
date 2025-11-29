package org.example.onlinestorebackend.Service;

import org.example.onlinestorebackend.Dto.ReviewDto;
import org.example.onlinestorebackend.Entity.Order;
import org.example.onlinestorebackend.Entity.OrderItem;
import org.example.onlinestorebackend.Entity.Review;
import org.example.onlinestorebackend.Entity.User;
import org.example.onlinestorebackend.Repository.OrderRepository;
import org.example.onlinestorebackend.Repository.ReviewRepository;
import org.example.onlinestorebackend.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

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

        String isDelivered = order.getStatus();

        if (!isDelivered.equals("DELIVERED")) {
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

        Review review = new Review();
        review.setReviewId(UUID.randomUUID().toString());
        review.setUserId(userId);
        review.setRating(dto.getRating());
        review.setComment(dto.getComment());
        review.setProductId(dto.getProductId());

        reviewRepository.save(review);

        return "Your review has been created.";
    }
}
