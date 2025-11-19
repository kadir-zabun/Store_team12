package org.example.onlinestorebackend.Controller;

import lombok.RequiredArgsConstructor;
import org.example.onlinestorebackend.Dto.ProductResponseDto;
import org.example.onlinestorebackend.Entity.Product;
import org.example.onlinestorebackend.Service.ProductService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    // Tüm ürünleri listele (pagination + sorting)
    @GetMapping
    public ResponseEntity<Page<ProductResponseDto>> getAllProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "productName") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir) {

        Sort sort = sortDir.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();

        Pageable pageable = PageRequest.of(page, size, sort);
        Page<ProductResponseDto> products = productService.getAllProducts(pageable);

        return ResponseEntity.ok(products);
    }

    // ID'ye göre tek ürün getir
    @GetMapping("/{productId}")
    public ResponseEntity<ProductResponseDto> getProductById(@PathVariable String productId) {
        ProductResponseDto product = productService.getProductById(productId);
        return ResponseEntity.ok(product);
    }

    // Kategoriye göre ürünleri getir
    @GetMapping("/category/{categoryId}")
    public ResponseEntity<Page<ProductResponseDto>> getProductsByCategory(
            @PathVariable String categoryId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "productName") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir) {

        Sort sort = sortDir.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();

        Pageable pageable = PageRequest.of(page, size, sort);
        Page<ProductResponseDto> products = productService.getProductsByCategory(categoryId, pageable);

        return ResponseEntity.ok(products);
    }

    // Ürün arama (isim veya açıklama)
    @GetMapping("/search")
    public ResponseEntity<List<ProductResponseDto>> searchProducts(@RequestParam("query") String query) {
        if (query == null || query.trim().isEmpty()) {
            return ResponseEntity.ok(List.of());
        }

        List<ProductResponseDto> products = productService.searchProducts(query);
        return ResponseEntity.ok(products);
    }

    // Fiyat aralığına göre ürün ara
    @GetMapping("/price-range")
    public ResponseEntity<List<ProductResponseDto>> getProductsByPriceRange(
            @RequestParam BigDecimal minPrice,
            @RequestParam BigDecimal maxPrice) {

        List<ProductResponseDto> products = productService.getProductsByPriceRange(minPrice, maxPrice);
        return ResponseEntity.ok(products);
    }

    // Stokta olan ürünleri getir
    @GetMapping("/in-stock")
    public ResponseEntity<List<ProductResponseDto>> getInStockProducts() {
        List<ProductResponseDto> products = productService.getInStockProducts();
        return ResponseEntity.ok(products);
    }

    // Yeni ürün oluştur (Admin için - şimdilik public)
    @PostMapping
    public ResponseEntity<ProductResponseDto> createProduct(@RequestBody Product product) {
        ProductResponseDto createdProduct = productService.createProduct(product);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdProduct);
    }
}