package org.example.onlinestorebackend.Entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "deliveries")
public class Delivery {

    @Id
    private String deliveryId;

    private String orderId;

    private String customerId;

    private String productId;

    private Integer quantity;

    private Double totalPrice;

    private String deliveryAddress;

    private Boolean completed;
}
