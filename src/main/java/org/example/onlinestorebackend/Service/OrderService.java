package org.example.onlinestorebackend.Service;

import lombok.RequiredArgsConstructor;
import org.example.onlinestorebackend.Dto.CreateOrderRequest;
import org.example.onlinestorebackend.Entity.Cart;
import org.example.onlinestorebackend.Entity.CartItem;
import org.example.onlinestorebackend.Entity.Order;
import org.example.onlinestorebackend.Entity.OrderItem;
import org.example.onlinestorebackend.Entity.Product;
import org.example.onlinestorebackend.Repository.CartRepository;
import org.example.onlinestorebackend.Repository.OrderRepository;
import org.example.onlinestorebackend.Repository.ProductRepository;
import org.example.onlinestorebackend.Repository.UserRepository;
import org.example.onlinestorebackend.Repository.DeliveryRepository;
import org.example.onlinestorebackend.Entity.User;
import org.example.onlinestorebackend.Entity.Delivery;
import org.example.onlinestorebackend.exception.InsufficientStockException;
import org.example.onlinestorebackend.exception.InvalidRequestException;
import org.example.onlinestorebackend.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final CartRepository cartRepository;
    private final UserRepository userRepository;
    private final DeliveryRepository deliveryRepository;

    @Transactional
    public Order createOrder(CreateOrderRequest request) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new InvalidRequestException("Order must contain at least one item");
        }

        List<OrderItem> orderItems = new ArrayList<>();
        BigDecimal totalPrice = BigDecimal.ZERO;

        for (CreateOrderRequest.OrderItemRequest itemRequest : request.getItems()) {
            Product product = productRepository.findById(itemRequest.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + itemRequest.getProductId()));

            validateStock(product, itemRequest.getQuantity());
            decreaseStock(product, itemRequest.getQuantity());

            OrderItem orderItem = new OrderItem();
            orderItem.setProductId(product.getProductId());
            orderItem.setProductName(product.getProductName());
            orderItem.setQuantity(itemRequest.getQuantity());
            // İndirimli fiyatı hesapla: price - (price * discount / 100)
            // discount yüzde olarak saklanıyor (örn: 58 = %58)
            BigDecimal finalPrice = product.getPrice();
            if (product.getDiscount() != null && product.getDiscount().compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal discountAmount = product.getPrice()
                    .multiply(product.getDiscount())
                    .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
                finalPrice = product.getPrice().subtract(discountAmount);
            }
            orderItem.setPriceAtPurchase(finalPrice);

            orderItems.add(orderItem);

            BigDecimal itemTotal = finalPrice.multiply(BigDecimal.valueOf(itemRequest.getQuantity()));
            totalPrice = totalPrice.add(itemTotal);
        }

        Order order = new Order();
        order.setCustomerId(request.getCustomerId());
        order.setItems(orderItems);
        order.setOrderDate(LocalDateTime.now());
        order.setStatus("PROCESSING");
        order.setTotalPrice(totalPrice.doubleValue());

        return orderRepository.save(order);
    }

    @Transactional
    public Order createOrderFromCart(String customerId) {
        Cart cart = cartRepository.findByUserId(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart not found for user: " + customerId));

        if (cart.getItems() == null || cart.getItems().isEmpty()) {
            throw new InvalidRequestException("Cart is empty, cannot create order");
        }

        List<OrderItem> orderItems = new ArrayList<>();
        BigDecimal totalPrice = BigDecimal.ZERO;

        for (CartItem cartItem : cart.getItems()) {
            Product product = productRepository.findById(cartItem.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + cartItem.getProductId()));

            validateStock(product, cartItem.getQuantity());
            decreaseStock(product, cartItem.getQuantity());

            OrderItem orderItem = new OrderItem();
            orderItem.setProductId(cartItem.getProductId());
            orderItem.setProductName(product.getProductName());
            orderItem.setQuantity(cartItem.getQuantity());
            orderItem.setPriceAtPurchase(cartItem.getPrice());

            orderItems.add(orderItem);

            if (cartItem.getSubtotal() != null) {
                totalPrice = totalPrice.add(cartItem.getSubtotal());
            } else if (cartItem.getPrice() != null && cartItem.getQuantity() != null) {
                totalPrice = totalPrice.add(cartItem.getPrice().multiply(BigDecimal.valueOf(cartItem.getQuantity())));
            }
        }

        Order order = new Order();
        order.setOrderId(UUID.randomUUID().toString());
        order.setCustomerId(customerId);
        order.setItems(orderItems);
        order.setOrderDate(LocalDateTime.now());
        order.setStatus("PROCESSING");
        order.setTotalPrice(totalPrice.doubleValue());

        Order savedOrder = orderRepository.save(order);

        for (OrderItem item : orderItems) {
            Delivery delivery = new Delivery();
            delivery.setDeliveryId(UUID.randomUUID().toString());
            delivery.setOrderId(savedOrder.getOrderId());
            delivery.setCustomerId(customerId);
            delivery.setProductId(item.getProductId());
            delivery.setQuantity(item.getQuantity());
            delivery.setTotalPrice(item.getPriceAtPurchase().multiply(BigDecimal.valueOf(item.getQuantity())).doubleValue());
            delivery.setCompleted(false);
            deliveryRepository.save(delivery);
        }

        cart.getItems().clear();
        cart.setTotalPrice(BigDecimal.ZERO);
        cart.setUpdatedAt(LocalDateTime.now());
        cartRepository.save(cart);

        return savedOrder;
    }

    public Order getOrderById(String orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));
    }

    public List<Order> getOrdersByCustomer(String customerId) {
        return orderRepository.findByCustomerId(customerId);
    }

    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    public List<Order> getOrdersByStatus(String status) {
        return orderRepository.findByStatus(status);
    }

    public List<Order> getDeliveredOrdersByCustomer(String customerId) {
        List<Order> allOrders = orderRepository.findByCustomerId(customerId);
        return allOrders.stream()
                .filter(order -> "DELIVERED".equals(order.getStatus()))
                .collect(java.util.stream.Collectors.toList());
    }

    // Get orders for a product owner (only orders containing their products)
    public List<Order> getOrdersByOwner(String ownerUsername, String status) {
        User owner = userRepository.findByUsername(ownerUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + ownerUsername));
        String ownerId = owner.getUserId();

        List<Product> ownerProducts = productRepository.findByOwnerId(ownerId);
        Set<String> ownerProductIds = ownerProducts.stream()
                .map(Product::getProductId)
                .collect(Collectors.toSet());

        if (ownerProductIds.isEmpty()) {
            return new ArrayList<>();
        }

        List<Order> allOrders = status != null
                ? orderRepository.findByStatus(status)
                : orderRepository.findAll();

        return allOrders.stream()
                .filter(order -> {
                    if (order.getItems() == null || order.getItems().isEmpty()) {
                        return false;
                    }
                    return order.getItems().stream()
                            .anyMatch(item -> ownerProductIds.contains(item.getProductId()));
                })
                .collect(Collectors.toList());
    }

    public String getUserIdByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));
        return user.getUserId();
    }

    @Transactional
    public Order updateOrderStatus(String orderId, String status) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));
        order.setStatus(status);
        return orderRepository.save(order);
    }

    private void validateStock(Product product, Integer requestedQuantity) {
        if (requestedQuantity == null || requestedQuantity <= 0) {
            throw new InvalidRequestException("Quantity must be greater than zero");
        }

        if (product.getQuantity() == null || product.getQuantity() < requestedQuantity) {
            throw new InsufficientStockException("Insufficient stock for product: " + product.getProductName());
        }

        if (!Boolean.TRUE.equals(product.getInStock())) {
            throw new InsufficientStockException("Product is not available: " + product.getProductName());
        }
    }

    private void decreaseStock(Product product, Integer quantity) {
        product.setQuantity(product.getQuantity() - quantity);
        product.setInStock(product.getQuantity() > 0);

        // Popülariteyi arttır (satılan adet kadar)
        Integer currentPopularity = product.getPopularity() != null ? product.getPopularity() : 0;
        product.setPopularity(currentPopularity + (quantity != null ? quantity : 0));

        productRepository.save(product);
    }
}


