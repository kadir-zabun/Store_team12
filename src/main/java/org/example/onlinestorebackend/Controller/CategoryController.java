package org.example.onlinestorebackend.Controller;

import lombok.RequiredArgsConstructor;
import org.example.onlinestorebackend.Dto.CategoryResponseDto;
import org.example.onlinestorebackend.Entity.Category;
import org.example.onlinestorebackend.Service.CategoryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    // Tüm kategorileri listele
    @GetMapping
    public ResponseEntity<List<CategoryResponseDto>> getAllCategories() {
        List<CategoryResponseDto> categories = categoryService.getAllCategories();
        return ResponseEntity.ok(categories);
    }

    // ID'ye göre kategori getir
    @GetMapping("/{categoryId}")
    public ResponseEntity<CategoryResponseDto> getCategoryById(@PathVariable String categoryId) {
        CategoryResponseDto category = categoryService.getCategoryById(categoryId);
        return ResponseEntity.ok(category);
    }

    // Kategori ara
    @GetMapping("/search")
    public ResponseEntity<List<CategoryResponseDto>> searchCategories(@RequestParam("query") String query) {
        if (query == null || query.trim().isEmpty()) {
            return ResponseEntity.ok(List.of());
        }

        List<CategoryResponseDto> categories = categoryService.searchCategories(query);
        return ResponseEntity.ok(categories);
    }

    // Yeni kategori oluştur (Admin için - şimdilik public)
    @PostMapping
    @PreAuthorize("hasRole('PRODUCT_MANAGER')")
    public ResponseEntity<CategoryResponseDto> createCategory(@RequestBody Category category) {
        CategoryResponseDto createdCategory = categoryService.createCategory(category);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdCategory);
    }

    @DeleteMapping("/{categoryId}")
    @PreAuthorize("hasRole('PRODUCT_MANAGER')")
    public ResponseEntity<Void> deleteCategory(@PathVariable String categoryId) {
        categoryService.deleteCategory(categoryId);
        return ResponseEntity.noContent().build();
    }
}