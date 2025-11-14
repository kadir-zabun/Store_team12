
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
};

export default productApi;

