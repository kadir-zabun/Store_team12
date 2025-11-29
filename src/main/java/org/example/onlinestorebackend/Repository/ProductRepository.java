package org.example.onlinestorebackend.Repository;

import org.example.onlinestorebackend.Entity.Product;
import org.example.onlinestorebackend.Entity.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends MongoRepository<Product, String> {

    // ürün ismine göre arama
    List<Product> findByProductNameContainingIgnoreCase(String name);

    // fiyat aralığına göre arama
    List<Product> findByPriceBetween(BigDecimal minPrice, BigDecimal maxPrice);

    // stokta olan ürünler
    List<Product> findByInStockTrue();

    // isim VEYA açıklama içinde geçenler
    List<Product> findByProductNameContainingIgnoreCaseOrDescriptionContainingIgnoreCase(
            String name,
            String description
    );

    @Query("{ 'productId' : ?0 }")
    Optional<Product> findByProductId(String productId);
}