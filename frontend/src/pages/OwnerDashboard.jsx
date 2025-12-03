import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import productApi from "../api/productApi";
import { useToast } from "../contexts/ToastContext";

export default function OwnerDashboard() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [creating, setCreating] = useState(false);
    const [newProduct, setNewProduct] = useState({
        productName: "",
        description: "",
        price: "",
        quantity: "",
        categoryIds: [""],
    });

    const navigate = useNavigate();
    const { success: showSuccess, error: showError, info: showInfo } = useToast();

    const role = localStorage.getItem("user_role");

    useEffect(() => {
        // Eğer role PRODUCT_OWNER değilse, ana sayfaya gönder
        if (role !== "PRODUCT_OWNER") {
            showInfo("You must be a Product Owner to access this page.");
            navigate("/");
            return;
        }
        loadMyProducts();
    }, []);

    const loadMyProducts = async () => {
        setLoading(true);
        try {
            const res = await productApi.getMyProducts();
            const apiResponse = res.data;
            const data = apiResponse?.data || apiResponse || [];
            setProducts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error loading owner products:", err);
            showError("Failed to load your products.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteProduct = async (productId) => {
        if (!window.confirm("Are you sure you want to delete this product?")) return;
        try {
            await productApi.deleteProduct(productId);
            showSuccess("Product deleted.");
            setProducts((prev) => prev.filter((p) => p.productId !== productId));
            if (selectedProduct?.productId === productId) {
                setSelectedProduct(null);
                setReviews([]);
            }
        } catch (err) {
            console.error("Error deleting product:", err);
            showError("Failed to delete product.");
        }
    };

    const handleViewReviews = async (product) => {
        setSelectedProduct(product);
        try {
            const res = await productApi.getProductReviews(product.productId);
            const apiResponse = res.data;
            const data = apiResponse?.data || apiResponse || [];
            setReviews(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error loading reviews:", err);
            showError("Failed to load reviews.");
        }
    };

    const handleApproveReview = async (reviewId) => {
        try {
            await productApi.approveReview(reviewId);
            showSuccess("Review approved.");
            setReviews((prev) =>
                prev.map((r) => (r.reviewId === reviewId ? { ...r, approved: true } : r))
            );
        } catch (err) {
            console.error("Error approving review:", err);
            showError("Failed to approve review.");
        }
    };

    const handleRejectReview = async (reviewId) => {
        if (!window.confirm("Reject (delete) this review?")) return;
        try {
            await productApi.rejectReview(reviewId);
            showSuccess("Review rejected and deleted.");
            setReviews((prev) => prev.filter((r) => r.reviewId !== reviewId));
        } catch (err) {
            console.error("Error rejecting review:", err);
            showError("Failed to reject review.");
        }
    };

    const handleNewProductChange = (field, value) => {
        setNewProduct((prev) => ({ ...prev, [field]: value }));
    };

    const handleCreateProduct = async (e) => {
        e.preventDefault();
        if (!newProduct.productName || !newProduct.price || !newProduct.quantity) {
            showError("Name, price and quantity are required.");
            return;
        }
        setCreating(true);
        try {
            const payload = {
                productName: newProduct.productName,
                description: newProduct.description,
                price: Number(newProduct.price),
                quantity: Number(newProduct.quantity),
                inStock: Number(newProduct.quantity) > 0,
                categoryIds: newProduct.categoryIds.filter((id) => id && id.trim() !== ""),
            };
            const res = await productApi.createProduct(payload);
            const created = res.data?.data || res.data;
            showSuccess("Product created.");
            setProducts((prev) => [...prev, created]);
            setNewProduct({
                productName: "",
                description: "",
                price: "",
                quantity: "",
                categoryIds: [""],
            });
        } catch (err) {
            console.error("Error creating product:", err);
            showError("Failed to create product.");
        } finally {
            setCreating(false);
        }
    };

    return (
        <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1a202c 0%, #2d3748 50%, #4c51bf 100%)" }}>
            <nav
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "1.2rem 4rem",
                    background: "rgba(15, 23, 42, 0.95)",
                    backdropFilter: "blur(10px)",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
                    position: "sticky",
                    top: 0,
                    zIndex: 100,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
                    <Link
                        to="/"
                        style={{
                            fontSize: "1.5rem",
                            fontWeight: 700,
                            color: "#e2e8f0",
                            textDecoration: "none",
                        }}
                    >
                        🛍️ Store - Owner
                    </Link>
                    <Link
                        to="/products"
                        style={{
                            color: "#a0aec0",
                            textDecoration: "none",
                            padding: "0.4rem 0.8rem",
                            borderRadius: "8px",
                            fontWeight: 500,
                        }}
                    >
                        Customer View
                    </Link>
                </div>
                <button
                    onClick={() => {
                        localStorage.removeItem("access_token");
                        localStorage.removeItem("user_role");
                        navigate("/login");
                    }}
                    style={{
                        padding: "0.6rem 1.2rem",
                        background: "#ef4444",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: 600,
                        cursor: "pointer",
                    }}
                >
                    Logout
                </button>
            </nav>

            <div style={{ padding: "3rem 4rem", display: "flex", gap: "2rem" }}>
                {/* Sol: ürün listesi ve oluşturma formu */}
                <div style={{ flex: 2 }}>
                    <h1 style={{ color: "#e2e8f0", fontSize: "2rem", marginBottom: "1rem" }}>My Products</h1>
                    {loading ? (
                        <div style={{ color: "#a0aec0" }}>Loading products...</div>
                    ) : products.length === 0 ? (
                        <div style={{ color: "#a0aec0" }}>You don't have any products yet.</div>
                    ) : (
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                                gap: "1.5rem",
                            }}
                        >
                            {products.map((p) => (
                                <div
                                    key={p.productId}
                                    style={{
                                        background: "#1f2937",
                                        borderRadius: "12px",
                                        padding: "1.2rem",
                                        border: "1px solid #4b5563",
                                    }}
                                >
                                    <div style={{ color: "#e5e7eb", fontWeight: 600, marginBottom: "0.5rem" }}>
                                        {p.productName}
                                    </div>
                                    <div style={{ color: "#9ca3af", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                                        {p.description || "No description"}
                                    </div>
                                    <div style={{ color: "#e5e7eb", marginBottom: "0.5rem" }}>
                                        ${p.price?.toFixed ? p.price.toFixed(2) : p.price} —{" "}
                                        <span style={{ color: p.inStock ? "#10b981" : "#f87171" }}>
                                            {p.inStock ? `In stock (${p.quantity})` : "Out of stock"}
                                        </span>
                                    </div>
                                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                                        <button
                                            onClick={() => handleViewReviews(p)}
                                            style={{
                                                flex: 1,
                                                padding: "0.4rem 0.6rem",
                                                background: "#3b82f6",
                                                color: "#fff",
                                                border: "none",
                                                borderRadius: "6px",
                                                fontSize: "0.85rem",
                                                cursor: "pointer",
                                            }}
                                        >
                                            View Reviews
                                        </button>
                                        <button
                                            onClick={() => handleDeleteProduct(p.productId)}
                                            style={{
                                                flex: 1,
                                                padding: "0.4rem 0.6rem",
                                                background: "#ef4444",
                                                color: "#fff",
                                                border: "none",
                                                borderRadius: "6px",
                                                fontSize: "0.85rem",
                                                cursor: "pointer",
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Ürün oluşturma formu */}
                    <div
                        style={{
                            marginTop: "2.5rem",
                            background: "#111827",
                            borderRadius: "12px",
                            padding: "1.5rem",
                            border: "1px solid #4b5563",
                        }}
                    >
                        <h2 style={{ color: "#e5e7eb", marginBottom: "1rem" }}>Add New Product</h2>
                        <form onSubmit={handleCreateProduct} style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                            <input
                                type="text"
                                placeholder="Product Name"
                                value={newProduct.productName}
                                onChange={(e) => handleNewProductChange("productName", e.target.value)}
                                style={inputStyle}
                            />
                            <textarea
                                placeholder="Description"
                                value={newProduct.description}
                                onChange={(e) => handleNewProductChange("description", e.target.value)}
                                rows={3}
                                style={{ ...inputStyle, resize: "vertical" }}
                            />
                            <div style={{ display: "flex", gap: "1rem" }}>
                                <input
                                    type="number"
                                    placeholder="Price"
                                    value={newProduct.price}
                                    onChange={(e) => handleNewProductChange("price", e.target.value)}
                                    style={{ ...inputStyle, flex: 1 }}
                                />
                                <input
                                    type="number"
                                    placeholder="Quantity"
                                    value={newProduct.quantity}
                                    onChange={(e) => handleNewProductChange("quantity", e.target.value)}
                                    style={{ ...inputStyle, flex: 1 }}
                                />
                            </div>
                            <small style={{ color: "#9ca3af" }}>
                                Category IDs (optional, comma-separated): you can use IDs you already know.
                            </small>
                            <input
                                type="text"
                                placeholder="Category IDs (e.g. cat1,cat2)"
                                value={newProduct.categoryIds.join(",")}
                                onChange={(e) =>
                                    setNewProduct((prev) => ({
                                        ...prev,
                                        categoryIds: e.target.value
                                            .split(",")
                                            .map((v) => v.trim())
                                            .filter((v) => v !== ""),
                                    }))
                                }
                                style={inputStyle}
                            />
                            <button
                                type="submit"
                                disabled={creating}
                                style={{
                                    marginTop: "0.5rem",
                                    padding: "0.75rem",
                                    background: "#10b981",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "8px",
                                    fontWeight: 600,
                                    cursor: creating ? "not-allowed" : "pointer",
                                    opacity: creating ? 0.7 : 1,
                                }}
                            >
                                {creating ? "Creating..." : "Create Product"}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Sağ: seçili ürünün yorumları */}
                <div style={{ flex: 1, background: "#111827", borderRadius: "12px", padding: "1.5rem", border: "1px solid #4b5563" }}>
                    <h2 style={{ color: "#e5e7eb", marginBottom: "1rem" }}>Reviews</h2>
                    {selectedProduct ? (
                        <div style={{ marginBottom: "1rem", color: "#9ca3af", fontSize: "0.9rem" }}>
                            Showing reviews for:{" "}
                            <span style={{ color: "#e5e7eb", fontWeight: 600 }}>{selectedProduct.productName}</span>
                        </div>
                    ) : (
                        <div style={{ color: "#6b7280", fontSize: "0.9rem", marginBottom: "1rem" }}>
                            Select a product to see its reviews.
                        </div>
                    )}

                    {selectedProduct && reviews.length === 0 && (
                        <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>No reviews yet for this product.</div>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "60vh", overflowY: "auto" }}>
                        {reviews.map((r) => (
                            <div
                                key={r.reviewId}
                                style={{
                                    background: "#020617",
                                    borderRadius: "10px",
                                    padding: "0.75rem",
                                    border: r.approved ? "1px solid #10b981" : "1px solid #facc15",
                                }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                                    <span style={{ color: "#e5e7eb", fontWeight: 600 }}>Rating: {r.rating}/5</span>
                                    <span
                                        style={{
                                            fontSize: "0.75rem",
                                            padding: "0.1rem 0.4rem",
                                            borderRadius: "999px",
                                            background: r.approved ? "#064e3b" : "#78350f",
                                            color: "#f9fafb",
                                        }}
                                    >
                                        {r.approved ? "Approved" : "Pending"}
                                    </span>
                                </div>
                                <div style={{ color: "#d1d5db", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                                    {r.comment || "(no comment)"}
                                </div>
                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                    {!r.approved && (
                                        <button
                                            onClick={() => handleApproveReview(r.reviewId)}
                                            style={{
                                                padding: "0.3rem 0.6rem",
                                                background: "#10b981",
                                                color: "#fff",
                                                border: "none",
                                                borderRadius: "6px",
                                                fontSize: "0.8rem",
                                                cursor: "pointer",
                                            }}
                                        >
                                            Approve
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleRejectReview(r.reviewId)}
                                        style={{
                                            padding: "0.3rem 0.6rem",
                                            background: "#ef4444",
                                            color: "#fff",
                                            border: "none",
                                            borderRadius: "6px",
                                            fontSize: "0.8rem",
                                            cursor: "pointer",
                                        }}
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

const inputStyle = {
    padding: "0.75rem",
    borderRadius: "8px",
    border: "2px solid #4b5563",
    background: "#020617",
    color: "#e5e7eb",
    fontSize: "0.9rem",
};


