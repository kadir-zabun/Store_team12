package org.example.onlinestorebackend.Repository;

import org.example.onlinestorebackend.Entity.Delivery;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DeliveryRepository extends MongoRepository<Delivery, String> {
    List<Delivery> findByOrderId(String orderId);
    List<Delivery> findByCustomerId(String customerId);
    List<Delivery> findByCompleted(Boolean completed);
}
