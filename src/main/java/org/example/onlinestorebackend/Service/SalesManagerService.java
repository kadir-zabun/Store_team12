package org.example.onlinestorebackend.Service;

import lombok.RequiredArgsConstructor;
import org.example.onlinestorebackend.Dto.SalesMetricsResponse;
import org.example.onlinestorebackend.Entity.Invoice;
import org.example.onlinestorebackend.Entity.Order;
import org.example.onlinestorebackend.Entity.OrderItem;
import org.example.onlinestorebackend.Entity.Product;
import org.example.onlinestorebackend.Entity.WishList;
import org.example.onlinestorebackend.Repository.InvoiceRepository;
import org.example.onlinestorebackend.Repository.OrderRepository;
import org.example.onlinestorebackend.Repository.ProductRepository;
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
    private final WishListService wishListService;
    private final UserService userService;
    private final MailService mailService;

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
            for (WishList wl : wishLists) {
                try {
                    String email = userService.getEmailByUserId(wl.getUserId());
                    if (email != null && !email.isBlank()) {
                        mailService.sendDiscountNotificationEmail(email, p.getProductName(), discountPercent);
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

    public List<Invoice> getInvoices(LocalDateTime from, LocalDateTime to) {
        if (from == null || to == null) {
            throw new InvalidRequestException("from/to are required");
        }
        if (to.isBefore(from)) {
            throw new InvalidRequestException("to must be after from");
        }
        return invoiceRepository.findByInvoiceDateBetween(from, to);
    }

    public SalesMetricsResponse getMetrics(LocalDateTime from, LocalDateTime to) {
        List<Invoice> invoices = getInvoices(from, to);

        Map<LocalDate, Totals> byDay = new TreeMap<>();
        BigDecimal totalRevenue = BigDecimal.ZERO;
        BigDecimal totalCost = BigDecimal.ZERO;

        for (Invoice inv : invoices) {
            LocalDateTime invDate = inv.getInvoiceDate() != null ? inv.getInvoiceDate() : from;
            LocalDate key = invDate.toLocalDate();

            Order order = orderRepository.findByOrderId(inv.getOrderId()).orElse(null);
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

        List<SalesMetricsResponse.Point> points = new ArrayList<>();
        for (Map.Entry<LocalDate, Totals> e : byDay.entrySet()) {
            BigDecimal profit = e.getValue().revenue.subtract(e.getValue().cost);
            points.add(new SalesMetricsResponse.Point(e.getKey(), e.getValue().revenue, e.getValue().cost, profit));
        }

        SalesMetricsResponse resp = new SalesMetricsResponse();
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


