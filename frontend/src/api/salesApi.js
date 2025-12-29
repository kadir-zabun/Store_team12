import axiosClient from "./axiosClient";

const salesApi = {
    // Ürün fiyatını belirleme
    setPrice: (productId, price) =>
        axiosClient.put("/api/sales/products/price", {
            productId,
            price,
        }),

    // Ürünlere indirim yapma
    setDiscount: (productIds, discountPercent) =>
        axiosClient.put("/api/sales/products/discount", {
            productIds,
            discountPercent,
        }),

    // Faturaları tarih aralığına göre getir
    getInvoices: (from, to) =>
        axiosClient.get("/api/sales/invoices", {
            params: {
                from: from.toISOString(),
                to: to.toISOString(),
            },
        }),

    // Fatura PDF'ini indir
    getInvoicePdf: (invoiceId) =>
        axiosClient.get(`/api/sales/invoices/${invoiceId}/pdf`, {
            responseType: "blob",
        }),

    // Gelir ve kar/zarar metriklerini getir
    getMetrics: (from, to) =>
        axiosClient.get("/api/sales/metrics", {
            params: {
                from: from.toISOString(),
                to: to.toISOString(),
            },
        }),

    // Pending refund request'leri getir
    getPendingRefunds: () =>
        axiosClient.get("/api/sales/refunds/pending"),

    // Refund request'i approve/reject et
    decideRefund: (refundId, approved, decisionNote) =>
        axiosClient.put(`/api/sales/refunds/${refundId}/decision`, {
            approved,
            decisionNote,
        }),
};

export default salesApi;

