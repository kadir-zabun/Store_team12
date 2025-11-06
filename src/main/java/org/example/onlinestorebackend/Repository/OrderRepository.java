package org.example.onlinestorebackend.Repository;

import org.example.onlinestorebackend.Entity.Order;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRepository extends MongoRepository<Order, String> {

    // Belirli kullanıcının tüm siparişleri
    List<Order> findByCustomerId(String customerId);

    // Sipariş durumuna göre filtreleme
    List<Order> findByStatus(String status);

    // Belirli bir zaman aralığındaki siparişler (örneğin gelir hesaplama)
    List<Order> findByOrderDateBetween(java.time.LocalDateTime start, java.time.LocalDateTime end);
}

// orderItem is embedded, so we don't need different repository for OrderItem class
