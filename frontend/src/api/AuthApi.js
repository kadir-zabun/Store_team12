import axiosClient from "./axiosClient";

const authApi = {
    login: (usernameOrEmail, password) =>
        axiosClient.post("/api/auth/login", {
            usernameOrEmail,
            password,
        }),

    register: (name, username, email, password, confirmPassword, role) =>
        axiosClient.post("/api/auth/register", {
            name,
            username,
            email,
            password,
            confirmPassword,
            role,
        }),

    requestPasswordReset: (email) =>
        axiosClient.post("/api/auth/password-reset", { email }),

    resetPassword: (token, newPassword) =>
        axiosClient.post("/api/auth/reset-password", { token, newPassword }),
};

export default authApi;