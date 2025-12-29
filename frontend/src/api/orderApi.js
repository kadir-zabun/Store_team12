import axiosClient from "./axiosClient";

const orderApi = {
    createOrder: (orderData) =>
        axiosClient.post("/api/orders", orderData),

    createOrderFromCart: () => {
        // Backend now uses JWT to get userId, no need to pass customerId
        return axiosClient.post(`/api/orders/from-cart`);
    },

    getOrderById: (orderId) =>
        axiosClient.get(`/api/orders/${orderId}`),

    getOrdersByCustomer: (customerId) =>
        axiosClient.get(`/api/orders/customer/${customerId}`),

    getAllOrders: (status = null) =>
        axiosClient.get("/api/orders", {
            params: status ? { status } : {},
        }),

    updateOrderStatus: (orderId, status) =>
        axiosClient.put(`/api/orders/${orderId}/status`, { status }),

    getDeliveredOrdersByCustomer: (customerId) =>
        axiosClient.get(`/api/orders/customer/${customerId}/delivered`),

    cancelOrder: (orderId) =>
        axiosClient.post(`/api/orders/${orderId}/cancel`),

    requestRefund: (orderId, refundData) =>
        axiosClient.post(`/api/orders/${orderId}/refund`, refundData),

    getMyRefunds: () =>
        axiosClient.get("/api/orders/refunds/me"),
};

export default orderApi;

