import axiosClient from "./axiosClient";

const reviewApi = {
    createReview: (reviewData) =>
        axiosClient.post("/api/users/create-review", reviewData),

    getProductReviews: (productId) =>
        axiosClient.get(`/api/products/${productId}/reviews`),
};

export default reviewApi;

