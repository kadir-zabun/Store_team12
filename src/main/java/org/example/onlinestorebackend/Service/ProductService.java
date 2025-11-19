package org.example.onlinestorebackend.Service;

import lombok.RequiredArgsConstructor;
import org.example.onlinestorebackend.Dto.ProductResponseDto;
import org.example.onlinestorebackend.Entity.Category;
import org.example.onlinestorebackend.Entity.Product;
import org.example.onlinestorebackend.Repository.CategoryRepository;
import org.example.onlinestorebackend.Repository.ProductRepository;
import org.example.onlinestorebackend.exception.ResourceNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

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
        List<Product> allProducts = productRepository.findByCategoryId(categoryId);

        // Manual pagination uygula
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), allProducts.size());

        List<ProductResponseDto> dtos = allProducts.subList(start, end).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());

        return new org.springframework.data.domain.PageImpl<>(
                dtos,
                pageable,
                allProducts.size()
        );
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

    // Ürün oluştur
    public ProductResponseDto createProduct(Product product) {
        // CategoryId varsa kategori kontrolü yap
        if (product.getCategoryId() != null) {
            categoryRepository.findById(product.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + product.getCategoryId()));
        }

        Product savedProduct = productRepository.save(product);
        return convertToDto(savedProduct);
    }

    // Entity -> DTO dönüşümü
    private ProductResponseDto convertToDto(Product product) {
        ProductResponseDto dto = ProductResponseDto.builder()
                .productId(product.getProductId())
                .productName(product.getProductName())
                .quantity(product.getQuantity())
                .price(product.getPrice())
                .discount(product.getDiscount())
                .description(product.getDescription())
                .images(product.getImages())
                .inStock(product.getInStock())
                .categoryId(product.getCategoryId())
                .build();

        // Category adını da ekleyelim
        if (product.getCategoryId() != null) {
            categoryRepository.findById(product.getCategoryId())
                    .ifPresent(category -> dto.setCategoryName(category.getCategoryName()));
        }

        return dto;
    }
}