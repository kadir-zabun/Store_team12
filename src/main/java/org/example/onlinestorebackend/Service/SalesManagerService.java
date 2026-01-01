package org.example.onlinestorebackend.Service;

import lombok.RequiredArgsConstructor;
import org.example.onlinestorebackend.Dto.InvoiceWithOrderDto;
import org.example.onlinestorebackend.Dto.SalesMetricResponse;
import org.example.onlinestorebackend.Entity.*;
import org.example.onlinestorebackend.Repository.InvoiceRepository;
import org.example.onlinestorebackend.Repository.OrderRepository;
import org.example.onlinestorebackend.Repository.ProductRepository;
import org.example.onlinestorebackend.Repository.RefundRequestRepository;
import org.example.onlinestorebackend.Repository.UserRepository;
import org.example.onlinestorebackend.exception.InvalidRequestException;
import org.example.onlinestorebackend.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class SalesManagerService {

    private final ProductRepository productRepository;
    private final InvoiceRepository invoiceRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final WishListService wishListService;
    private final UserService userService;
    private final MailService mailService;
    private final RefundRequestRepository refundRequestRepository;

    @Transactional
    public List<Product> setDiscount(List<String> productIds, BigDecimal discountPercent) {
        if (productIds == null || productIds.isEmpty()) {
            throw new InvalidRequestException("productIds is required");
        }
        if (discountPercent == null || discountPercent.compareTo(BigDecimal.ZERO) < 0 || discountPercent.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new InvalidRequestException("discountPercent must be between 0 and 100");
        }

        List<Product> updated = new ArrayList<>();
        for (String productId : productIds) {
            Product p = productRepository.findById(productId)
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + productId));
            p.setDiscount(discountPercent);
            updated.add(productRepository.save(p));

            // Notify users who have this product in their wishlist
            List<WishList> wishLists = wishListService.findWishListsContainingProduct(productId);
            BigDecimal originalPrice = p.getPrice();
            BigDecimal discountedPrice = originalPrice;
            if (originalPrice != null && discountPercent != null && discountPercent.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal discountAmount = originalPrice
                        .multiply(discountPercent)
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                discountedPrice = originalPrice.subtract(discountAmount);
            }
            
            for (WishList wl : wishLists) {
                try {
                    String email = userService.getEmailByUserId(wl.getUserId());
                    if (email != null && !email.isBlank()) {
                        mailService.sendDiscountNotificationEmail(
                                email,
                                p.getProductName(),
                                discountPercent,
                                originalPrice,
                                discountedPrice
                        );
                    }
                } catch (Exception ignored) {
                    // Best-effort notification
                }
            }
        }
        return updated;
    }

    @Transactional
    public Product setPrice(String productId, BigDecimal price) {
        if (productId == null || productId.isBlank()) {
            throw new InvalidRequestException("productId is required");
        }
        if (price == null || price.compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidRequestException("price must be > 0");
        }
        Product p = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + productId));
        p.setPrice(price);
        return productRepository.save(p);
    }

    public List<InvoiceWithOrderDto> getInvoices(LocalDateTime from, LocalDateTime to) {
        if (from == null || to == null) {
            throw new InvalidRequestException("from/to are required");
        }
        if (to.isBefore(from)) {
            throw new InvalidRequestException("to must be after from");
        }
        List<Invoice> invoices = invoiceRepository.findByInvoiceDateBetween(from, to);
        List<InvoiceWithOrderDto> result = new ArrayList<>();
        
        for (Invoice invoice : invoices) {
            InvoiceWithOrderDto dto = new InvoiceWithOrderDto();
            dto.setInvoiceId(invoice.getInvoiceId());
            dto.setOrderId(invoice.getOrderId());
            dto.setInvoiceDate(invoice.getInvoiceDate());
            
            // Get order details
            Order order = orderRepository.findByOrderId(invoice.getOrderId()).orElse(null);
            if (order != null) {
                dto.setCustomerId(order.getCustomerId());
                dto.setOrderDate(order.getOrderDate());
                if (order.getTotalPrice() != null) {
                    dto.setTotalAmount(BigDecimal.valueOf(order.getTotalPrice()));
                }
                
                // Get customer details
                if (order.getCustomerId() != null) {
                    userRepository.findById(order.getCustomerId()).ifPresent(user -> {
                        dto.setCustomerName(user.getName());
                        dto.setCustomerEmail(user.getEmail());
                    });
                }
            }
            
            result.add(dto);
        }
        
        return result;
    }

    public SalesMetricResponse getMetrics(LocalDateTime from, LocalDateTime to) {
        List<Invoice> invoices = invoiceRepository.findByInvoiceDateBetween(from, to);

        Map<LocalDate, Totals> byDay = new TreeMap<>();
        BigDecimal totalRevenue = BigDecimal.ZERO;
        BigDecimal totalCost = BigDecimal.ZERO;

        // invoice aralığındaki order'ları cache'leyelim + hangi güne yazılacaklarını bilelim
        Map<String, LocalDate> orderDayMap = new HashMap<>();
        Map<String, Order> orderCache = new HashMap<>();

        for (Invoice inv : invoices) {
            LocalDateTime invDate = inv.getInvoiceDate() != null ? inv.getInvoiceDate() : from;
            LocalDate key = invDate.toLocalDate();

            String orderId = inv.getOrderId();
            orderDayMap.put(orderId, key);

            Order order = orderCache.computeIfAbsent(orderId, id ->
                    orderRepository.findByOrderId(id).orElse(null)
            );

            if (order == null || order.getItems() == null) {
                continue;
            }

            BigDecimal revenue = BigDecimal.ZERO;
            BigDecimal cost = BigDecimal.ZERO;

            for (OrderItem item : order.getItems()) {
                BigDecimal unitPrice = item.getPriceAtPurchase() != null ? item.getPriceAtPurchase() : BigDecimal.ZERO;
                int qty = item.getQuantity() != null ? item.getQuantity() : 0;

                revenue = revenue.add(unitPrice.multiply(BigDecimal.valueOf(qty)));

                BigDecimal unitCost = item.getCostAtPurchase();
                if (unitCost == null) {
                    unitCost = unitPrice.multiply(BigDecimal.valueOf(0.5)).setScale(2, RoundingMode.HALF_UP);
                }
                cost = cost.add(unitCost.multiply(BigDecimal.valueOf(qty)));
            }

            totalRevenue = totalRevenue.add(revenue);
            totalCost = totalCost.add(cost);

            Totals t = byDay.computeIfAbsent(key, k -> new Totals());
            t.revenue = t.revenue.add(revenue);
            t.cost = t.cost.add(cost);
        }

        // ✅ REFUND DÜŞME: invoice range'ine giren order'lar için APPROVED refund'ları çek ve geri düş
        if (!orderDayMap.isEmpty()) {
            List<RefundRequest> approvedRefunds =
                    refundRequestRepository.findByStatusIgnoreCaseAndOrderIdIn("APPROVED", new ArrayList<>(orderDayMap.keySet()));

            for (RefundRequest refund : approvedRefunds) {
                String orderId = refund.getOrderId();
                LocalDate dayKey = orderDayMap.get(orderId);
                if (dayKey == null) {
                    continue; // bu refund bu metrics'in invoice set'inde yok
                }

                Order order = orderCache.computeIfAbsent(orderId, id ->
                        orderRepository.findByOrderId(id).orElse(null)
                );
                if (order == null || order.getItems() == null) {
                    continue;
                }

                // ilgili product'ın order item'ını bul
                OrderItem item = order.getItems().stream()
                        .filter(i -> refund.getProductId() != null && refund.getProductId().equals(i.getProductId()))
                        .findFirst()
                        .orElse(null);

                if (item == null) continue;

                int refundQty = refund.getQuantity() != null ? refund.getQuantity() : 0;
                if (refundQty <= 0) continue;

                BigDecimal unitPrice = item.getPriceAtPurchase() != null ? item.getPriceAtPurchase() : BigDecimal.ZERO;

                BigDecimal unitCost = item.getCostAtPurchase();
                if (unitCost == null) {
                    unitCost = unitPrice.multiply(BigDecimal.valueOf(0.5)).setScale(2, RoundingMode.HALF_UP);
                }

                BigDecimal refundRevenue = unitPrice.multiply(BigDecimal.valueOf(refundQty));
                BigDecimal refundCost = unitCost.multiply(BigDecimal.valueOf(refundQty));

                // totals'tan düş
                totalRevenue = totalRevenue.subtract(refundRevenue);
                totalCost = totalCost.subtract(refundCost);

                // günlükten düş
                Totals t = byDay.computeIfAbsent(dayKey, k -> new Totals());
                t.revenue = t.revenue.subtract(refundRevenue);
                t.cost = t.cost.subtract(refundCost);
            }
        }

        List<SalesMetricResponse.Point> points = new ArrayList<>();
        for (Map.Entry<LocalDate, Totals> e : byDay.entrySet()) {
            BigDecimal profit = e.getValue().revenue.subtract(e.getValue().cost);
            points.add(new SalesMetricResponse.Point(e.getKey(), e.getValue().revenue, e.getValue().cost, profit));
        }

        SalesMetricResponse resp = new SalesMetricResponse();
        resp.setTotalRevenue(totalRevenue);
        resp.setTotalCost(totalCost);
        resp.setTotalProfit(totalRevenue.subtract(totalCost));
        resp.setPoints(points);
        return resp;
    }


    private static class Totals {
        BigDecimal revenue = BigDecimal.ZERO;
        BigDecimal cost = BigDecimal.ZERO;
    }
}