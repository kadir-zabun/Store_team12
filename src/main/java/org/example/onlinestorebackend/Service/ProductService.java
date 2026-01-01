package org.example.onlinestorebackend.Service;

import lombok.RequiredArgsConstructor;
import org.example.onlinestorebackend.Dto.ProductResponseDto;
import org.example.onlinestorebackend.Dto.ReviewDto;
import org.example.onlinestorebackend.Entity.Category;
import org.example.onlinestorebackend.Entity.Product;
import org.example.onlinestorebackend.Entity.Review;
import org.example.onlinestorebackend.Repository.CategoryRepository;
import org.example.onlinestorebackend.Repository.ProductRepository;
import org.example.onlinestorebackend.Repository.ReviewRepository;
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

    // Tüm ürünleri getir (pagination ile)
    public Page<ProductResponseDto> getAllProducts(Pageable pageable) {
        String sortProperty = pageable.getSort().stream()
                .findFirst()
                .map(order -> order.getProperty())
                .orElse("productName");
        
        // Eğer price sıralaması ise, finalPrice (price - discount) üzerinden sıralama yap
        if ("price".equals(sortProperty)) {
            // Tüm ürünleri çek, finalPrice'a göre sırala, sonra pagination yap
            List<Product> allProducts = productRepository.findAll();
            boolean isDescending = pageable.getSort().stream()
                    .findFirst()
                    .map(order -> order.isDescending())
                    .orElse(false);
            
            allProducts.sort((a, b) -> {
                BigDecimal finalPriceA = a.getPrice().subtract(a.getDiscount() != null ? a.getDiscount() : BigDecimal.ZERO);
                BigDecimal finalPriceB = b.getPrice().subtract(b.getDiscount() != null ? b.getDiscount() : BigDecimal.ZERO);
                int comparison = finalPriceA.compareTo(finalPriceB);
                return isDescending ? -comparison : comparison;
            });
            
            // Pagination uygula
            int start = (int) pageable.getOffset();
            int end = Math.min(start + pageable.getPageSize(), allProducts.size());
            if (start >= end) {
                return new PageImpl<>(Collections.emptyList(), pageable, allProducts.size());
            }
            
            List<Product> pagedProducts = allProducts.subList(start, end);
            List<ProductResponseDto> dtos = pagedProducts.stream()
                    .map(this::convertToDto)
                    .collect(Collectors.toList());
            
            return new PageImpl<>(dtos, pageable, allProducts.size());
        } else {
            // Diğer sıralamalar için normal pagination
            Page<Product> products = productRepository.findAll(pageable);
            return products.map(this::convertToDto);
        }
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

    // Fiyat aralığına göre arama (indirimli fiyata göre)
    public List<ProductResponseDto> getProductsByPriceRange(BigDecimal minPrice, BigDecimal maxPrice) {
        // Tüm ürünleri çek ve indirimli fiyata göre filtrele
        // MongoDB'de hesaplanmış alan üzerinden filtreleme yapılamadığı için
        // tüm ürünleri çekip memory'de filtreliyoruz
        List<Product> allProducts = productRepository.findAll();
        
        return allProducts.stream()
                .filter(product -> {
                    // İndirimli fiyatı hesapla: price - (price * discount / 100)
                    BigDecimal price = product.getPrice() != null ? product.getPrice() : BigDecimal.ZERO;
                    BigDecimal discount = product.getDiscount() != null ? product.getDiscount() : BigDecimal.ZERO;
                    
                    // Discount yüzde olarak saklanıyor (örn: 58 = %58)
                    BigDecimal discountAmount = price.multiply(discount).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
                    BigDecimal finalPrice = price.subtract(discountAmount);
                    
                    // Fiyat aralığı kontrolü
                    return finalPrice.compareTo(minPrice) >= 0 && finalPrice.compareTo(maxPrice) <= 0;
                })
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

    // Ürün oluştur (PRODUCT_MANAGER için)
    public ProductResponseDto createProduct(Product product) {
        List<String> normalizedCategoryIds = normalizeCategoryIds(product);
        validateCategories(normalizedCategoryIds);
        product.setCategoryIds(normalizedCategoryIds);

        Product savedProduct = productRepository.save(product);
        productCategoryRelationService.syncProductCategories(savedProduct.getProductId(), normalizedCategoryIds);
        return convertToDto(savedProduct);
    }

    // Ürün güncelle (PRODUCT_MANAGER için)
    public ProductResponseDto updateProduct(String productId, Product productUpdate) {
        Product existingProduct = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + productId));

        // Update fields
        if (productUpdate.getProductName() != null) {
            existingProduct.setProductName(productUpdate.getProductName());
        }
        if (productUpdate.getDescription() != null) {
            existingProduct.setDescription(productUpdate.getDescription());
        }
        if (productUpdate.getPrice() != null) {
            existingProduct.setPrice(productUpdate.getPrice());
        }
        if (productUpdate.getDiscount() != null) {
            existingProduct.setDiscount(productUpdate.getDiscount());
        }
        if (productUpdate.getQuantity() != null) {
            existingProduct.setQuantity(productUpdate.getQuantity());
            existingProduct.setInStock(productUpdate.getQuantity() > 0);
        }
        if (productUpdate.getModel() != null) {
            existingProduct.setModel(productUpdate.getModel());
        }
        if (productUpdate.getSerialNumber() != null) {
            existingProduct.setSerialNumber(productUpdate.getSerialNumber());
        }
        if (productUpdate.getWarrantyStatus() != null) {
            existingProduct.setWarrantyStatus(productUpdate.getWarrantyStatus());
        }
        if (productUpdate.getDistributionInfo() != null) {
            existingProduct.setDistributionInfo(productUpdate.getDistributionInfo());
        }
        if (productUpdate.getImages() != null) {
            existingProduct.setImages(productUpdate.getImages());
        }
        if (productUpdate.getPopularity() != null) {
            existingProduct.setPopularity(productUpdate.getPopularity());
        }
        if (productUpdate.getCategoryIds() != null && !productUpdate.getCategoryIds().isEmpty()) {
            List<String> normalizedCategoryIds = normalizeCategoryIds(productUpdate);
            validateCategories(normalizedCategoryIds);
            existingProduct.setCategoryIds(normalizedCategoryIds);
            productCategoryRelationService.syncProductCategories(existingProduct.getProductId(), normalizedCategoryIds);
        } else if (productUpdate.getCategoryIds() != null && productUpdate.getCategoryIds().isEmpty()) {
            // Empty array means remove all categories
            existingProduct.setCategoryIds(Collections.emptyList());
            productCategoryRelationService.syncProductCategories(existingProduct.getProductId(), Collections.emptyList());
        }

        Product savedProduct = productRepository.save(existingProduct);
        return convertToDto(savedProduct);
    }

    // Tüm ürünleri getir (PRODUCT_MANAGER için - owner kontrolü yok)
    public List<ProductResponseDto> getAllProductsList() {
        List<Product> products = productRepository.findAll();
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
                .cost(product.getCost())
                .description(product.getDescription())
                .images(product.getImages())
                .inStock(product.getInStock())
                .categoryIds(categoryIds)
                .categoryNames(categories.stream().map(Category::getCategoryName).toList())
                .popularity(product.getPopularity())
                .model(product.getModel())
                .serialNumber(product.getSerialNumber())
                .warrantyStatus(product.getWarrantyStatus())
                .distributionInfo(product.getDistributionInfo())
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
        // Ratings are always visible (no approval needed)
        List<Review> reviews = reviewRepository.findByProductId(productId);
        return reviews.stream()
                .map(Review::getRating)
                .filter(rating -> rating != null)
                .collect(Collectors.toList());
    }

    public List<ReviewDto> getApprovedReviewsForProduct(String productId) {
        // Get all reviews (ratings should be visible immediately)
        // But only show comments if they are approved
        List<Review> reviews = reviewRepository.findByProductId(productId);
        return reviews.stream()
                .map(review -> {
                    ReviewDto dto = new ReviewDto();
                    dto.setReviewId(review.getReviewId());
                    dto.setProductId(review.getProductId());
                    dto.setUserId(review.getUserId());
                    dto.setOrderId(review.getOrderId());
                    dto.setRating(review.getRating() != null ? review.getRating() : 0);
                    // Only include comment if it's approved
                    dto.setComment(review.getApproved() != null && review.getApproved() ? review.getComment() : null);
                    dto.setApproved(review.getApproved());
                    dto.setCreatedAt(review.getCreatedAt());
                    
                    // Review'da userId aslında username olarak saklanıyor (authentication.getName() kullanılıyor)
                    // O yüzden direkt olarak username olarak kullanabiliriz
                    dto.setUsername(review.getUserId());
                    
                    return dto;
                })
                .collect(Collectors.toList());
    }

    // Ürün silme (PRODUCT_MANAGER için - owner kontrolü yok)
    public void deleteProduct(String productId) {
        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Product not found with id: " + productId);
        }

        productRepository.deleteById(productId);
    }

    // Ürün yorumlarını listeleme (PRODUCT_MANAGER için - owner kontrolü yok)
    public List<ReviewDto> getProductReviews(String productId) {
        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Product not found with id: " + productId);
        }

        List<Review> reviews = reviewRepository.findByProductId(productId);
        return reviews.stream()
                .map(review -> {
                    ReviewDto dto = new ReviewDto();
                    dto.setOrderId(null);
                    dto.setProductId(review.getProductId());
                    dto.setComment(review.getComment());
                    dto.setRating(review.getRating() != null ? review.getRating() : 0);
                    dto.setReviewId(review.getReviewId());
                    dto.setUserId(review.getUserId());
                    dto.setApproved(review.getApproved());
                    dto.setCreatedAt(review.getCreatedAt());
                    
                    // Review'da userId aslında username olarak saklanıyor (authentication.getName() kullanılıyor)
                    // O yüzden direkt olarak username olarak kullanabiliriz
                    dto.setUsername(review.getUserId());
                    
                    return dto;
                })
                .collect(Collectors.toList());
    }

    // Yorum onaylama (PRODUCT_MANAGER için - owner kontrolü yok)
    public void approveReview(String reviewId) {
        Review review = reviewRepository.findByReviewId(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found with id: " + reviewId));

        Product product = productRepository.findById(review.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

        review.setApproved(true);
        reviewRepository.save(review);

        // Product'ın reviewIds listesine ekle (eğer yoksa)
        if (!product.getReviewIds().contains(reviewId)) {
            product.getReviewIds().add(reviewId);
            productRepository.save(product);
        }
    }

    // Yorum reddetme (silme) (PRODUCT_MANAGER için - owner kontrolü yok)
    public void rejectReview(String reviewId) {
        Review review = reviewRepository.findByReviewId(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found with id: " + reviewId));

        Product product = productRepository.findById(review.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

        review.setApproved(false);
        review.setComment(null);

        reviewRepository.save(review);
    }

    // PRODUCT_MANAGER: stock update
    public ProductResponseDto updateStock(String productId, Integer quantity) {
        if (quantity == null || quantity < 0) {
            throw new org.example.onlinestorebackend.exception.InvalidRequestException("quantity must be >= 0");
        }
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + productId));

        product.setQuantity(quantity);
        product.setInStock(quantity > 0);
        return convertToDto(productRepository.save(product));
    }

    // PRODUCT_MANAGER: cost update
    public ProductResponseDto updateCost(String productId, BigDecimal cost) {
        if (cost == null || cost.compareTo(BigDecimal.ZERO) < 0) {
            throw new org.example.onlinestorebackend.exception.InvalidRequestException("cost must be >= 0");
        }
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + productId));

        product.setCost(cost);
        return convertToDto(productRepository.save(product));
    }
}