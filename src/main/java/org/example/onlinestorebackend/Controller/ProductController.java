package org.example.onlinestorebackend.Controller;

import org.example.onlinestorebackend.Entity.Product;
import org.example.onlinestorebackend.Repository.ProductRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductRepository productRepository;

    public ProductController(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }
    @PostMapping
    public ResponseEntity<Product> createProduct(@RequestBody Product product) {
        // productId göndermene gerek yok, null bırak → Mongo kendi id üretir
        Product saved = productRepository.save(product);
        return ResponseEntity.ok(saved);
    }


    // /api/products/search?query=iphone
    @GetMapping("/search")
    public ResponseEntity<List<Product>> searchProducts(@RequestParam("query") String query) {
        if (query == null || query.trim().isEmpty()) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        List<Product> products =
                productRepository
                        .findByProductNameContainingIgnoreCaseOrDescriptionContainingIgnoreCase(
                                query, query
                        );

        return ResponseEntity.ok(products);
    }
}
