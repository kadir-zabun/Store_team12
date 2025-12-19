package org.example.onlinestorebackend.Dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.example.onlinestorebackend.Entity.Cart;
import org.example.onlinestorebackend.Entity.Delivery;
import org.example.onlinestorebackend.Entity.Order;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SupportContextDto {

    private UserProfile user;
    private Cart cart;
    private List<Order> orders = new ArrayList<>();
    private List<Delivery> deliveries = new ArrayList<>();
    private List<String> wishListProductIds = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserProfile {
        private String userId;
        private String username;
        private String name;
        private String email;
        private String role;
    }
}