package org.example.onlinestorebackend.Repository;

import org.example.onlinestorebackend.Entity.RefundRequest;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface RefundRequestRepository extends MongoRepository<RefundRequest, String> {
    List<RefundRequest> findByUserId(String userId);
    List<RefundRequest> findByApproved(Boolean approved);
    List<RefundRequest> findByRequestDateBetween(LocalDateTime start, LocalDateTime end);
}
