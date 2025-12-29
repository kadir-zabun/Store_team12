import axiosClient from "./axiosClient";

const productManagerApi = {
    // Get invoices for Product Manager
    getInvoices: (from, to) =>
        axiosClient.get("/api/manager/invoices", {
            params: {
                from: from.toISOString(),
                to: to.toISOString(),
            },
        }),

    // Get invoice PDF
    getInvoicePdf: (invoiceId) =>
        axiosClient.get(`/api/manager/invoices/${invoiceId}/pdf`, {
            responseType: "blob",
        }),
};

export default productManagerApi;

