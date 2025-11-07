package org.example.onlinestorebackend.Repository;

import org.example.onlinestorebackend.Entity.Category;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends MongoRepository<Category, String> {

    // Ada göre tek kategori
    Optional<Category> findByCategoryName(String categoryName);

    // Ada göre case-insensitive arama (liste döner)
    List<Category> findByCategoryNameContainingIgnoreCase(String partialName);

    // ID ile
    @Query("{ 'categoryId' : ?0 }")
    Optional<Category> findByCategoryId(String categoryId);
}
