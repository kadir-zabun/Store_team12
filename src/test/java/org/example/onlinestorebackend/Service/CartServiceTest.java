package org.example.onlinestorebackend.Service;

import org.example.onlinestorebackend.Entity.Cart;
import org.example.onlinestorebackend.Entity.CartItem;
import org.example.onlinestorebackend.Entity.Product;
import org.example.onlinestorebackend.exception.InsufficientStockException;
import org.example.onlinestorebackend.exception.ResourceNotFoundException;
import org.example.onlinestorebackend.Repository.CartRepository;
import org.example.onlinestorebackend.Repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CartServiceTest {

    @Mock
    private CartRepository cartRepository;

    @Mock
    private ProductRepository productRepository;

    @InjectMocks
    private CartService cartService;

    private String userId;
    private Product product;
    private Cart cart;
    private CartItem cartItem;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID().toString();

        product = new Product();
        product.setProductId(UUID.randomUUID().toString());
        product.setProductName("Test Product");
        product.setPrice(new BigDecimal("99.99"));
        product.setQuantity(10);
        product.setInStock(true);

        cart = new Cart();
        cart.setCartId(UUID.randomUUID().toString());
        cart.setUserId(userId);
        cart.setItems(new ArrayList<>());
        cart.setTotalPrice(BigDecimal.ZERO);
        cart.setCreatedAt(LocalDateTime.now());
        cart.setUpdatedAt(LocalDateTime.now());

        cartItem = new CartItem();
        cartItem.setProductId(product.getProductId());
        cartItem.setProductName(product.getProductName());
        cartItem.setPrice(product.getPrice());
        cartItem.setQuantity(2);
        cartItem.calculateSubtotal();
    }

    @Test
    void getOrCreateCart_existingCart_returnsCart() {
        // Given
        when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));

        // When
        Cart result = cartService.getOrCreateCart(userId);

        // Then
        assertNotNull(result);
        assertEquals(cart.getCartId(), result.getCartId());
        verify(cartRepository).findByUserId(userId);
        verify(cartRepository, never()).save(any(Cart.class));
    }

    @Test
    void getOrCreateCart_nonExistingCart_createsNewCart() {
        // Given
        when(cartRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(cartRepository.save(any(Cart.class))).thenAnswer(invocation -> {
            Cart newCart = invocation.getArgument(0);
            newCart.setCartId(UUID.randomUUID().toString());
            return newCart;
        });

        // When
        Cart result = cartService.getOrCreateCart(userId);

        // Then
        assertNotNull(result);
        assertEquals(userId, result.getUserId());
        assertNotNull(result.getCreatedAt());
        verify(cartRepository).findByUserId(userId);
        verify(cartRepository).save(any(Cart.class));
    }

    @Test
    void addToCart_newProduct_addsToCart() {
        // Given
        Integer quantity = 2;
        when(productRepository.findById(product.getProductId())).thenReturn(Optional.of(product));
        when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
        when(cartRepository.save(any(Cart.class))).thenReturn(cart);

        // When
        Cart result = cartService.addToCart(userId, product.getProductId(), quantity);

        // Then
        assertNotNull(result);
        assertEquals(1, result.getItems().size());
        assertEquals(quantity, result.getItems().get(0).getQuantity());
        verify(productRepository).findById(product.getProductId());
        verify(cartRepository).save(any(Cart.class));
    }

    @Test
    void addToCart_insufficientStock_throwsInsufficientStockException() {
        // Given
        Integer quantity = 20; // More than available stock (10)
        when(productRepository.findById(product.getProductId())).thenReturn(Optional.of(product));

        // When & Then
        InsufficientStockException exception = assertThrows(InsufficientStockException.class, () -> {
            cartService.addToCart(userId, product.getProductId(), quantity);
        });

        assertTrue(exception.getMessage().contains("Insufficient stock"));
        verify(cartRepository, never()).save(any(Cart.class));
    }

    @Test
    void addToCart_existingProduct_updatesQuantity() {
        // Given
        cart.getItems().add(cartItem);
        Integer additionalQuantity = 3;
        when(productRepository.findById(product.getProductId())).thenReturn(Optional.of(product));
        when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
        when(cartRepository.save(any(Cart.class))).thenReturn(cart);

        // When
        Cart result = cartService.addToCart(userId, product.getProductId(), additionalQuantity);

        // Then
        assertNotNull(result);
        assertEquals(1, result.getItems().size());
        assertEquals(5, result.getItems().get(0).getQuantity()); // 2 + 3
        verify(cartRepository).save(any(Cart.class));
    }

    @Test
    void updateCartItem_validProduct_updatesQuantity() {
        // Given
        Integer newQuantity = 5;
        cart.getItems().add(cartItem);
        when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
        when(productRepository.findById(product.getProductId())).thenReturn(Optional.of(product));
        when(cartRepository.save(any(Cart.class))).thenReturn(cart);

        // When
        Cart result = cartService.updateCartItem(userId, product.getProductId(), newQuantity);

        // Then
        assertNotNull(result);
        assertEquals(newQuantity, result.getItems().get(0).getQuantity());
        verify(cartRepository).save(any(Cart.class));
    }

    @Test
    void updateCartItem_insufficientStock_throwsInsufficientStockException() {
        // Given
        Integer newQuantity = 20; // More than available stock
        cart.getItems().add(cartItem);
        when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
        when(productRepository.findById(product.getProductId())).thenReturn(Optional.of(product));

        // When & Then
        InsufficientStockException exception = assertThrows(InsufficientStockException.class, () -> {
            cartService.updateCartItem(userId, product.getProductId(), newQuantity);
        });

        assertTrue(exception.getMessage().contains("Insufficient stock"));
        verify(cartRepository, never()).save(any(Cart.class));
    }

    @Test
    void removeFromCart_validProduct_removesFromCart() {
        // Given
        cart.getItems().add(cartItem);
        when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
        when(cartRepository.save(any(Cart.class))).thenReturn(cart);

        // When
        Cart result = cartService.removeFromCart(userId, product.getProductId());

        // Then
        assertNotNull(result);
        assertTrue(result.getItems().isEmpty());
        verify(cartRepository).save(any(Cart.class));
    }

    @Test
    void removeFromCart_productNotFound_throwsResourceNotFoundException() {
        // Given
        when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));

        // When & Then
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> {
            cartService.removeFromCart(userId, product.getProductId());
        });

        assertTrue(exception.getMessage().contains("Product not found in cart"));
        verify(cartRepository, never()).save(any(Cart.class));
    }

    @Test
    void clearCart_validCart_clearsAllItems() {
        // Given
        cart.getItems().add(cartItem);
        when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
        when(cartRepository.save(any(Cart.class))).thenReturn(cart);

        // When
        cartService.clearCart(userId);

        // Then
        assertTrue(cart.getItems().isEmpty());
        verify(cartRepository).save(any(Cart.class));
    }

    @Test
    void clearCart_cartNotFound_throwsResourceNotFoundException() {
        // Given
        when(cartRepository.findByUserId(userId)).thenReturn(Optional.empty());

        // When & Then
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> {
            cartService.clearCart(userId);
        });

        assertTrue(exception.getMessage().contains("Cart not found"));
        verify(cartRepository, never()).save(any(Cart.class));
    }
}

