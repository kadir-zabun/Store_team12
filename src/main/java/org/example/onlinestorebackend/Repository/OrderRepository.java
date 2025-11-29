package org.example.onlinestorebackend.Repository;

import org.example.onlinestorebackend.Entity.Order;
import org.example.onlinestorebackend.Entity.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends MongoRepository<Order, String> {

    // Belirli kullanıcının tüm siparişleri
    List<Order> findByCustomerId(String customerId);

    // Sipariş durumuna göre filtreleme
    List<Order> findByStatus(String status);

    // Belirli bir zaman aralığındaki siparişler (örneğin gelir hesaplama)
    List<Order> findByOrderDateBetween(java.time.LocalDateTime start, java.time.LocalDateTime end);

    @Query("{ 'orderId' : ?0 }")
    Optional<Order> findByOrderId(String orderId);
}