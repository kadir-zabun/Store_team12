package org.example.onlinestorebackend.Service;

import org.example.onlinestorebackend.Dto.CreateOrderRequest;
import org.example.onlinestorebackend.Entity.Cart;
import org.example.onlinestorebackend.Entity.CartItem;
import org.example.onlinestorebackend.Entity.Order;
import org.example.onlinestorebackend.Entity.Product;
import org.example.onlinestorebackend.exception.InsufficientStockException;
import org.example.onlinestorebackend.exception.InvalidRequestException;
import org.example.onlinestorebackend.exception.ResourceNotFoundException;
import org.example.onlinestorebackend.Repository.CartRepository;
import org.example.onlinestorebackend.Repository.DeliveryRepository;
import org.example.onlinestorebackend.Repository.OrderRepository;
import org.example.onlinestorebackend.Repository.ProductRepository;
import org.example.onlinestorebackend.Repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CartRepository cartRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private DeliveryRepository deliveryRepository;

    @InjectMocks
    private OrderService orderService;

    private String customerId;
    private Product product;
    private CreateOrderRequest orderRequest;
    private Cart cart;
    private CartItem cartItem;

    @BeforeEach
    void setUp() {
        customerId = UUID.randomUUID().toString();

        product = new Product();
        product.setProductId(UUID.randomUUID().toString());
        product.setProductName("Test Product");
        product.setPrice(new BigDecimal("99.99"));
        product.setQuantity(10);
        product.setInStock(true);
        product.setPopularity(0);

        CreateOrderRequest.OrderItemRequest itemRequest = new CreateOrderRequest.OrderItemRequest();
        itemRequest.setProductId(product.getProductId());
        itemRequest.setQuantity(2);

        orderRequest = new CreateOrderRequest();
        orderRequest.setCustomerId(customerId);
        orderRequest.setItems(Arrays.asList(itemRequest));

        cartItem = new CartItem();
        cartItem.setProductId(product.getProductId());
        cartItem.setProductName(product.getProductName());
        cartItem.setPrice(product.getPrice());
        cartItem.setQuantity(2);
        cartItem.setSubtotal(product.getPrice().multiply(BigDecimal.valueOf(2)));

        cart = new Cart();
        cart.setCartId(UUID.randomUUID().toString());
        cart.setUserId(customerId);
        cart.setItems(new ArrayList<>(Arrays.asList(cartItem)));
        cart.setTotalPrice(cartItem.getSubtotal());
    }

    @Test
    void createOrder_validRequest_returnsOrder() {
        // Given
        when(productRepository.findById(product.getProductId())).thenReturn(Optional.of(product));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            order.setOrderId(UUID.randomUUID().toString());
            return order;
        });

        // When
        Order result = orderService.createOrder(orderRequest);

        // Then
        assertNotNull(result);
        assertEquals(customerId, result.getCustomerId());
        assertEquals("PROCESSING", result.getStatus());
        assertEquals(1, result.getItems().size());
        assertNotNull(result.getTotalPrice());
        verify(productRepository).findById(product.getProductId());
        verify(productRepository).save(any(Product.class));
        verify(orderRepository).save(any(Order.class));
    }

    @Test
    void createOrder_emptyItems_throwsInvalidRequestException() {
        // Given
        orderRequest.setItems(new ArrayList<>());

        // When & Then
        InvalidRequestException exception = assertThrows(InvalidRequestException.class, () -> {
            orderService.createOrder(orderRequest);
        });

        assertTrue(exception.getMessage().contains("Order must contain at least one item"));
        verify(orderRepository, never()).save(any(Order.class));
    }

    @Test
    void createOrder_insufficientStock_throwsInsufficientStockException() {
        // Given
        product.setQuantity(1);
        orderRequest.getItems().get(0).setQuantity(5);
        when(productRepository.findById(product.getProductId())).thenReturn(Optional.of(product));

        // When & Then
        InsufficientStockException exception = assertThrows(InsufficientStockException.class, () -> {
            orderService.createOrder(orderRequest);
        });

        assertTrue(exception.getMessage().contains("Insufficient stock"));
        verify(orderRepository, never()).save(any(Order.class));
    }

    @Test
    void createOrderFromCart_validCart_returnsOrderAndClearsCart() {
        // Given
        when(cartRepository.findByUserId(customerId)).thenReturn(Optional.of(cart));
        when(productRepository.findById(product.getProductId())).thenReturn(Optional.of(product));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            order.setOrderId(UUID.randomUUID().toString());
            return order;
        });
        when(deliveryRepository.save(any(org.example.onlinestorebackend.Entity.Delivery.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(cartRepository.save(any(Cart.class))).thenReturn(cart);

        // When
        Order result = orderService.createOrderFromCart(customerId);

        // Then
        assertNotNull(result);
        assertEquals(customerId, result.getCustomerId());
        assertEquals("PROCESSING", result.getStatus());
        assertTrue(cart.getItems().isEmpty());
        assertEquals(BigDecimal.ZERO, cart.getTotalPrice());
        verify(cartRepository).save(any(Cart.class));
        verify(orderRepository).save(any(Order.class));
    }

    @Test
    void createOrderFromCart_emptyCart_throwsInvalidRequestException() {
        // Given
        cart.setItems(new ArrayList<>());
        when(cartRepository.findByUserId(customerId)).thenReturn(Optional.of(cart));

        // When & Then
        InvalidRequestException exception = assertThrows(InvalidRequestException.class, () -> {
            orderService.createOrderFromCart(customerId);
        });

        assertTrue(exception.getMessage().contains("Cart is empty"));
        verify(orderRepository, never()).save(any(Order.class));
    }

    @Test
    void getOrderById_validId_returnsOrder() {
        // Given
        String orderId = UUID.randomUUID().toString();
        Order order = new Order();
        order.setOrderId(orderId);
        order.setCustomerId(customerId);
        when(orderRepository.findByOrderId(orderId)).thenReturn(Optional.of(order));

        // When
        Order result = orderService.getOrderById(orderId);

        // Then
        assertNotNull(result);
        assertEquals(orderId, result.getOrderId());
        verify(orderRepository).findByOrderId(orderId);
    }

    @Test
    void getOrderById_invalidId_throwsResourceNotFoundException() {
        // Given
        String invalidId = "invalid-id";
        when(orderRepository.findByOrderId(invalidId)).thenReturn(Optional.empty());
        when(orderRepository.findById(invalidId)).thenReturn(Optional.empty());

        // When & Then
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> {
            orderService.getOrderById(invalidId);
        });

        assertTrue(exception.getMessage().contains("Order not found"));
        verify(orderRepository).findByOrderId(invalidId);
        verify(orderRepository).findById(invalidId);
    }

    @Test
    void updateOrderStatus_validOrder_updatesStatus() {
        // Given
        String orderId = UUID.randomUUID().toString();
        String newStatus = "DELIVERED";
        Order order = new Order();
        order.setOrderId(orderId);
        order.setStatus("PROCESSING");
        when(orderRepository.findByOrderId(orderId)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenReturn(order);

        // When
        Order result = orderService.updateOrderStatus(orderId, newStatus);

        // Then
        assertNotNull(result);
        assertEquals(newStatus, result.getStatus());
        verify(orderRepository).findByOrderId(orderId);
        verify(orderRepository).save(any(Order.class));
    }

    @Test
    void getOrdersByCustomer_validCustomerId_returnsOrders() {
        // Given
        List<Order> orders = Arrays.asList(new Order());
        when(orderRepository.findByCustomerId(customerId)).thenReturn(orders);

        // When
        List<Order> result = orderService.getOrdersByCustomer(customerId);

        // Then
        assertNotNull(result);
        assertEquals(1, result.size());
        verify(orderRepository).findByCustomerId(customerId);
    }
}

