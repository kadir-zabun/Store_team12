package org.example.onlinestorebackend.Service;

import lombok.RequiredArgsConstructor;
import org.example.onlinestorebackend.Dto.CategoryResponseDto;
import org.example.onlinestorebackend.Entity.Category;
import org.example.onlinestorebackend.Repository.CategoryRepository;
import org.example.onlinestorebackend.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;

    // Tüm kategorileri getir
    public List<CategoryResponseDto> getAllCategories() {
        List<Category> categories = categoryRepository.findAll();
        return categories.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    // ID'ye göre kategori getir
    public CategoryResponseDto getCategoryById(String categoryId) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + categoryId));
        return convertToDto(category);
    }

    // İsme göre kategori ara
    public List<CategoryResponseDto> searchCategories(String query) {
        List<Category> categories = categoryRepository.findByCategoryNameContainingIgnoreCase(query);
        return categories.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    // Kategori oluştur
    public CategoryResponseDto createCategory(Category category) {
        Category savedCategory = categoryRepository.save(category);
        return convertToDto(savedCategory);
    }

    // Entity -> DTO dönüşümü
    private CategoryResponseDto convertToDto(Category category) {
        return CategoryResponseDto.builder()
                .categoryId(category.getCategoryId())
                .categoryName(category.getCategoryName())
                .description(category.getDescription())
                .build();
    }
}