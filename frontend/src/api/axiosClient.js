import axios from "axios";

const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080",
    headers: {
        "Content-Type": "application/json",
    },
});

axiosClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("access_token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // If FormData is being sent, remove Content-Type header to let browser set it with boundary
        if (config.data instanceof FormData) {
            delete config.headers["Content-Type"];
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default axiosClient;