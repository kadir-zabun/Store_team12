import axiosClient from "./axiosClient";

const deliveryApi = {
    // Get all deliveries (optionally filtered by completed status)
    getAllDeliveries: (completed = null) =>
        axiosClient.get("/api/deliveries", {
            params: completed !== null ? { completed } : {},
        }),

    // Get deliveries by order ID
    getDeliveriesByOrder: (orderId) =>
        axiosClient.get(`/api/deliveries/order/${orderId}`),

    // Get deliveries by customer ID
    getDeliveriesByCustomer: (customerId) =>
        axiosClient.get(`/api/deliveries/customer/${customerId}`),

    // Update delivery completed status
    updateCompleted: (deliveryId, completed) =>
        axiosClient.put(`/api/deliveries/${deliveryId}/completed`, null, {
            params: { completed },
        }),

    // Update delivery address
    updateAddress: (deliveryId, deliveryAddress) =>
        axiosClient.put(`/api/deliveries/${deliveryId}/address`, null, {
            params: { deliveryAddress },
        }),
};

export default deliveryApi;

