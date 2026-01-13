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
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

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

        // Müşteri adresini çek (teslimat kaydında kullanılacak)
        User customer = userRepository.findByUserId(request.getCustomerId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + request.getCustomerId()));
        String deliveryAddress = customer.getHomeAddress();

        List<OrderItem> orderItems = new ArrayList<>();
        BigDecimal totalPrice = BigDecimal.ZERO;

        for (CreateOrderRequest.OrderItemRequest itemRequest : request.getItems()) {
            Product product = productRepository.findById(itemRequest.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Product not found with id: " + itemRequest.getProductId()));

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
            // costAtPurchase: product.cost varsa onu kullan, yoksa finalPrice * 0.5
            BigDecimal unitCost = product.getCost() != null
                    ? product.getCost()
                    : finalPrice.multiply(BigDecimal.valueOf(0.5)).setScale(2, RoundingMode.HALF_UP);
            orderItem.setCostAtPurchase(unitCost);
            // Set product image URL (first image if available)
            if (product.getImages() != null && !product.getImages().isEmpty()) {
                orderItem.setImageUrl(product.getImages().get(0));
            }

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

        Order savedOrder = orderRepository.save(order);

        // Teslimat kayıtlarını oluştur (adres dahil)
        for (OrderItem item : orderItems) {
            Delivery delivery = new Delivery();
            delivery.setDeliveryId(UUID.randomUUID().toString());
            delivery.setOrderId(savedOrder.getOrderId());
            delivery.setCustomerId(savedOrder.getCustomerId());
            delivery.setProductId(item.getProductId());
            delivery.setQuantity(item.getQuantity());
            delivery.setTotalPrice(
                    item.getPriceAtPurchase().multiply(BigDecimal.valueOf(item.getQuantity())).doubleValue());
            delivery.setDeliveryAddress(deliveryAddress);
            delivery.setCompleted(false);
            deliveryRepository.save(delivery);
        }

        return savedOrder;
    }

    @Transactional
    public Order createOrderFromCart(String customerId, String shippingAddress) {
        Cart cart = cartRepository.findByUserId(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart not found for user: " + customerId));

        if (cart.getItems() == null || cart.getItems().isEmpty()) {
            throw new InvalidRequestException("Cart is empty, cannot create order");
        }

        // Use provided shippingAddress or fallback to user's homeAddress
        String deliveryAddress = shippingAddress;
        if (deliveryAddress == null || deliveryAddress.trim().isEmpty()) {
            User customer = userRepository.findByUserId(customerId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found: " + customerId));
            deliveryAddress = customer.getHomeAddress();
        }

        List<OrderItem> orderItems = new ArrayList<>();
        BigDecimal totalPrice = BigDecimal.ZERO;

        for (CartItem cartItem : cart.getItems()) {
            Product product = productRepository.findById(cartItem.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Product not found with id: " + cartItem.getProductId()));

            validateStock(product, cartItem.getQuantity());
            decreaseStock(product, cartItem.getQuantity());

            OrderItem orderItem = new OrderItem();
            orderItem.setProductId(cartItem.getProductId());
            orderItem.setProductName(product.getProductName());
            orderItem.setQuantity(cartItem.getQuantity());
            orderItem.setPriceAtPurchase(cartItem.getPrice());
            BigDecimal unitCost = product.getCost() != null
                    ? product.getCost()
                    : (cartItem.getPrice() != null
                            ? cartItem.getPrice().multiply(BigDecimal.valueOf(0.5)).setScale(2, RoundingMode.HALF_UP)
                            : BigDecimal.ZERO);
            orderItem.setCostAtPurchase(unitCost);
            // Set product image URL (first image if available)
            if (product.getImages() != null && !product.getImages().isEmpty()) {
                orderItem.setImageUrl(product.getImages().get(0));
            }

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
        order.setShippingAddress(deliveryAddress);

        Order savedOrder = orderRepository.save(order);

        for (OrderItem item : orderItems) {
            Delivery delivery = new Delivery();
            delivery.setDeliveryId(UUID.randomUUID().toString());
            delivery.setOrderId(savedOrder.getOrderId());
            delivery.setCustomerId(customerId);
            delivery.setProductId(item.getProductId());
            delivery.setQuantity(item.getQuantity());
            delivery.setTotalPrice(
                    item.getPriceAtPurchase().multiply(BigDecimal.valueOf(item.getQuantity())).doubleValue());
            delivery.setDeliveryAddress(deliveryAddress);
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
        // First try to find by orderId field (custom field)
        Optional<Order> orderByOrderId = orderRepository.findByOrderId(orderId);
        if (orderByOrderId.isPresent()) {
            return orderByOrderId.get();
        }
        // Fallback to MongoDB _id field
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

    // Get all orders (PRODUCT_MANAGER için - tek satıcı olduğu için tüm orderlar)
    public List<Order> getOrdersByOwner(String ownerUsername, String status) {
        // Artık owner kontrolü yok, tüm orderları döndür
        List<Order> allOrders = status != null
                ? orderRepository.findByStatus(status)
                : orderRepository.findAll();

        return allOrders;
    }

    public String getUserIdByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));
        return user.getUserId();
    }

    @Transactional
    public Order updateOrderStatus(String orderId, String status) {
        // First try to find by orderId field (custom field)
        Optional<Order> orderOpt = orderRepository.findByOrderId(orderId);
        if (orderOpt.isEmpty()) {
            // Fallback to MongoDB _id field
            orderOpt = orderRepository.findById(orderId);
        }
        Order order = orderOpt
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));
        order.setStatus(status);
        return orderRepository.save(order);
    }

    @Transactional
    public Order cancelOrder(String orderId, String username) {
        Order order = orderRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + orderId));

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        if (!user.getUserId().equals(order.getCustomerId())) {
            throw new InvalidRequestException("You can only cancel your own orders.");
        }

        if (!"PROCESSING".equalsIgnoreCase(order.getStatus())) {
            throw new InvalidRequestException("Only orders in PROCESSING status can be cancelled.");
        }

        // Put stock back
        if (order.getItems() != null) {
            for (OrderItem item : order.getItems()) {
                Product product = productRepository.findById(item.getProductId())
                        .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + item.getProductId()));
                int newQty = (product.getQuantity() != null ? product.getQuantity() : 0)
                        + (item.getQuantity() != null ? item.getQuantity() : 0);
                product.setQuantity(newQty);
                product.setInStock(newQty > 0);
                productRepository.save(product);
            }
        }

        order.setStatus("CANCELLED");
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
