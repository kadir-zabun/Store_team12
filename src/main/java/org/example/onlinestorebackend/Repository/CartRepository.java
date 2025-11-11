package org.example.onlinestorebackend.Repository;

import org.example.onlinestorebackend.Entity.Cart;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CartRepository extends MongoRepository<Cart, String> {

    // Kullanıcıya göre cart bulma
    Optional<Cart> findByUserId(String userId);

    // Kullanıcının cart'ı var mı?
    boolean existsByUserId(String userId);

    // Kullanıcının cart'ını silme
    void deleteByUserId(String userId);
}