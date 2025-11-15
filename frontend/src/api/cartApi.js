import axiosClient from "./axiosClient";

const cartApi = {
    getCart: () => axiosClient.get("/api/cart"),

    addToCart: (productId, quantity) =>
        axiosClient.post("/api/cart/add", {
            productId,
            quantity,
        }),

    updateCartItem: (productId, quantity) =>
        axiosClient.put(`/api/cart/update/${productId}`, {
            quantity,
        }),

    removeFromCart: (productId) =>
        axiosClient.delete(`/api/cart/remove/${productId}`),

    clearCart: () => axiosClient.delete("/api/cart/clear"),
};

export default cartApi;

