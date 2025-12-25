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
};

export default salesApi;

