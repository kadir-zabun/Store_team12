package org.example.onlinestorebackend.Entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Document(collection = "orders")
public class Order {

    @Id
    @JsonProperty("orderId")
    private String orderId;

    private String customerId;

    private List<OrderItem> items;

    private String status; // PROCESSING, IN_TRANSIT, DELIVERED, CANCELLED

    private Double totalPrice;

    private LocalDateTime orderDate;

    private String shippingAddress;
}
