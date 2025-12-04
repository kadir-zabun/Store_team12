
import axiosClient from "./axiosClient";

const productApi = {

    getAllProducts: (page = 0, size = 10, sortBy = "productName", sortDir = "asc") =>
        axiosClient.get("/api/products", {
            params: { page, size, sortBy, sortDir },
        }),

    getProductById: (productId) =>
        axiosClient.get(`/api/products/${productId}`),

    getProductsByCategory: (categoryId, page = 0, size = 10) =>
        axiosClient.get(`/api/products/category/${categoryId}`, {
            params: { page, size },
        }),

    getFakeStoreProducts: (limit = 20) =>
        fetch(`https://fakestoreapi.com/products?limit=${limit}`)
            .then((res) => res.json()),

    getAllDummyJsonProducts: () =>
        fetch(`https://dummyjson.com/products?limit=20`)
            .then((res) => res.json())
            .then((data) => data.products || []),

    createProduct: (product) =>
        axiosClient.post("/api/products", product),

    createCategory: (category) =>
        axiosClient.post("/api/categories", category),

    getCategoryById: (categoryId) =>
        axiosClient.get(`/api/categories/${categoryId}`),

    // Owner endpoints
    getMyProducts: () =>
        axiosClient.get("/api/products/my-products"),

    deleteProduct: (productId) =>
        axiosClient.delete(`/api/products/${productId}`),

    getProductReviews: (productId) =>
        axiosClient.get(`/api/products/my-products/${productId}/reviews`),

    approveReview: (reviewId) =>
        axiosClient.put(`/api/products/reviews/${reviewId}/approve`),

    rejectReview: (reviewId) =>
        axiosClient.delete(`/api/products/reviews/${reviewId}`),

    // Search and filter endpoints
    searchProducts: (query) =>
        axiosClient.get("/api/products/search", {
            params: { query },
        }),

    getProductsByPriceRange: (minPrice, maxPrice) =>
        axiosClient.get("/api/products/price-range", {
            params: { minPrice, maxPrice },
        }),

    getInStockProducts: () =>
        axiosClient.get("/api/products/in-stock"),

    // Get approved reviews for a product (public endpoint)
    getApprovedReviewsForProduct: (productId) =>
        axiosClient.get(`/api/products/${productId}/reviews`),
};

export default productApi;

