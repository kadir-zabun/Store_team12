package org.example.onlinestorebackend.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.onlinestorebackend.Dto.RefundDecisionDto;
import org.example.onlinestorebackend.Dto.RefundRequestDto;
import org.example.onlinestorebackend.Entity.Order;
import org.example.onlinestorebackend.Entity.OrderItem;
import org.example.onlinestorebackend.Entity.Product;
import org.example.onlinestorebackend.Entity.RefundRequest;
import org.example.onlinestorebackend.Entity.User;
import org.example.onlinestorebackend.Repository.OrderRepository;
import org.example.onlinestorebackend.Repository.ProductRepository;
import org.example.onlinestorebackend.Repository.RefundRequestRepository;
import org.example.onlinestorebackend.Repository.UserRepository;
import org.example.onlinestorebackend.exception.InvalidRequestException;
import org.example.onlinestorebackend.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class RefundService {

    private final RefundRequestRepository refundRequestRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final MailService mailService;

    private static final long REFUND_WINDOW_DAYS = 30L;

    @Transactional
    public RefundRequest requestRefund(String username, RefundRequestDto dto) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        Order order = orderRepository.findByOrderId(dto.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + dto.getOrderId()));

        if (!user.getUserId().equals(order.getCustomerId())) {
            throw new InvalidRequestException("You can only request refunds for your own orders.");
        }

        if (!"DELIVERED".equalsIgnoreCase(order.getStatus())) {
            throw new InvalidRequestException("Refund can be requested only after the order is delivered.");
        }

        if (order.getOrderDate() == null ||
                ChronoUnit.DAYS.between(order.getOrderDate(), LocalDateTime.now()) > REFUND_WINDOW_DAYS) {
            throw new InvalidRequestException("Refund window expired. You can request a refund within 30 days after purchase.");
        }

        OrderItem item = findOrderItem(order, dto.getProductId());
        if (item.getQuantity() == null || item.getQuantity() < dto.getQuantity()) {
            throw new InvalidRequestException("Requested quantity exceeds purchased quantity.");
        }

        BigDecimal priceAtPurchase = item.getPriceAtPurchase() != null ? item.getPriceAtPurchase() : BigDecimal.ZERO;
        BigDecimal refundAmount = priceAtPurchase.multiply(BigDecimal.valueOf(dto.getQuantity()));

        RefundRequest refund = new RefundRequest();
        refund.setRefundId(UUID.randomUUID().toString());
        refund.setUserId(user.getUserId());
        refund.setOrderId(order.getOrderId());
        refund.setProductId(dto.getProductId());
        refund.setQuantity(dto.getQuantity());
        refund.setRequestDate(LocalDateTime.now());
        refund.setStatus("PENDING");
        refund.setApproved(null);
        refund.setRefundAmount(refundAmount);
        refund.setReason(dto.getReason());

        return refundRequestRepository.save(refund);
    }

    public List<RefundRequest> getPendingRefunds() {
        return refundRequestRepository.findByApproved(null);
    }

    public List<RefundRequest> getRefundsForUser(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
        return refundRequestRepository.findByUserId(user.getUserId());
    }

    @Transactional
    public RefundRequest decideRefund(RefundDecisionDto dto) {
        RefundRequest refund = refundRequestRepository.findById(dto.getRefundId())
                .orElseThrow(() -> new ResourceNotFoundException("Refund request not found: " + dto.getRefundId()));

        if (!"PENDING".equalsIgnoreCase(refund.getStatus())) {
            throw new InvalidRequestException("Refund request is already processed.");
        }

        Order order = orderRepository.findByOrderId(refund.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + refund.getOrderId()));

        Product product = productRepository.findById(refund.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + refund.getProductId()));

        refund.setDecisionDate(LocalDateTime.now());
        refund.setApproved(dto.isApproved());
        refund.setDecisionNote(dto.getDecisionNote());

        if (dto.isApproved()) {
            product.setQuantity(product.getQuantity() + refund.getQuantity());
            product.setInStock(Boolean.TRUE);
            productRepository.save(product);

            // Siparişi DELIVERED durumda bırak ki diğer ürünler için de yeni refund istekleri yapılabilsin
            // (tek bir kalem onaylandığında tüm siparişi bloklamayalım)
            if (!"DELIVERED".equalsIgnoreCase(order.getStatus())) {
                order.setStatus("DELIVERED");
                orderRepository.save(order);
            }

            refund.setStatus("APPROVED");
            sendRefundMail(order, refund, true, product.getProductName());
        } else {
            refund.setStatus("REJECTED");
            sendRefundMail(order, refund, false, product.getProductName());
        }

        return refundRequestRepository.save(refund);
    }

    private void sendRefundMail(Order order, RefundRequest refund, boolean approved, String productName) {
        try {
            String email = userRepository.findByUserId(order.getCustomerId())
                    .map(User::getEmail)
                    .orElse(null);
            if (email == null) {
                log.warn("Email not found for user {}", order.getCustomerId());
                return;
            }

            // Ürün adı: önce order item içinden, yoksa parametre, yoksa productId
            String resolvedProductName = productName;
            if (order.getItems() != null) {
                resolvedProductName = order.getItems().stream()
                        .filter(i -> refund.getProductId().equals(i.getProductId()))
                        .map(OrderItem::getProductName)
                        .filter(n -> n != null && !n.isBlank())
                        .findFirst()
                        .orElse(resolvedProductName);
            }
            if (resolvedProductName == null || resolvedProductName.isBlank()) {
                resolvedProductName = refund.getProductId();
            }

            mailService.sendRefundNotificationEmail(
                    email,
                    resolvedProductName,
                    refund.getRefundAmount(),
                    approved,
                    refund.getReason(),
                    refund.getDecisionNote()
            );
        } catch (Exception e) {
            log.error("Failed to send refund mail: {}", e.getMessage());
        }
    }

    private OrderItem findOrderItem(Order order, String productId) {
        return order.getItems().stream()
                .filter(i -> productId.equals(i.getProductId()))
                .findFirst()
                .orElseThrow(() -> new InvalidRequestException("Product not found in order."));
    }
}

