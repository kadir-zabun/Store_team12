package org.example.onlinestorebackend.Service;

import org.example.onlinestorebackend.Entity.Category;
import org.example.onlinestorebackend.Repository.CategoryRepository;
import org.example.onlinestorebackend.exception.ResourceNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

    @Mock private CategoryRepository categoryRepository;
    @InjectMocks private CategoryService categoryService;

    @Test
    void deleteCategory_notFound_throws() {
        when(categoryRepository.findById("c1")).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> categoryService.deleteCategory("c1"));
    }

    @Test
    void deleteCategory_existing_deletes() {
        Category c = new Category();
        c.setCategoryId("c1");
        when(categoryRepository.findById("c1")).thenReturn(Optional.of(c));

        categoryService.deleteCategory("c1");
        verify(categoryRepository).delete(c);
    }
}


