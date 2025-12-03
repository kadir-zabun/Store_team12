package org.example.onlinestorebackend.Service;

import lombok.RequiredArgsConstructor;
import org.example.onlinestorebackend.Dto.ProductResponseDto;
import org.example.onlinestorebackend.Dto.ReviewDto;
import org.example.onlinestorebackend.Entity.Category;
import org.example.onlinestorebackend.Entity.Product;
import org.example.onlinestorebackend.Entity.Review;
import org.example.onlinestorebackend.Entity.User;
import org.example.onlinestorebackend.Repository.CategoryRepository;
import org.example.onlinestorebackend.Repository.ProductRepository;
import org.example.onlinestorebackend.Repository.ReviewRepository;
import org.example.onlinestorebackend.Repository.UserRepository;
import org.example.onlinestorebackend.exception.ResourceNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ProductCategoryRelationService productCategoryRelationService;
    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;

    // Tüm ürünleri getir (pagination ile)
    public Page<ProductResponseDto> getAllProducts(Pageable pageable) {
        Page<Product> products = productRepository.findAll(pageable);
        return products.map(this::convertToDto);
    }

    // ID'ye göre ürün getir
    public ProductResponseDto getProductById(String productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + productId));
        return convertToDto(product);
    }

    // Kategoriye göre ürünleri getir (pagination ile)
    public Page<ProductResponseDto> getProductsByCategory(String categoryId, Pageable pageable) {
        // Önce kategori var mı kontrol et
        categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + categoryId));

        // CategoryId'ye göre filtrele
        List<String> productIds = productCategoryRelationService.getProductIdsForCategory(categoryId);
        if (productIds.isEmpty()) {
            return Page.empty(pageable);
        }

        List<Product> allProducts = new ArrayList<>();
        productRepository.findAllById(productIds).forEach(allProducts::add);

        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), allProducts.size());
        if (start >= end) {
            return new PageImpl<>(Collections.emptyList(), pageable, allProducts.size());
        }

        List<ProductResponseDto> dtos = allProducts.subList(start, end).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());

        return new PageImpl<>(dtos, pageable, allProducts.size());
    }

    // Ürün arama (isim veya açıklama)
    public List<ProductResponseDto> searchProducts(String query) {
        List<Product> products = productRepository
                .findByProductNameContainingIgnoreCaseOrDescriptionContainingIgnoreCase(query, query);
        return products.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    // Fiyat aralığına göre arama
    public List<ProductResponseDto> getProductsByPriceRange(BigDecimal minPrice, BigDecimal maxPrice) {
        List<Product> products = productRepository.findByPriceBetween(minPrice, maxPrice);
        return products.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    // Stokta olan ürünler
    public List<ProductResponseDto> getInStockProducts() {
        List<Product> products = productRepository.findByInStockTrue();
        return products.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    // Ürün oluştur (owner bilgisi ile)
    public ProductResponseDto createProductForOwner(Product product, String ownerId) {
        List<String> normalizedCategoryIds = normalizeCategoryIds(product);
        validateCategories(normalizedCategoryIds);
        product.setCategoryIds(normalizedCategoryIds);
        product.setOwnerId(ownerId);

        Product savedProduct = productRepository.save(product);
        productCategoryRelationService.syncProductCategories(savedProduct.getProductId(), normalizedCategoryIds);
        return convertToDto(savedProduct);
    }

    public List<ProductResponseDto> getProductsByOwner(String ownerId) {
        List<Product> products = productRepository.findByOwnerId(ownerId);
        return products.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    // Entity -> DTO dönüşümü
    private ProductResponseDto convertToDto(Product product) {
        List<String> categoryIds = productCategoryRelationService.getCategoryIdsForProduct(product.getProductId());
        List<Category> categories = categoryIds.isEmpty()
                ? Collections.emptyList()
                : categoryRepository.findAllById(categoryIds);

        ProductResponseDto dto = ProductResponseDto.builder()
                .productId(product.getProductId())
                .productName(product.getProductName())
                .quantity(product.getQuantity())
                .price(product.getPrice())
                .discount(product.getDiscount())
                .description(product.getDescription())
                .images(product.getImages())
                .inStock(product.getInStock())
                .categoryIds(categoryIds)
                .categoryNames(categories.stream().map(Category::getCategoryName).toList())
                .build();

        return dto;
    }

    private List<String> normalizeCategoryIds(Product product) {
        if (CollectionUtils.isEmpty(product.getCategoryIds())) {
            return Collections.emptyList();
        }

        return product.getCategoryIds().stream()
                .filter(id -> id != null && !id.isBlank())
                .distinct()
                .toList();
    }

    private void validateCategories(List<String> categoryIds) {
        if (CollectionUtils.isEmpty(categoryIds)) {
            return;
        }

        List<Category> categories = categoryRepository.findAllById(categoryIds);
        if (categories.size() != categoryIds.size()) {
            throw new ResourceNotFoundException("One or more categories were not found.");
        }
    }

    public List<String> getReviewCommentsByProductId(String productId) {
        Product product = productRepository.findByProductId(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product with id: " + productId));

        List<String> reviewIds = product.getReviewIds();

        List<String> reviewComments = new ArrayList<>();
        for (String reviewId : reviewIds) {
            Review review = reviewRepository.findByReviewId(reviewId)
                    .orElseThrow(() -> new ResourceNotFoundException("Review with id: " + reviewId));

            if (review.getApproved()) {
                reviewComments.add(review.getComment());
            }
        }

        return reviewComments;
    }

    public List<Integer> getReviewRatingsByProductId(String productId) {
        Product product = productRepository.findByProductId(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product with id: " + productId));

        List<String> reviewIds = product.getReviewIds();

        List<Integer> reviewRatings = new ArrayList<>();
        for (String reviewId : reviewIds) {
            Review review = reviewRepository.findByReviewId(reviewId)
                    .orElseThrow(() -> new ResourceNotFoundException("Review with id: " + reviewId));

            reviewRatings.add(review.getRating());
        }

        return reviewRatings;
    }

    // Owner'ın kendi ürününü silmesi
    public void deleteProductByOwner(String productId, String ownerUsername) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + productId));

        User owner = userRepository.findByUsername(ownerUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + ownerUsername));

        if (!product.getOwnerId().equals(owner.getUserId())) {
            throw new org.example.onlinestorebackend.exception.InvalidRequestException(
                    "You can only delete your own products");
        }

        productRepository.delete(product);
    }

    // Owner'ın kendi ürününün yorumlarını listeleme
    public List<ReviewDto> getProductReviewsForOwner(String productId, String ownerUsername) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + productId));

        User owner = userRepository.findByUsername(ownerUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + ownerUsername));

        if (!product.getOwnerId().equals(owner.getUserId())) {
            throw new org.example.onlinestorebackend.exception.InvalidRequestException(
                    "You can only view reviews for your own products");
        }

        List<Review> reviews = reviewRepository.findByProductId(productId);
        return reviews.stream()
                .map(review -> new ReviewDto(
                        null, // orderId bu akışta dönmüyor
                        review.getProductId(),
                        review.getComment(),
                        review.getRating(),
                        review.getReviewId(),
                        review.getUserId(),
                        review.getApproved()
                ))
                .collect(Collectors.toList());
    }

    // Yorum onaylama
    public void approveReview(String reviewId, String ownerUsername) {
        Review review = reviewRepository.findByReviewId(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found with id: " + reviewId));

        Product product = productRepository.findById(review.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

        User owner = userRepository.findByUsername(ownerUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + ownerUsername));

        if (!product.getOwnerId().equals(owner.getUserId())) {
            throw new org.example.onlinestorebackend.exception.InvalidRequestException(
                    "You can only approve reviews for your own products");
        }

        review.setApproved(true);
        reviewRepository.save(review);

        // Product'ın reviewIds listesine ekle (eğer yoksa)
        if (!product.getReviewIds().contains(reviewId)) {
            product.getReviewIds().add(reviewId);
            productRepository.save(product);
        }
    }

    // Yorum reddetme (silme)
    public void rejectReview(String reviewId, String ownerUsername) {
        Review review = reviewRepository.findByReviewId(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found with id: " + reviewId));

        Product product = productRepository.findById(review.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

        User owner = userRepository.findByUsername(ownerUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + ownerUsername));

        if (!product.getOwnerId().equals(owner.getUserId())) {
            throw new org.example.onlinestorebackend.exception.InvalidRequestException(
                    "You can only reject reviews for your own products");
        }

        // Product'ın reviewIds listesinden çıkar
        product.getReviewIds().remove(reviewId);
        productRepository.save(product);

        // Review'i sil
        reviewRepository.delete(review);
    }
}