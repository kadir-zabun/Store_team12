package org.example.onlinestorebackend.Controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.onlinestorebackend.Dto.AddToCartRequest;
import org.example.onlinestorebackend.Dto.CartResponseDto;
import org.example.onlinestorebackend.Dto.UpdateCartItemRequest;
import org.example.onlinestorebackend.Entity.Cart;
import org.example.onlinestorebackend.Service.CartService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    // Kullanıcının cart'ını getir (JWT'den userId alınır)
    @GetMapping
    public ResponseEntity<CartResponseDto> getMyCart(
            @AuthenticationPrincipal UserDetails userDetails) {

        String userId = userDetails.getUsername(); // JWT'den username = userId
        Cart cart = cartService.getUserCart(userId);
        CartResponseDto response = convertToDto(cart);

        return ResponseEntity.ok(response);
    }

    // Cart'a ürün ekle (JWT'den userId alınır)
    @PostMapping("/add")
    public ResponseEntity<CartResponseDto> addToCart(
            @Valid @RequestBody AddToCartRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        String userId = userDetails.getUsername();
        Cart cart = cartService.addToCart(userId, request.getProductId(), request.getQuantity());
        CartResponseDto response = convertToDto(cart);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // Cart item'ı güncelle (JWT'den userId alınır)
    @PutMapping("/update/{productId}")
    public ResponseEntity<CartResponseDto> updateCartItem(
            @PathVariable String productId,
            @Valid @RequestBody UpdateCartItemRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        String userId = userDetails.getUsername();
        Cart cart = cartService.updateCartItem(userId, productId, request.getQuantity());
        CartResponseDto response = convertToDto(cart);

        return ResponseEntity.ok(response);
    }

    // Cart'tan ürün çıkar (JWT'den userId alınır)
    @DeleteMapping("/remove/{productId}")
    public ResponseEntity<CartResponseDto> removeFromCart(
            @PathVariable String productId,
            @AuthenticationPrincipal UserDetails userDetails) {

        String userId = userDetails.getUsername();
        Cart cart = cartService.removeFromCart(userId, productId);
        CartResponseDto response = convertToDto(cart);

        return ResponseEntity.ok(response);
    }

    // Cart'ı temizle (JWT'den userId alınır)
    @DeleteMapping("/clear")
    public ResponseEntity<Void> clearCart(
            @AuthenticationPrincipal UserDetails userDetails) {

        String userId = userDetails.getUsername();
        cartService.clearCart(userId);

        return ResponseEntity.noContent().build();
    }

    // Entity -> DTO dönüşümü
    private CartResponseDto convertToDto(Cart cart) {
        return CartResponseDto.builder()
                .cartId(cart.getCartId())
                .userId(cart.getUserId())
                .items(cart.getItems().stream()
                        .map(item -> CartResponseDto.CartItemDto.builder()
                                .productId(item.getProductId())
                                .productName(item.getProductName())
                                .price(item.getPrice())
                                .quantity(item.getQuantity())
                                .subtotal(item.getSubtotal())
                                .build())
                        .toList())
                .totalPrice(cart.getTotalPrice())
                .createdAt(cart.getCreatedAt())
                .updatedAt(cart.getUpdatedAt())
                .build();
    }
}