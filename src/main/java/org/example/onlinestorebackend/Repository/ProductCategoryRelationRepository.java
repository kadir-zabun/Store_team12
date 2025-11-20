package org.example.onlinestorebackend.Repository;

import org.example.onlinestorebackend.Entity.ProductCategoryRelation;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductCategoryRelationRepository extends MongoRepository<ProductCategoryRelation, String> {

    List<ProductCategoryRelation> findByProductId(String productId);

    List<ProductCategoryRelation> findByCategoryId(String categoryId);

    void deleteByProductId(String productId);
}

