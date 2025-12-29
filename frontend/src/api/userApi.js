import axiosClient from "./axiosClient";

const userApi = {
    getUserIdByUsername: (username) =>
        axiosClient.get("/api/users/userId-by-username", {
            params: { username },
        }),

    getUserIdByEmail: (email) =>
        axiosClient.get("/api/users/userId-by-email", {
            params: { email },
        }),

    findByUsernameOrEmail: (input) =>
        axiosClient.get("/api/users/find", {
            params: { input },
        }),

    createReview: (reviewDto) =>
        axiosClient.post("/api/users/create-review", reviewDto),

    getMyReviews: () =>
        axiosClient.get("/api/users/my-reviews"),

    saveCard: (cardInfo) =>
        axiosClient.post("/api/users/save-card", cardInfo),

    getMyCard: () =>
        axiosClient.get("/api/users/my-card"),

    getMyProfile: () =>
        axiosClient.get("/api/users/me/profile"),
};

export default userApi;

