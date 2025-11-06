package org.example.onlinestorebackend.Repository;

import org.example.onlinestorebackend.Entity.Product;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface ProductRepository extends MongoRepository<Product, String> {

    // ürün ismine göre arama
    List<Product> findByProductNameContainingIgnoreCase(String name);

    // fiyat aralığına göre arama
    List<Product> findByPriceBetween(BigDecimal minPrice, BigDecimal maxPrice);

    // stokta olan ürünler
    List<Product> findByInStockTrue();

    // kategori eklenirse ona göre filtreleme
    // List<Product> findByCategoryId(String categoryId);
}
