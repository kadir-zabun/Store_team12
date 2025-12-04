import axiosClient from "./axiosClient";

const paymentApi = {
    mockPayment: (paymentData) =>
        axiosClient.post("/api/payment/mock", paymentData),
};

export default paymentApi;

