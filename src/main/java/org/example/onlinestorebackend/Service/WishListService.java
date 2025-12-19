package org.example.onlinestorebackend.Service;

import lombok.RequiredArgsConstructor;
import org.example.onlinestorebackend.Entity.WishList;
import org.example.onlinestorebackend.Repository.WishListRepository;
import org.example.onlinestorebackend.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WishListService {

    private final WishListRepository wishListRepository;
    private final UserService userService;

    public WishList getOrCreateForUsername(String username) {
        String userId = userService.getUserIdByUsername(username);
        return getOrCreateForUserId(userId);
    }

    public WishList getOrCreateForUserId(String userId) {
        return wishListRepository.findByUserId(userId)
                .orElseGet(() -> {
                    WishList wl = new WishList();
                    wl.setWishListId(UUID.randomUUID().toString());
                    wl.setUserId(userId);
                    wl.setCreatedAt(LocalDateTime.now());
                    wl.setUpdatedAt(LocalDateTime.now());
                    return wishListRepository.save(wl);
                });
    }

    @Transactional
    public WishList addProduct(String username, String productId) {
        WishList wl = getOrCreateForUsername(username);
        if (!wl.getProductIds().contains(productId)) {
            wl.getProductIds().add(productId);
            wl.setUpdatedAt(LocalDateTime.now());
            wl = wishListRepository.save(wl);
        }
        return wl;
    }

    @Transactional
    public WishList removeProduct(String username, String productId) {
        WishList wl = getOrCreateForUsername(username);
        wl.getProductIds().removeIf(id -> id != null && id.equals(productId));
        wl.setUpdatedAt(LocalDateTime.now());
        return wishListRepository.save(wl);
    }

    public WishList getMyWishList(String username) {
        return getOrCreateForUsername(username);
    }

    public List<WishList> findWishListsContainingProduct(String productId) {
        return wishListRepository.findByProductIdsContaining(productId);
    }

    public WishList getByUserId(String userId) {
        return wishListRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Wishlist not found for userId: " + userId));
    }
}