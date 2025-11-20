package org.example.onlinestorebackend.Service;

import lombok.RequiredArgsConstructor;
import org.example.onlinestorebackend.Entity.ProductCategoryRelation;
import org.example.onlinestorebackend.Repository.ProductCategoryRelationRepository;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductCategoryRelationService {

    private final ProductCategoryRelationRepository relationRepository;

    public void syncProductCategories(String productId, List<String> categoryIds) {
        relationRepository.deleteByProductId(productId);

        if (CollectionUtils.isEmpty(categoryIds)) {
            return;
        }

        List<ProductCategoryRelation> relations = categoryIds.stream()
                .filter(Objects::nonNull)
                .distinct()
                .map(categoryId -> ProductCategoryRelation.builder()
                        .productId(productId)
                        .categoryId(categoryId)
                        .createdAt(Instant.now())
                        .build())
                .collect(Collectors.toList());

        relationRepository.saveAll(relations);
    }

    public List<String> getCategoryIdsForProduct(String productId) {
        if (productId == null) {
            return Collections.emptyList();
        }

        return relationRepository.findByProductId(productId).stream()
                .map(ProductCategoryRelation::getCategoryId)
                .toList();
    }

    public List<String> getProductIdsForCategory(String categoryId) {
        if (categoryId == null) {
            return Collections.emptyList();
        }

        return relationRepository.findByCategoryId(categoryId).stream()
                .map(ProductCategoryRelation::getProductId)
                .toList();
    }
}

