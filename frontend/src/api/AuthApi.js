import axiosClient from "./axiosClient";

const authApi = {
    login: (usernameOrEmail, password) =>
        axiosClient.post("/api/auth/login", {
            usernameOrEmail,
            password,
        }),
};

export default authApi;