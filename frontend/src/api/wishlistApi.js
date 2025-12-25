import axiosClient from "./axiosClient";

const wishlistApi = {
    // Get user's wishlist
    getWishlist: () => axiosClient.get("/api/wishlist"),

    // Add product to wishlist
    addToWishlist: (productId) =>
        axiosClient.post(`/api/wishlist/items/${productId}`),

    // Remove product from wishlist
    removeFromWishlist: (productId) =>
        axiosClient.delete(`/api/wishlist/items/${productId}`),
};

export default wishlistApi;

