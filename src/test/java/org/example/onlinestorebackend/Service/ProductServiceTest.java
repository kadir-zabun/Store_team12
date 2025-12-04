package org.example.onlinestorebackend.Service;

import org.example.onlinestorebackend.Dto.ProductResponseDto;
import org.example.onlinestorebackend.Entity.Category;
import org.example.onlinestorebackend.Entity.Product;
import org.example.onlinestorebackend.Entity.User;
import org.example.onlinestorebackend.Repository.CategoryRepository;
import org.example.onlinestorebackend.Repository.ProductRepository;
import org.example.onlinestorebackend.Repository.ReviewRepository;
import org.example.onlinestorebackend.Repository.UserRepository;
import org.example.onlinestorebackend.exception.InvalidRequestException;
import org.example.onlinestorebackend.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private ProductCategoryRelationService productCategoryRelationService;

    @Mock
    private ReviewRepository reviewRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ProductService productService;

    private Product product;
    private Category category;
    private User owner;

    @BeforeEach
    void setUp() {
        product = new Product();
        product.setProductId(UUID.randomUUID().toString());
        product.setProductName("Test Product");
        product.setPrice(new BigDecimal("99.99"));
        product.setQuantity(10);
        product.setInStock(true);
        product.setDescription("Test Description");
        product.setCategoryIds(new ArrayList<>());
        product.setOwnerId(UUID.randomUUID().toString());

        category = new Category();
        category.setCategoryId(UUID.randomUUID().toString());
        category.setCategoryName("Electronics");

        owner = new User();
        owner.setUserId(product.getOwnerId());
        owner.setUsername("owner");
        owner.setRole("PRODUCT_OWNER");
    }

    @Test
    void getProductById_validId_returnsProductResponseDto() {
        // Given
        when(productRepository.findById(product.getProductId())).thenReturn(Optional.of(product));
        when(productCategoryRelationService.getCategoryIdsForProduct(product.getProductId()))
                .thenReturn(Collections.emptyList());

        // When
        ProductResponseDto result = productService.getProductById(product.getProductId());

        // Then
        assertNotNull(result);
        assertEquals(product.getProductId(), result.getProductId());
        assertEquals(product.getProductName(), result.getProductName());
        verify(productRepository).findById(product.getProductId());
    }

    @Test
    void getProductById_invalidId_throwsResourceNotFoundException() {
        // Given
        String invalidId = "invalid-id";
        when(productRepository.findById(invalidId)).thenReturn(Optional.empty());

        // When & Then
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> {
            productService.getProductById(invalidId);
        });

        assertTrue(exception.getMessage().contains("Product not found"));
        verify(productRepository).findById(invalidId);
    }

    @Test
    void getAllProducts_withPagination_returnsPageOfProducts() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        List<Product> products = Arrays.asList(product);
        Page<Product> productPage = new PageImpl<>(products, pageable, 1);
        when(productRepository.findAll(pageable)).thenReturn(productPage);
        when(productCategoryRelationService.getCategoryIdsForProduct(anyString()))
                .thenReturn(Collections.emptyList());

        // When
        Page<ProductResponseDto> result = productService.getAllProducts(pageable);

        // Then
        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        verify(productRepository).findAll(pageable);
    }

    @Test
    void createProductForOwner_validProduct_returnsProductResponseDto() {
        // Given
        String ownerId = UUID.randomUUID().toString();
        product.setCategoryIds(Arrays.asList(category.getCategoryId()));
        when(categoryRepository.findAllById(anyList())).thenReturn(Arrays.asList(category));
        when(productRepository.save(any(Product.class))).thenReturn(product);
        when(productCategoryRelationService.getCategoryIdsForProduct(anyString()))
                .thenReturn(Arrays.asList(category.getCategoryId()));

        // When
        ProductResponseDto result = productService.createProductForOwner(product, ownerId);

        // Then
        assertNotNull(result);
        assertEquals(ownerId, product.getOwnerId());
        verify(productRepository).save(any(Product.class));
        verify(productCategoryRelationService).syncProductCategories(anyString(), anyList());
    }

    @Test
    void deleteProductByOwner_validOwner_deletesProduct() {
        // Given
        when(productRepository.findById(product.getProductId())).thenReturn(Optional.of(product));
        when(userRepository.findByUsername(owner.getUsername())).thenReturn(Optional.of(owner));

        // When
        productService.deleteProductByOwner(product.getProductId(), owner.getUsername());

        // Then
        verify(productRepository).delete(product);
    }

    @Test
    void deleteProductByOwner_invalidOwner_throwsInvalidRequestException() {
        // Given
        User differentOwner = new User();
        differentOwner.setUserId(UUID.randomUUID().toString());
        differentOwner.setUsername("differentOwner");
        when(productRepository.findById(product.getProductId())).thenReturn(Optional.of(product));
        when(userRepository.findByUsername(differentOwner.getUsername())).thenReturn(Optional.of(differentOwner));

        // When & Then
        InvalidRequestException exception = assertThrows(InvalidRequestException.class, () -> {
            productService.deleteProductByOwner(product.getProductId(), differentOwner.getUsername());
        });

        assertTrue(exception.getMessage().contains("You can only delete your own products"));
        verify(productRepository, never()).delete(any(Product.class));
    }

    @Test
    void searchProducts_withQuery_returnsMatchingProducts() {
        // Given
        String query = "Test";
        List<Product> products = Arrays.asList(product);
        when(productRepository.findByProductNameContainingIgnoreCaseOrDescriptionContainingIgnoreCase(query, query))
                .thenReturn(products);
        when(productCategoryRelationService.getCategoryIdsForProduct(anyString()))
                .thenReturn(Collections.emptyList());

        // When
        List<ProductResponseDto> result = productService.searchProducts(query);

        // Then
        assertNotNull(result);
        assertEquals(1, result.size());
        verify(productRepository).findByProductNameContainingIgnoreCaseOrDescriptionContainingIgnoreCase(query, query);
    }
}

