import axiosClient from "./axiosClient";

const paymentApi = {
    mockPayment: (paymentData) =>
        axiosClient.post("/api/payment/mock", paymentData),
    
    getInvoicePdf: (orderId) =>
        axiosClient.get(`/api/payment/invoice/${orderId}/pdf`, {
            responseType: 'blob',
        }),
};

export default paymentApi;

