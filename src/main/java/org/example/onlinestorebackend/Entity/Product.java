package org.example.onlinestorebackend.Entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Data
@Document(collection = "products")
public class Product {

    @Id
    private String productId;

    @Indexed                 // isme göre aramayı hızlandırır
    private String productName;

    private Integer quantity;

    @Indexed
    private BigDecimal price;

    @Indexed
    private BigDecimal discount;

    private String description;

    private List<String> images;

    private Boolean inStock;

    private List<String> categoryIds; // Ürünün ait olduğu kategoriler

    private List<String> reviewIds =  new ArrayList<String>();

    /**
     * Ürünü oluşturan sahibi (PRODUCT_OWNER kullanıcı id'si).
     * Normal müşteriler bu id üzerinden filtrelenerek kendi ürünlerini görebilir.
     */
    private String ownerId;
}
