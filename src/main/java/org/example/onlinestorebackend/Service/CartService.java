package org.example.onlinestorebackend.Service;

import lombok.RequiredArgsConstructor;
import org.example.onlinestorebackend.Entity.Cart;
import org.example.onlinestorebackend.Entity.CartItem;
import org.example.onlinestorebackend.Entity.Product;
import org.example.onlinestorebackend.Entity.User;
import org.example.onlinestorebackend.exception.InsufficientStockException;
import org.example.onlinestorebackend.exception.ResourceNotFoundException;
import org.example.onlinestorebackend.Repository.CartRepository;
import org.example.onlinestorebackend.Repository.ProductRepository;
import org.example.onlinestorebackend.Repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CartService {

    private final CartRepository cartRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    // Helper method to get userId from username
    public String getUserIdByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));
        return user.getUserId();
    }

    // Kullanıcının cart'ını getir veya yeni oluştur
    public Cart getOrCreateCart(String userId) {
        return cartRepository.findByUserId(userId)
                .orElseGet(() -> {
                    Cart newCart = new Cart();
                    newCart.setUserId(userId);
                    newCart.setCreatedAt(LocalDateTime.now());
                    newCart.setUpdatedAt(LocalDateTime.now());
                    return cartRepository.save(newCart);
                });
    }

    // Cart'a ürün ekle
    @Transactional
    public Cart addToCart(String userId, String productId, Integer quantity) {
        // Product kontrolü
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + productId));

        // Stok kontrolü
        if (!product.getInStock() || product.getQuantity() < quantity) {
            throw new InsufficientStockException("Insufficient stock for product: " + product.getProductName());
        }

        // Cart'ı getir
        Cart cart = getOrCreateCart(userId);

        // Ürün zaten cart'ta mı?
        Optional<CartItem> existingItem = cart.getItems().stream()
                .filter(item -> item.getProductId().equals(productId))
                .findFirst();

        if (existingItem.isPresent()) {
            // Mevcut item'ın quantity'sini güncelle
            CartItem item = existingItem.get();
            int newQuantity = item.getQuantity() + quantity;

            // Yeni quantity için stok kontrolü
            if (product.getQuantity() < newQuantity) {
                throw new InsufficientStockException("Insufficient stock. Available: " + product.getQuantity());
            }

            item.setQuantity(newQuantity);
            item.calculateSubtotal();
        } else {
            // Yeni item ekle - indirimli fiyat kullan
            CartItem newItem = new CartItem();
            newItem.setProductId(product.getProductId());
            newItem.setProductName(product.getProductName());
            // İndirimli fiyatı hesapla: price - (price * discount / 100)
            // discount yüzde olarak saklanıyor (örn: 58 = %58)
            BigDecimal finalPrice = product.getPrice();
            if (product.getDiscount() != null && product.getDiscount().compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal discountAmount = product.getPrice()
                    .multiply(product.getDiscount())
                    .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
                finalPrice = product.getPrice().subtract(discountAmount);
            }
            newItem.setPrice(finalPrice);
            newItem.setQuantity(quantity);
            newItem.calculateSubtotal();

            cart.getItems().add(newItem);
        }

        // Total'i hesapla ve kaydet
        cart.calculateTotalPrice();
        cart.setUpdatedAt(LocalDateTime.now());

        return cartRepository.save(cart);
    }

    // Cart item'ın quantity'sini güncelle
    @Transactional
    public Cart updateCartItem(String userId, String productId, Integer quantity) {
        Cart cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart not found for user"));

        // Product kontrolü
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + productId));

        // Stok kontrolü
        if (product.getQuantity() < quantity) {
            throw new InsufficientStockException("Insufficient stock. Available: " + product.getQuantity());
        }

        // Cart item'ı bul
        CartItem item = cart.getItems().stream()
                .filter(i -> i.getProductId().equals(productId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Product not found in cart"));

        // Quantity'yi güncelle
        item.setQuantity(quantity);
        item.calculateSubtotal();

        // Total'i hesapla ve kaydet
        cart.calculateTotalPrice();
        cart.setUpdatedAt(LocalDateTime.now());

        return cartRepository.save(cart);
    }

    // Cart'tan ürün çıkar
    @Transactional
    public Cart removeFromCart(String userId, String productId) {
        Cart cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart not found for user"));

        boolean removed = cart.getItems().removeIf(item -> item.getProductId().equals(productId));

        if (!removed) {
            throw new ResourceNotFoundException("Product not found in cart");
        }

        // Total'i hesapla ve kaydet
        cart.calculateTotalPrice();
        cart.setUpdatedAt(LocalDateTime.now());

        return cartRepository.save(cart);
    }

    // Cart'ı temizle
    @Transactional
    public void clearCart(String userId) {
        Cart cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart not found for user"));

        cart.getItems().clear();
        cart.calculateTotalPrice();
        cart.setUpdatedAt(LocalDateTime.now());

        cartRepository.save(cart);
    }

    // Kullanıcının cart'ını getir
    public Cart getUserCart(String userId) {
        return getOrCreateCart(userId);
    }
}