import axiosClient from "./axiosClient";

const categoryApi = {
    getAllCategories: () =>
        axiosClient.get("/api/categories"),

    getCategoryById: (categoryId) =>
        axiosClient.get(`/api/categories/${categoryId}`),

    searchCategories: (query) =>
        axiosClient.get("/api/categories/search", {
            params: { query },
        }),

    createCategory: (category) =>
        axiosClient.post("/api/categories", category),
};

export default categoryApi;

