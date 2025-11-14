// frontend/src/api/authApi.js
import axiosClient from "./axiosClient";

const authApi = {
    login: (usernameOrEmail, password) =>
        axiosClient.post("/api/auth/login", {
            usernameOrEmail,
            password,
        }),

    // RegisterDto: name, username, email, password, confirmPassword
    register: (name, username, email, password, confirmPassword) =>
        axiosClient.post("/api/auth/register", {
            name,
            username,
            email,
            password,
            confirmPassword,
        }),
};

export default authApi;