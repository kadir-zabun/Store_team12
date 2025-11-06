package org.example.onlinestorebackend.Repository;

import org.example.onlinestorebackend.Entity.Invoice;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface InvoiceRepository extends MongoRepository<Invoice, String> {
    Invoice findByOrderId(String orderId);
    List<Invoice> findByInvoiceDateBetween(LocalDateTime start, LocalDateTime end);
}
