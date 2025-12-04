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
};

export default userApi;

