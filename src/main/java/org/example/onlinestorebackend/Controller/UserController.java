package org.example.onlinestorebackend.Controller;

import lombok.Data;
import org.example.onlinestorebackend.Dto.ReviewDto;
import org.example.onlinestorebackend.Entity.User;
import org.example.onlinestorebackend.Service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(path = "/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/find")
    public ResponseEntity<User> findByUsernameOrEmail(@RequestParam String input) {
        return userService.findByUsernameOrEmail(input)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/userId-by-username")
    public ResponseEntity<String> getUserIdByUsername(@RequestParam String username) {
        try {
            String userId = userService.getUserIdByUsername(username);
            return ResponseEntity.ok(userId);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/{userId}/username")
    public ResponseEntity<String> getUsernameByUserId(@PathVariable String userId) {
        try {
            String username = userService.getUsernameByUserId(userId);
            return ResponseEntity.ok(username);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/userId-by-email")
    public ResponseEntity<String> getUserIdByEmail(@RequestParam String email) {
        try {
            String userId = userService.getUserIdByEmail(email);
            return ResponseEntity.ok(userId);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/{userId}/email")
    public ResponseEntity<String> getEmailByUserId(@PathVariable String userId) {
        try {
            String email = userService.getEmailByUserId(userId);
            return ResponseEntity.ok(email);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/create-review")
    public ResponseEntity<String> createReview(@RequestBody ReviewDto reviewDto, Authentication authentication) {
        if (authentication == null || authentication.getName() == null)
            throw new IllegalArgumentException("Auth missing");

        String result = userService.createReview(authentication.getName(), reviewDto);

        return ResponseEntity.ok(result);
    }

    @GetMapping("/my-reviews")
    public ResponseEntity<List<ReviewDto>> getMyReviews(Authentication authentication) {
        if (authentication == null || authentication.getName() == null)
            throw new IllegalArgumentException("Auth missing");

        List<ReviewDto> reviews = userService.getUserReviews(authentication.getName());
        return ResponseEntity.ok(reviews);
    }

    @PostMapping("/save-card")
    public ResponseEntity<String> saveCard(@RequestBody CardInfoDto cardInfo, Authentication authentication) {
        if (authentication == null || authentication.getName() == null)
            throw new IllegalArgumentException("Auth missing");

        userService.saveCardInfo(authentication.getName(), cardInfo);
        return ResponseEntity.ok("Card information saved successfully");
    }

    @GetMapping("/my-card")
    public ResponseEntity<CardInfoDto> getMyCard(Authentication authentication) {
        if (authentication == null || authentication.getName() == null)
            throw new IllegalArgumentException("Auth missing");

        CardInfoDto cardInfo = userService.getCardInfo(authentication.getName());
        return ResponseEntity.ok(cardInfo);
    }

    @Data
    public static class CardInfoDto {
        private String cardNumber;
        private String cardHolderName;
        private String expiryDate;
    }
}
