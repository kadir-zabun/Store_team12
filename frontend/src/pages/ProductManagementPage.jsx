import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import productApi from "../api/productApi";
import { useToast } from "../contexts/ToastContext";
import { useUserRole } from "../hooks/useUserRole";

export default function ProductManagementPage() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState({});
    const navigate = useNavigate();
    const { success: showSuccess, error: showError } = useToast();
    const userRole = useUserRole();

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            navigate("/login");
            return;
        }

        // Check role from localStorage directly if hook hasn't loaded yet
        const storedRole = localStorage.getItem("user_role");
        const currentRole = userRole || storedRole;

        // Wait for userRole to load
        if (currentRole === null || currentRole === undefined) {
            return; // Still loading
        }

        if (currentRole !== "PRODUCT_MANAGER") {
            navigate("/");
            return;
        }

        const loadData = async () => {
            try {
                setLoading(true);
                // Load products only
                const productsRes = await productApi.getMyProducts();

                // Backend returns {success: true, data: [...], meta: {...}}
                // Axios wraps it in response.data, so we need response.data.data
                const productsData = productsRes?.data?.data || productsRes?.data || productsRes || [];
                
                setProducts(Array.isArray(productsData) ? productsData : []);
            } catch (error) {
                console.error("Error loading data:", error);
                showError(error.response?.data?.message || "Failed to load data. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [navigate, userRole, showError]);


    const handleDeleteProduct = async (productId) => {
        if (!window.confirm("Are you sure you want to delete this product?")) {
            return;
        }

        setDeleting({ ...deleting, [productId]: true });
        try {
            await productApi.deleteProduct(productId);
            showSuccess("Product deleted successfully!");
            setProducts(products.filter(p => p.productId !== productId));
        } catch (error) {
            console.error("Error deleting product:", error);
            showError(error.response?.data?.message || "Failed to delete product. Please try again.");
        } finally {
            setDeleting({ ...deleting, [productId]: false });
        }
    };


    // Check role from localStorage directly if hook hasn't loaded yet
    const storedRole = localStorage.getItem("user_role");
    const currentRole = userRole || storedRole;

    // Show loading while checking role or loading data
    if (currentRole === null || currentRole === undefined) {
        return (
            <div style={{ minHeight: "calc(100vh - 80px)", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                    <div style={{ width: "50px", height: "50px", border: "4px solid rgba(255, 255, 255, 0.3)", borderTop: "4px solid #fff", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                    <div style={{ color: "#fff", fontSize: "1rem" }}>Loading...</div>
                </div>
            </div>
        );
    }

    // If not PRODUCT_MANAGER, show message (will redirect in useEffect)
    if (currentRole !== "PRODUCT_MANAGER") {
        return (
            <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ background: "rgba(255, 255, 255, 0.95)", padding: "2rem", borderRadius: "8px", textAlign: "center" }}>
                    <h2 style={{ color: "#2d3748" }}>Access Denied</h2>
                    <p style={{ color: "#718096" }}>This page is only accessible to Product Managers.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: "calc(100vh - 80px)", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
            <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
                <div style={{ background: "rgba(255, 255, 255, 0.95)", padding: "2rem", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                        <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#2d3748" }}>Product Management</h1>
                        <div style={{ display: "flex", gap: "1rem" }}>
                            <Link
                                to="/owner/categories"
                                style={{
                                    padding: "0.75rem 1.5rem",
                                    background: "#fff",
                                    color: "#667eea",
                                    border: "2px solid #667eea",
                                    borderRadius: "4px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                    textDecoration: "none",
                                    display: "inline-block",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "#667eea";
                                    e.currentTarget.style.color = "#fff";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "#fff";
                                    e.currentTarget.style.color = "#667eea";
                                }}
                            >
                                Edit Categories
                            </Link>
                            <Link
                                to="/owner/products/create"
                                style={{
                                    padding: "0.75rem 1.5rem",
                                    background: "#fff",
                                    color: "#667eea",
                                    border: "2px solid #667eea",
                                    borderRadius: "4px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                    textDecoration: "none",
                                    display: "inline-block",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "#667eea";
                                    e.currentTarget.style.color = "#fff";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "#fff";
                                    e.currentTarget.style.color = "#667eea";
                                }}
                            >
                                + Create Product
                            </Link>
                        </div>
                    </div>

                    {/* Products List */}
                    {loading ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem", minHeight: "400px" }}>
                            <div style={{ width: "50px", height: "50px", border: "4px solid rgba(102, 126, 234, 0.3)", borderTop: "4px solid #667eea", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
                            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                            <div style={{ marginTop: "1rem", color: "#718096", fontSize: "1rem" }}>Loading products...</div>
                        </div>
                    ) : (
                    <>
                    <div>
                        <h2 style={{ marginBottom: "1.5rem", color: "#2d3748", fontSize: "1.25rem" }}>My Products ({Array.isArray(products) ? products.length : 0})</h2>
                        {!Array.isArray(products) || products.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "3rem", color: "#718096" }}>
                                No products yet. Create your first product!
                            </div>
                        ) : (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
                                {products.map((product) => (
                                    <div
                                        key={product.productId}
                                        style={{
                                            background: "#fff",
                                            padding: "1.5rem",
                                            borderRadius: "12px",
                                            border: "1px solid #e2e8f0",
                                            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                                        }}
                                    >
                                        <div style={{ marginBottom: "1rem" }}>
                                            {product.images && product.images.length > 0 && product.images[0] ? (
                                                <img
                                                    src={product.images[0]}
                                                    alt={product.productName}
                                                    style={{ width: "100%", height: "200px", objectFit: "cover", borderRadius: "8px" }}
                                                    onError={(e) => {
                                                        e.target.src = "https://via.placeholder.com/300x200?text=No+Image";
                                                    }}
                                                />
                                            ) : (
                                                <div style={{ width: "100%", height: "200px", background: "#f7fafc", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "#a0aec0" }}>
                                                    No Image
                                                </div>
                                            )}
                                        </div>
                                        <h3 style={{ fontSize: "1.2rem", fontWeight: 600, color: "#2d3748", marginBottom: "0.5rem" }}>
                                            {product.productName}
                                        </h3>
                                        <div style={{ marginBottom: "0.5rem", fontSize: "1.1rem", fontWeight: 700, color: "#667eea" }}>
                                            ${product.price?.toFixed(2)}
                                        </div>
                                        <div style={{ fontSize: "0.9rem", color: "#718096", marginBottom: "1rem" }}>
                                            Stock: {product.quantity || 0} | Popularity: {product.popularity || 0}
                                        </div>
                                        <button
                                            onClick={() => handleDeleteProduct(product.productId)}
                                            disabled={deleting[product.productId]}
                                            style={{
                                                width: "100%",
                                                padding: "0.75rem",
                                                background: deleting[product.productId] ? "#cbd5e0" : "#fed7d7",
                                                color: deleting[product.productId] ? "#718096" : "#c53030",
                                                border: "none",
                                                borderRadius: "8px",
                                                fontWeight: 600,
                                                cursor: deleting[product.productId] ? "not-allowed" : "pointer",
                                            }}
                                        >
                                            {deleting[product.productId] ? "Deleting..." : "Delete Product"}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    </>
                    )}
                </div>
            </div>
        </div>
    );
}

