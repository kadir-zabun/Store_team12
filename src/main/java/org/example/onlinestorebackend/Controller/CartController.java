package org.example.onlinestorebackend.Controller;

import lombok.RequiredArgsConstructor;
import org.example.onlinestorebackend.Dto.AddToCartRequest;
import org.example.onlinestorebackend.Dto.UpdateCartItemRequest;
import org.example.onlinestorebackend.Entity.Cart;
import org.example.onlinestorebackend.Service.CartService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    // Kullanıcının cart'ını getir
    @GetMapping("/{userId}")
    public ResponseEntity<Cart> getUserCart(@PathVariable String userId) {
        Cart cart = cartService.getUserCart(userId);
        return ResponseEntity.ok(cart);
    }

    // Cart'a ürün ekle
    @PostMapping("/{userId}/items")
    public ResponseEntity<Cart> addToCart(
            @PathVariable String userId,
            @Valid @RequestBody AddToCartRequest request) {
        Cart cart = cartService.addToCart(userId, request.getProductId(), request.getQuantity());
        return ResponseEntity.status(HttpStatus.CREATED).body(cart);
    }

    // Cart item'ı güncelle
    @PutMapping("/{userId}/items/{productId}")
    public ResponseEntity<Cart> updateCartItem(
            @PathVariable String userId,
            @PathVariable String productId,
            @Valid @RequestBody UpdateCartItemRequest request) {
        Cart cart = cartService.updateCartItem(userId, productId, request.getQuantity());
        return ResponseEntity.ok(cart);
    }

    // Cart'tan ürün çıkar
    @DeleteMapping("/{userId}/items/{productId}")
    public ResponseEntity<Cart> removeFromCart(
            @PathVariable String userId,
            @PathVariable String productId) {
        Cart cart = cartService.removeFromCart(userId, productId);
        return ResponseEntity.ok(cart);
    }

    // Cart'ı temizle
    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> clearCart(@PathVariable String userId) {
        cartService.clearCart(userId);
        return ResponseEntity.noContent().build();
    }
}