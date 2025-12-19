package org.example.onlinestorebackend.Service;

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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SalesManagerServiceTest {

    @Mock private ProductRepository productRepository;
    @Mock private InvoiceRepository invoiceRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private WishListService wishListService;
    @Mock private UserService userService;
    @Mock private MailService mailService;

    @InjectMocks
    private SalesManagerService salesManagerService;

    @Test
    void setDiscount_invalidPercent_throws() {
        InvalidRequestException ex = assertThrows(InvalidRequestException.class, () ->
                salesManagerService.setDiscount(List.of("p1"), new BigDecimal("200"))
        );
        assertTrue(ex.getMessage().contains("discountPercent"));
    }

    @Test
    void setDiscount_productNotFound_throws() {
        when(productRepository.findById("p1")).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () ->
                salesManagerService.setDiscount(List.of("p1"), new BigDecimal("10"))
        );
    }

    @Test
    void setDiscount_updatesProductAndNotifiesWishListUsers_bestEffort() {
        String productId = "p1";
        Product p = new Product();
        p.setProductId(productId);
        p.setProductName("Phone");
        p.setPrice(new BigDecimal("100"));

        WishList wl = new WishList();
        wl.setWishListId(UUID.randomUUID().toString());
        wl.setUserId("u1");
        wl.setProductIds(List.of(productId));

        when(productRepository.findById(productId)).thenReturn(Optional.of(p));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(wishListService.findWishListsContainingProduct(productId)).thenReturn(List.of(wl));
        when(userService.getEmailByUserId("u1")).thenReturn("u1@example.com");

        List<Product> updated = salesManagerService.setDiscount(List.of(productId), new BigDecimal("15"));

        assertEquals(1, updated.size());
        assertEquals(new BigDecimal("15"), updated.get(0).getDiscount());
        verify(mailService).sendDiscountNotificationEmail(eq("u1@example.com"), eq("Phone"), eq(new BigDecimal("15")));
    }

    @Test
    void getMetrics_usesInvoiceOrders_sumsRevenueAndCost() {
        LocalDateTime from = LocalDateTime.now().minusDays(2);
        LocalDateTime to = LocalDateTime.now();

        Invoice inv = new Invoice();
        inv.setInvoiceId("i1");
        inv.setOrderId("o1");
        inv.setInvoiceDate(LocalDateTime.now().minusDays(1));

        OrderItem item = new OrderItem();
        item.setProductId("p1");
        item.setQuantity(2);
        item.setPriceAtPurchase(new BigDecimal("50.00")); // revenue 100
        item.setCostAtPurchase(new BigDecimal("20.00"));  // cost 40

        Order order = new Order();
        order.setOrderId("o1");
        order.setItems(List.of(item));

        when(invoiceRepository.findByInvoiceDateBetween(from, to)).thenReturn(List.of(inv));
        when(orderRepository.findByOrderId("o1")).thenReturn(Optional.of(order));

        SalesMetricsResponse resp = salesManagerService.getMetrics(from, to);

        assertEquals(new BigDecimal("100.00"), resp.getTotalRevenue().setScale(2));
        assertEquals(new BigDecimal("40.00"), resp.getTotalCost().setScale(2));
        assertEquals(new BigDecimal("60.00"), resp.getTotalProfit().setScale(2));
        assertEquals(1, resp.getPoints().size());
    }

    @Test
    void getMetrics_costFallback_uses50PercentWhenMissing() {
        LocalDateTime from = LocalDateTime.now().minusDays(2);
        LocalDateTime to = LocalDateTime.now();

        Invoice inv = new Invoice();
        inv.setInvoiceId("i1");
        inv.setOrderId("o1");
        inv.setInvoiceDate(LocalDateTime.now().minusDays(1));

        OrderItem item = new OrderItem();
        item.setProductId("p1");
        item.setQuantity(2);
        item.setPriceAtPurchase(new BigDecimal("50.00")); // revenue 100
        item.setCostAtPurchase(null); // fallback -> 25 * 2 = 50

        Order order = new Order();
        order.setOrderId("o1");
        order.setItems(List.of(item));

        when(invoiceRepository.findByInvoiceDateBetween(from, to)).thenReturn(List.of(inv));
        when(orderRepository.findByOrderId("o1")).thenReturn(Optional.of(order));

        SalesMetricsResponse resp = salesManagerService.getMetrics(from, to);

        assertEquals(new BigDecimal("100.00"), resp.getTotalRevenue().setScale(2));
        assertEquals(new BigDecimal("50.00"), resp.getTotalCost().setScale(2));
        assertEquals(new BigDecimal("50.00"), resp.getTotalProfit().setScale(2));
    }
}


