package org.example.onlinestorebackend.Controller;

import lombok.RequiredArgsConstructor;
import org.example.onlinestorebackend.Entity.WishList;
import org.example.onlinestorebackend.Service.WishListService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/wishlist")
@RequiredArgsConstructor
public class WishListController {

    private final WishListService wishListService;

    @GetMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<WishList> getMyWishList(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(wishListService.getMyWishList(userDetails.getUsername()));
    }

    @PostMapping("/items/{productId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<WishList> add(@PathVariable String productId,
                                        @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(wishListService.addProduct(userDetails.getUsername(), productId));
    }

    @DeleteMapping("/items/{productId}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<WishList> remove(@PathVariable String productId,
                                           @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(wishListService.removeProduct(userDetails.getUsername(), productId));
    }
}