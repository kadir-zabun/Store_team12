package org.example.onlinestorebackend.Repository;

import org.example.onlinestorebackend.Entity.WishList;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface WishListRepository extends MongoRepository<WishList, String> {
    Optional<WishList> findByUserId(String userId);
    List<WishList> findByProductIdsContaining(String productId);
}