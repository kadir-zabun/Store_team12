package org.example.onlinestorebackend.Service;

import org.example.onlinestorebackend.Entity.Delivery;
import org.example.onlinestorebackend.Repository.DeliveryRepository;
import org.example.onlinestorebackend.exception.InvalidRequestException;
import org.example.onlinestorebackend.exception.ResourceNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DeliveryServiceTest {

    @Mock private DeliveryRepository deliveryRepository;

    @InjectMocks
    private DeliveryService deliveryService;

    @Test
    void list_nullCompleted_returnsAll() {
        when(deliveryRepository.findAll()).thenReturn(List.of(new Delivery()));
        assertEquals(1, deliveryService.list(null).size());
        verify(deliveryRepository).findAll();
    }

    @Test
    void updateCompleted_requiresCompleted() {
        assertThrows(InvalidRequestException.class, () -> deliveryService.updateCompleted("d1", null));
    }

    @Test
    void updateCompleted_deliveryNotFound_throws() {
        when(deliveryRepository.findById("d1")).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> deliveryService.updateCompleted("d1", true));
    }

    @Test
    void updateCompleted_updatesAndSaves() {
        Delivery d = new Delivery();
        d.setDeliveryId("d1");
        d.setCompleted(false);

        when(deliveryRepository.findById("d1")).thenReturn(Optional.of(d));
        when(deliveryRepository.save(any(Delivery.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Delivery updated = deliveryService.updateCompleted("d1", true);
        assertTrue(updated.getCompleted());
        verify(deliveryRepository).save(any(Delivery.class));
    }

    @Test
    void updateAddress_requiresNonBlankAddress() {
        assertThrows(InvalidRequestException.class, () -> deliveryService.updateAddress("d1", " "));
    }
}


