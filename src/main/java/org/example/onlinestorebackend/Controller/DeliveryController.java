package org.example.onlinestorebackend.Controller;

import lombok.RequiredArgsConstructor;
import org.example.onlinestorebackend.Entity.Delivery;
import org.example.onlinestorebackend.Service.DeliveryService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/deliveries")
@RequiredArgsConstructor
@PreAuthorize("hasRole('PRODUCT_MANAGER')")
public class DeliveryController {

    private final DeliveryService deliveryService;

    @GetMapping
    public ResponseEntity<List<Delivery>> list(@RequestParam(required = false) Boolean completed) {
        return ResponseEntity.ok(deliveryService.list(completed));
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<List<Delivery>> byOrder(@PathVariable String orderId) {
        return ResponseEntity.ok(deliveryService.byOrder(orderId));
    }

    @GetMapping("/customer/{customerId}")
    public ResponseEntity<List<Delivery>> byCustomer(@PathVariable String customerId) {
        return ResponseEntity.ok(deliveryService.byCustomer(customerId));
    }

    @PutMapping("/{deliveryId}/completed")
    public ResponseEntity<Delivery> updateCompleted(@PathVariable String deliveryId,
                                                    @RequestParam Boolean completed) {
        return ResponseEntity.ok(deliveryService.updateCompleted(deliveryId, completed));
    }

    @PutMapping("/{deliveryId}/address")
    public ResponseEntity<Delivery> updateAddress(@PathVariable String deliveryId,
                                                  @RequestParam String deliveryAddress) {
        return ResponseEntity.ok(deliveryService.updateAddress(deliveryId, deliveryAddress));
    }
}


