package org.example.onlinestorebackend.Service;

import org.example.onlinestorebackend.Entity.WishList;
import org.example.onlinestorebackend.Repository.WishListRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WishListServiceTest {

    @Mock private WishListRepository wishListRepository;
    @Mock private UserService userService;

    @InjectMocks
    private WishListService wishListService;

    @Test
    void addProduct_createsWishlistIfMissing_andAddsUniqueProduct() {
        String username = "u";
        String userId = "uid";
        String productId = "p1";

        when(userService.getUserIdByUsername(username)).thenReturn(userId);
        when(wishListRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(wishListRepository.save(any(WishList.class))).thenAnswer(invocation -> invocation.getArgument(0));

        WishList wl = wishListService.addProduct(username, productId);

        assertEquals(userId, wl.getUserId());
        assertTrue(wl.getProductIds().contains(productId));

        // calling again should not duplicate
        when(wishListRepository.findByUserId(userId)).thenReturn(Optional.of(wl));
        WishList wl2 = wishListService.addProduct(username, productId);
        assertEquals(1, wl2.getProductIds().stream().filter(productId::equals).count());
    }

    @Test
    void removeProduct_removesIfExists() {
        String username = "u";
        String userId = "uid";
        String productId = "p1";

        WishList existing = new WishList();
        existing.setWishListId(UUID.randomUUID().toString());
        existing.setUserId(userId);
        existing.getProductIds().add(productId);
        existing.setCreatedAt(LocalDateTime.now());
        existing.setUpdatedAt(LocalDateTime.now());

        when(userService.getUserIdByUsername(username)).thenReturn(userId);
        when(wishListRepository.findByUserId(userId)).thenReturn(Optional.of(existing));
        when(wishListRepository.save(any(WishList.class))).thenAnswer(invocation -> invocation.getArgument(0));

        WishList wl = wishListService.removeProduct(username, productId);
        assertFalse(wl.getProductIds().contains(productId));
    }
}


