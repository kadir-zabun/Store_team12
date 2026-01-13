package org.example.onlinestorebackend.Controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.onlinestorebackend.Dto.CreateOrderRequest;
import org.example.onlinestorebackend.Dto.UpdateOrderStatusRequest;
import org.example.onlinestorebackend.Dto.RefundRequestDto;
import org.example.onlinestorebackend.Entity.Order;
import org.example.onlinestorebackend.Entity.RefundRequest;
import org.example.onlinestorebackend.Service.OrderService;
import org.example.onlinestorebackend.Service.RefundService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final RefundService refundService;

    @PostMapping
    public ResponseEntity<Order> createOrder(@Valid @RequestBody CreateOrderRequest request) {
        Order order = orderService.createOrder(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(order);
    }

    @PostMapping("/from-cart")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<Order> createOrderFromCart(
            @RequestBody(required = false) java.util.Map<String, String> requestBody,
            @AuthenticationPrincipal UserDetails userDetails) {
        // Convert username from JWT to userId
        String username = userDetails.getUsername();
        String userId = orderService.getUserIdByUsername(username);
        String shippingAddress = requestBody != null ? requestBody.get("shippingAddress") : null;
        Order order = orderService.createOrderFromCart(userId, shippingAddress);
        return ResponseEntity.status(HttpStatus.CREATED).body(order);
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<Order> getOrderById(@PathVariable String orderId) {
        Order order = orderService.getOrderById(orderId);
        return ResponseEntity.ok(order);
    }

    @PostMapping("/{orderId}/cancel")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<Order> cancelOrder(
            @PathVariable String orderId,
            @AuthenticationPrincipal UserDetails userDetails) {
        Order order = orderService.cancelOrder(orderId, userDetails.getUsername());
        return ResponseEntity.ok(order);
    }

    @PostMapping("/{orderId}/refund")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<RefundRequest> requestRefund(
            @PathVariable String orderId,
            @Valid @RequestBody RefundRequestDto request,
            @AuthenticationPrincipal UserDetails userDetails) {
        request.setOrderId(orderId);
        RefundRequest refund = refundService.requestRefund(userDetails.getUsername(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(refund);
    }

    @GetMapping("/refunds/me")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<List<RefundRequest>> myRefunds(@AuthenticationPrincipal UserDetails userDetails) {
        List<RefundRequest> refunds = refundService.getRefundsForUser(userDetails.getUsername());
        return ResponseEntity.ok(refunds);
    }

    @GetMapping("/customer/{customerId}")
    public ResponseEntity<List<Order>> getOrdersByCustomer(@PathVariable String customerId) {
        List<Order> orders = orderService.getOrdersByCustomer(customerId);
        return ResponseEntity.ok(orders);
    }

    // Get delivered orders for a customer (for review purposes)
    @GetMapping("/customer/{customerId}/delivered")
    public ResponseEntity<List<Order>> getDeliveredOrdersByCustomer(@PathVariable String customerId) {
        List<Order> orders = orderService.getDeliveredOrdersByCustomer(customerId);
        return ResponseEntity.ok(orders);
    }

    // Get orders for product owner (only their products' orders) - Only
    // PRODUCT_OWNER
    @GetMapping
    @PreAuthorize("hasRole('PRODUCT_MANAGER')")
    public ResponseEntity<List<Order>> getOrdersForOwner(
            @RequestParam(required = false) String status,
            @AuthenticationPrincipal UserDetails userDetails) {
        List<Order> orders = orderService.getOrdersByOwner(userDetails.getUsername(), status);
        return ResponseEntity.ok(orders);
    }

    // Update order status - Only PRODUCT_OWNER
    @PutMapping("/{orderId}/status")
    @PreAuthorize("hasRole('PRODUCT_MANAGER')")
    public ResponseEntity<Order> updateOrderStatus(
            @PathVariable String orderId,
            @Valid @RequestBody UpdateOrderStatusRequest request) {
        Order order = orderService.updateOrderStatus(orderId, request.getStatus());
        return ResponseEntity.ok(order);
    }
}
