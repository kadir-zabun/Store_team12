package org.example.onlinestorebackend.Service;

import lombok.RequiredArgsConstructor;
import org.example.onlinestorebackend.Entity.Delivery;
import org.example.onlinestorebackend.Repository.DeliveryRepository;
import org.example.onlinestorebackend.exception.InvalidRequestException;
import org.example.onlinestorebackend.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DeliveryService {

    private final DeliveryRepository deliveryRepository;

    public List<Delivery> list(Boolean completed) {
        if (completed == null) {
            return deliveryRepository.findAll();
        }
        return deliveryRepository.findByCompleted(completed);
    }

    public List<Delivery> byOrder(String orderId) {
        return deliveryRepository.findByOrderId(orderId);
    }

    public List<Delivery> byCustomer(String customerId) {
        return deliveryRepository.findByCustomerId(customerId);
    }

    @Transactional
    public Delivery updateCompleted(String deliveryId, Boolean completed) {
        if (completed == null) {
            throw new InvalidRequestException("completed is required");
        }
        Delivery d = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new ResourceNotFoundException("Delivery not found: " + deliveryId));
        d.setCompleted(completed);
        return deliveryRepository.save(d);
    }

    @Transactional
    public Delivery updateAddress(String deliveryId, String address) {
        if (address == null || address.isBlank()) {
            throw new InvalidRequestException("deliveryAddress is required");
        }
        Delivery d = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new ResourceNotFoundException("Delivery not found: " + deliveryId));
        d.setDeliveryAddress(address.trim());
        return deliveryRepository.save(d);
    }
}


