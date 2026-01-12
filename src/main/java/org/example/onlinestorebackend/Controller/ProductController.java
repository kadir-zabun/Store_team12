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
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
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

    // PRODUCT_MANAGER: stok miktarını set et
    @PutMapping("/{productId}/stock")
    @PreAuthorize("hasRole('PRODUCT_MANAGER')")
    public ResponseEntity<ProductResponseDto> updateStock(@PathVariable String productId,
            @RequestParam Integer quantity) {
        return ResponseEntity.ok(productService.updateStock(productId, quantity));
    }

    // PRODUCT_MANAGER: ürün maliyetini set et
    @PutMapping("/{productId}/cost")
    @PreAuthorize("hasRole('PRODUCT_MANAGER')")
    public ResponseEntity<ProductResponseDto> updateCost(@PathVariable String productId,
            @RequestParam BigDecimal cost) {
        return ResponseEntity.ok(productService.updateCost(productId, cost));
    }

    // Ürün güncelle (PRODUCT_MANAGER rolü) - Bu endpoint daha spesifik
    // endpoint'lerden önce gelmeli
    @PutMapping("/{productId}")
    @PreAuthorize("hasRole('PRODUCT_MANAGER')")
    public ResponseEntity<ProductResponseDto> updateProduct(@PathVariable String productId,
            @RequestBody Product product) {
        ProductResponseDto updatedProduct = productService.updateProduct(productId, product);
        return ResponseEntity.ok(updatedProduct);
    }

    // Yeni ürün oluştur (PRODUCT_MANAGER rolü)
    @PostMapping
    @PreAuthorize("hasRole('PRODUCT_MANAGER')")
    public ResponseEntity<ProductResponseDto> createProduct(@RequestBody Product product) {
        ProductResponseDto createdProduct = productService.createProduct(product);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdProduct);
    }

    // Tüm ürünleri getir (PRODUCT_MANAGER için)
    @GetMapping("/my-products")
    @PreAuthorize("hasRole('PRODUCT_MANAGER')")
    public ResponseEntity<List<ProductResponseDto>> getMyProducts() {
        List<ProductResponseDto> products = productService.getAllProductsList();
        return ResponseEntity.ok(products);
    }

    // Ürün silme (PRODUCT_MANAGER için)
    @DeleteMapping("/{productId}")
    @PreAuthorize("hasRole('PRODUCT_MANAGER')")
    public ResponseEntity<Void> deleteProduct(@PathVariable String productId) {
        productService.deleteProduct(productId);
        return ResponseEntity.noContent().build();
    }

    // Ürün yorumlarını listeleme (PRODUCT_MANAGER için)
    @GetMapping("/my-products/{productId}/reviews")
    @PreAuthorize("hasRole('PRODUCT_MANAGER')")
    public ResponseEntity<List<org.example.onlinestorebackend.Dto.ReviewDto>> getProductReviewsForOwner(
            @PathVariable String productId) {
        List<org.example.onlinestorebackend.Dto.ReviewDto> reviews = productService.getProductReviews(productId);
        return ResponseEntity.ok(reviews);
    }

    // Yorum onaylama (PRODUCT_MANAGER için)
    @PutMapping("/reviews/{reviewId}/approve")
    @PreAuthorize("hasRole('PRODUCT_MANAGER')")
    public ResponseEntity<String> approveReview(@PathVariable String reviewId) {
        productService.approveReview(reviewId);
        return ResponseEntity.ok("Review approved successfully");
    }

    // Yorum reddetme (PRODUCT_MANAGER için)
    @DeleteMapping("/reviews/{reviewId}")
    @PreAuthorize("hasRole('PRODUCT_MANAGER')")
    public ResponseEntity<String> rejectReview(@PathVariable String reviewId) {
        productService.rejectReview(reviewId);
        return ResponseEntity.ok("Review rejected and deleted");
    }

    @GetMapping("/product-comments")
    public ResponseEntity<List<String>> getProductComments(@RequestParam String productId) {
        List<String> result = productService.getReviewCommentsByProductId(productId);

        return ResponseEntity.ok(result);
    }

    @GetMapping("/product-ratings")
    public ResponseEntity<List<Integer>> getProductRatings(@RequestParam String productId) {
        List<Integer> result = productService.getReviewRatingsByProductId(productId);
        return ResponseEntity.ok(result);
    }

    // Get approved reviews for a product (public endpoint)
    @GetMapping("/{productId}/reviews")
    public ResponseEntity<List<org.example.onlinestorebackend.Dto.ReviewDto>> getProductReviews(
            @PathVariable String productId) {
        List<org.example.onlinestorebackend.Dto.ReviewDto> reviews = productService
                .getApprovedReviewsForProduct(productId);
        return ResponseEntity.ok(reviews);
    }

    // Upload images for a product (PRODUCT_MANAGER için)
    @PostMapping(value = "/{productId}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('PRODUCT_MANAGER')")
    public ResponseEntity<ProductResponseDto> uploadProductImages(
            @PathVariable String productId,
            @RequestParam("files") List<MultipartFile> files) throws IOException {
        ProductResponseDto updatedProduct = productService.uploadImages(productId, files);
        return ResponseEntity.ok(updatedProduct);
    }
}