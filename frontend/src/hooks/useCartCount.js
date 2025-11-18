import { useState, useEffect } from "react";
import cartApi from "../api/cartApi";
import { cartStorage } from "../utils/cartStorage";

/**
 * Custom hook to get and track cart item count
 * Works for both logged-in users (via API) and guests (via localStorage)
 */
export function useCartCount() {
    const [cartCount, setCartCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const updateCartCount = async () => {
        const token = localStorage.getItem("access_token");
        
        if (!token) {
            // Guest user - get count from localStorage
            const guestCart = cartStorage.getCart();
            const count = guestCart.items.reduce((sum, item) => sum + item.quantity, 0);
            setCartCount(count);
            setLoading(false);
            return;
        }

        // Logged-in user - get count from API
        try {
            const response = await cartApi.getCart();
            const apiResponse = response.data;
            
            let cart = null;
            if (apiResponse && apiResponse.data) {
                cart = apiResponse.data;
            } else if (apiResponse) {
                cart = apiResponse;
            }

            if (cart && cart.items) {
                const count = cart.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
                setCartCount(count);
            } else {
                setCartCount(0);
            }
        } catch (err) {
            console.error("Error fetching cart count:", err);
            // If API fails, fall back to localStorage
            const guestCart = cartStorage.getCart();
            const count = guestCart.items.reduce((sum, item) => sum + item.quantity, 0);
            setCartCount(count);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        updateCartCount();

        // Listen for cart updates (for guest users)
        const handleCartUpdated = () => {
            updateCartCount();
        };

        // Listen for token changes (login/logout)
        const handleTokenSet = () => {
            updateCartCount();
        };

        // Listen for storage changes
        const handleStorageChange = (e) => {
            if (e.key === "access_token" || e.key === "guest_cart" || !e.key) {
                updateCartCount();
            }
        };

        window.addEventListener("cartUpdated", handleCartUpdated);
        window.addEventListener("tokenSet", handleTokenSet);
        window.addEventListener("storage", handleStorageChange);

        // Also poll periodically for logged-in users to catch changes from other tabs
        const intervalId = setInterval(() => {
            const token = localStorage.getItem("access_token");
            if (token) {
                updateCartCount();
            }
        }, 3000); // Check every 3 seconds

        return () => {
            window.removeEventListener("cartUpdated", handleCartUpdated);
            window.removeEventListener("tokenSet", handleTokenSet);
            window.removeEventListener("storage", handleStorageChange);
            clearInterval(intervalId);
        };
    }, []);

    return { cartCount, loading, refreshCartCount: updateCartCount };
}

