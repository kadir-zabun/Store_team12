import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import productApi from "../api/productApi";
import { useToast } from "../contexts/ToastContext";
import { useUserRole } from "../hooks/useUserRole";

export default function ReviewManagementPage() {
    const [userName, setUserName] = useState(null);
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState({});
    const navigate = useNavigate();
    const { success: showSuccess, error: showError } = useToast();
    const userRole = useUserRole();
    const dropdownRef = useRef(null);
    const [showDropdown, setShowDropdown] = useState(false);

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
                // Get username
                const payloadBase64 = token.split(".")[1];
                const normalized = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
                const payloadJson = atob(normalized);
                const payload = JSON.parse(payloadJson);
                const username = payload.sub || payload.name || payload.username;
                setUserName(username);

                // Load products
                const productsRes = await productApi.getMyProducts();
                // Backend returns {success: true, data: [...], meta: {...}} or direct array
                const productsData = productsRes.data?.data || productsRes.data || productsRes || [];
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

    const loadReviews = async (productId) => {
        try {
            const response = await productApi.getProductReviews(productId);
            // Backend returns {success: true, data: [...], meta: {...}} or direct array
            const reviewsData = response.data?.data || response.data || [];
            setReviews(Array.isArray(reviewsData) ? reviewsData : []);
        } catch (error) {
            console.error("Error loading reviews:", error);
            showError(error.response?.data?.message || "Failed to load reviews. Please try again.");
        }
    };

    const handleProductSelect = (productId) => {
        setSelectedProduct(productId);
        loadReviews(productId);
    };

    const handleApproveReview = async (reviewId) => {
        setProcessing({ ...processing, [reviewId]: true });
        try {
            await productApi.approveReview(reviewId);
            showSuccess("Review approved successfully!");
            if (selectedProduct) {
                await loadReviews(selectedProduct);
            }
        } catch (error) {
            console.error("Error approving review:", error);
            showError(error.response?.data?.message || "Failed to approve review. Please try again.");
        } finally {
            setProcessing({ ...processing, [reviewId]: false });
        }
    };

    const handleRejectReview = async (reviewId) => {
        if (!window.confirm("Are you sure you want to reject and delete this review?")) {
            return;
        }

        setProcessing({ ...processing, [reviewId]: true });
        try {
            await productApi.rejectReview(reviewId);
            showSuccess("Review rejected and deleted.");
            if (selectedProduct) {
                await loadReviews(selectedProduct);
            }
        } catch (error) {
            console.error("Error rejecting review:", error);
            showError(error.response?.data?.message || "Failed to reject review. Please try again.");
        } finally {
            setProcessing({ ...processing, [reviewId]: false });
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user_role");
        setUserName(null);
        setShowDropdown(false);
        navigate("/login");
    };

    const toggleDropdown = () => {
        setShowDropdown(!showDropdown);
    };

    // Check role from localStorage directly if hook hasn't loaded yet
    const storedRole = localStorage.getItem("user_role");
    const currentRole = userRole || storedRole;

    // Show loading while checking role or loading data
    if (loading || (currentRole === null || currentRole === undefined)) {
        return (
            <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ color: "#fff", fontSize: "1.5rem" }}>Loading...</div>
            </div>
        );
    }

    // If not PRODUCT_MANAGER, show message (will redirect in useEffect)
    if (currentRole !== "PRODUCT_MANAGER") {
        return (
            <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ background: "rgba(255, 255, 255, 0.95)", padding: "2rem", borderRadius: "20px", textAlign: "center" }}>
                    <h2 style={{ color: "#2d3748" }}>Access Denied</h2>
                    <p style={{ color: "#718096" }}>This page is only accessible to Product Managers.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
            <nav
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "1.2rem 4rem",
                    background: "rgba(255, 255, 255, 0.95)",
                    backdropFilter: "blur(10px)",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                    position: "sticky",
                    top: 0,
                    zIndex: 100,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "3rem" }}>
                    <Link
                        to="/"
                        style={{
                            fontSize: "1.5rem",
                            fontWeight: 700,
                            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            textDecoration: "none",
                        }}
                    >
                        🛍️ TeknoSU
                    </Link>
                    <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
                        <Link to="/owner-dashboard" style={{ color: "#4a5568", textDecoration: "none", padding: "0.5rem 1rem", borderRadius: "8px", fontWeight: 500 }}>
                            Dashboard
                        </Link>
                        <Link to="/owner/products" style={{ color: "#4a5568", textDecoration: "none", padding: "0.5rem 1rem", borderRadius: "8px", fontWeight: 500 }}>
                            Products
                        </Link>
                        <Link to="/owner/orders" style={{ color: "#4a5568", textDecoration: "none", padding: "0.5rem 1rem", borderRadius: "8px", fontWeight: 500 }}>
                            Orders
                        </Link>
                        <Link to="/owner/reviews" style={{ color: "#667eea", textDecoration: "none", padding: "0.5rem 1rem", borderRadius: "8px", fontWeight: 600, background: "#f7fafc" }}>
                            Reviews
                        </Link>
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "1rem", position: "relative" }}>
                    {userName && (
                        <div ref={dropdownRef} style={{ position: "relative" }}>
                            <button
                                onClick={toggleDropdown}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.6rem",
                                    padding: "0.6rem 1.2rem",
                                    borderRadius: "10px",
                                    border: "none",
                                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                    color: "#fff",
                                    fontSize: "0.95rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                }}
                            >
                                <span>{userName}</span>
                                <span style={{ fontSize: "0.7rem" }}>{showDropdown ? "▲" : "▼"}</span>
                            </button>
                            {showDropdown && (
                                <div
                                    style={{
                                        position: "absolute",
                                        top: "100%",
                                        right: 0,
                                        marginTop: "0.8rem",
                                        background: "#fff",
                                        border: "1px solid #e2e8f0",
                                        borderRadius: "12px",
                                        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
                                        minWidth: "200px",
                                        zIndex: 1000,
                                    }}
                                >
                                    <button
                                        onClick={handleLogout}
                                        style={{
                                            width: "100%",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.8rem",
                                            textAlign: "left",
                                            padding: "0.9rem 1.2rem",
                                            color: "#e53e3e",
                                            fontSize: "0.95rem",
                                            border: "none",
                                            background: "transparent",
                                            cursor: "pointer",
                                        }}
                                    >
                                        <span>🚪</span>
                                        <span>Logout</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </nav>

            <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
                <div style={{ background: "rgba(255, 255, 255, 0.95)", padding: "2rem", borderRadius: "20px", boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)" }}>
                    <h1 style={{ fontSize: "2.5rem", fontWeight: 700, color: "#2d3748", marginBottom: "2rem" }}>Review Management</h1>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "2rem" }}>
                        {/* Product List */}
                        <div>
                            <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#2d3748", marginBottom: "1rem" }}>Select Product</h2>
                            {!Array.isArray(products) || products.length === 0 ? (
                                <div style={{ padding: "2rem", textAlign: "center", color: "#718096" }}>
                                    No products yet. Create products first.
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    {products.map((product) => (
                                        <button
                                            key={product.productId}
                                            onClick={() => handleProductSelect(product.productId)}
                                            style={{
                                                padding: "1rem",
                                                background: selectedProduct === product.productId ? "#667eea" : "#f7fafc",
                                                color: selectedProduct === product.productId ? "#fff" : "#2d3748",
                                                border: "none",
                                                borderRadius: "8px",
                                                textAlign: "left",
                                                fontWeight: 600,
                                                cursor: "pointer",
                                                transition: "all 0.2s",
                                            }}
                                        >
                                            {product.productName}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Reviews List */}
                        <div>
                            {selectedProduct ? (
                                <>
                                    <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#2d3748", marginBottom: "1rem" }}>Reviews</h2>
                                    {!Array.isArray(reviews) || reviews.length === 0 ? (
                                        <div style={{ padding: "2rem", textAlign: "center", color: "#718096" }}>
                                            No reviews for this product yet.
                                        </div>
                                    ) : (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                            {reviews.map((review) => (
                                                <div
                                                    key={review.reviewId}
                                                    style={{
                                                        padding: "1.5rem",
                                                        background: "#f7fafc",
                                                        borderRadius: "12px",
                                                        border: "1px solid #e2e8f0",
                                                    }}
                                                >
                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem" }}>
                                                        <div>
                                                            <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "#2d3748", marginBottom: "0.5rem" }}>
                                                                Rating: {review.rating ? "⭐".repeat(review.rating) : "N/A"} ({review.rating}/10)
                                                            </div>
                                                            {review.comment && (
                                                                <div style={{ color: "#4a5568", marginBottom: "0.5rem" }}>
                                                                    {review.comment}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div
                                                            style={{
                                                                padding: "0.25rem 0.75rem",
                                                                background: review.approved ? "#c6f6d5" : "#fed7d7",
                                                                color: review.approved ? "#22543d" : "#c53030",
                                                                borderRadius: "6px",
                                                                fontSize: "0.85rem",
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            {review.approved ? "✓ Approved" : "⏳ Pending"}
                                                        </div>
                                                    </div>
                                                    {review.comment && !review.approved && (
                                                        <div style={{ display: "flex", gap: "1rem" }}>
                                                            <button
                                                                onClick={() => handleApproveReview(review.reviewId)}
                                                                disabled={processing[review.reviewId]}
                                                                style={{
                                                                    padding: "0.5rem 1rem",
                                                                    background: processing[review.reviewId] ? "#cbd5e0" : "#c6f6d5",
                                                                    color: processing[review.reviewId] ? "#718096" : "#22543d",
                                                                    border: "none",
                                                                    borderRadius: "8px",
                                                                    fontWeight: 600,
                                                                    cursor: processing[review.reviewId] ? "not-allowed" : "pointer",
                                                                    fontSize: "0.9rem",
                                                                }}
                                                            >
                                                                {processing[review.reviewId] ? "Processing..." : "✓ Approve"}
                                                            </button>
                                                            <button
                                                                onClick={() => handleRejectReview(review.reviewId)}
                                                                disabled={processing[review.reviewId]}
                                                                style={{
                                                                    padding: "0.5rem 1rem",
                                                                    background: processing[review.reviewId] ? "#cbd5e0" : "#fed7d7",
                                                                    color: processing[review.reviewId] ? "#718096" : "#c53030",
                                                                    border: "none",
                                                                    borderRadius: "8px",
                                                                    fontWeight: 600,
                                                                    cursor: processing[review.reviewId] ? "not-allowed" : "pointer",
                                                                    fontSize: "0.9rem",
                                                                }}
                                                            >
                                                                {processing[review.reviewId] ? "Processing..." : "✗ Reject"}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div style={{ padding: "2rem", textAlign: "center", color: "#718096" }}>
                                    Select a product to view reviews
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

