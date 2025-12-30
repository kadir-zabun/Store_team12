import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useUserRole } from "../hooks/useUserRole";
import { useToast } from "../contexts/ToastContext";
import userApi from "../api/userApi";
import productApi from "../api/productApi";

export default function MyReviewsPage() {
    const navigate = useNavigate();
    const userRole = useUserRole();
    const { success: showSuccess, error: showError } = useToast();
    const [reviews, setReviews] = useState([]);
    const [products, setProducts] = useState({});
    const [loading, setLoading] = useState(true);

    // Redirect if not CUSTOMER
    useEffect(() => {
        if (userRole !== "CUSTOMER") {
            navigate("/");
        }
    }, [userRole, navigate]);

    useEffect(() => {
        loadReviews();
    }, []);

    const loadReviews = async () => {
        setLoading(true);
        try {
            const response = await userApi.getMyReviews();
            const reviewsData = response.data?.data || response.data || [];
            setReviews(Array.isArray(reviewsData) ? reviewsData : []);

            // Load product details for each review
            const productIds = [...new Set(reviewsData.map((r) => r.productId).filter(Boolean))];
            const productPromises = productIds.map(async (productId) => {
                try {
                    const productResponse = await productApi.getProductById(productId);
                    const productData = productResponse.data?.data || productResponse.data;
                    return { productId, product: productData };
                } catch (error) {
                    console.error(`Error loading product ${productId}:`, error);
                    return { productId, product: null };
                }
            });

            const productResults = await Promise.all(productPromises);
            const productsMap = {};
            productResults.forEach(({ productId, product }) => {
                if (product) {
                    productsMap[productId] = product;
                }
            });
            setProducts(productsMap);
        } catch (error) {
            console.error("Error loading reviews:", error);
            showError("Failed to load reviews.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div
                style={{
                    minHeight: "calc(100vh - 80px)",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <div style={{ color: "#fff", fontSize: "1.5rem" }}>Loading reviews...</div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: "calc(100vh - 80px)", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
            <div
                style={{
                    padding: "2rem",
                    maxWidth: "1200px",
                    margin: "0 auto",
                }}
            >
                <div
                    style={{
                        background: "rgba(255, 255, 255, 0.95)",
                        backdropFilter: "blur(10px)",
                        borderRadius: "20px",
                        padding: "2rem",
                        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
                    }}
                >
                    <h1
                        style={{
                            fontSize: "clamp(2rem, 4vw, 3rem)",
                            fontWeight: 700,
                            color: "#2d3748",
                            marginBottom: "1rem",
                        }}
                    >
                        My Reviews
                    </h1>
                    <p style={{ color: "#718096", fontSize: "1.1rem", marginBottom: "2rem" }}>
                        View and manage your product reviews.
                    </p>

                    {reviews.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "4rem 2rem", color: "#718096" }}>
                            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>⭐</div>
                            <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                                No reviews yet
                            </h2>
                            <p style={{ marginBottom: "2rem" }}>You haven't reviewed any products yet.</p>
                            <Link
                                to="/orders"
                                style={{
                                    display: "inline-block",
                                    padding: "0.75rem 2rem",
                                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                    color: "#fff",
                                    textDecoration: "none",
                                    borderRadius: "8px",
                                    fontWeight: 600,
                                    transition: "all 0.3s",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = "translateY(-2px)";
                                    e.currentTarget.style.boxShadow = "0 4px 8px rgba(102, 126, 234, 0.4)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "translateY(0)";
                                    e.currentTarget.style.boxShadow = "none";
                                }}
                            >
                                View Orders
                            </Link>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                            {reviews.map((review) => {
                                const product = products[review.productId];
                                return (
                                    <div
                                        key={review.reviewId}
                                        style={{
                                            padding: "1.5rem",
                                            background: "#f7fafc",
                                            borderRadius: "12px",
                                            border: "1px solid #e2e8f0",
                                        }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                                            <div style={{ flex: 1 }}>
                                                {product ? (
                                                    <Link
                                                        to={`/products/${review.productId}`}
                                                        style={{
                                                            fontSize: "1.2rem",
                                                            fontWeight: 600,
                                                            color: "#667eea",
                                                            textDecoration: "none",
                                                            marginBottom: "0.5rem",
                                                            display: "block",
                                                        }}
                                                    >
                                                        {product.productName || `Product ${review.productId}`}
                                                    </Link>
                                                ) : (
                                                    <div
                                                        style={{
                                                            fontSize: "1.2rem",
                                                            fontWeight: 600,
                                                            color: "#2d3748",
                                                            marginBottom: "0.5rem",
                                                        }}
                                                    >
                                                        Product {review.productId}
                                                    </div>
                                                )}
                                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                                                    <span style={{ fontSize: "1.1rem", fontWeight: 600, color: "#d69e2e" }}>
                                                        {"⭐".repeat(review.rating || 0)}
                                                    </span>
                                                    <span style={{ fontSize: "0.9rem", color: "#718096" }}>
                                                        {review.rating || 0}/10
                                                    </span>
                                                </div>
                                                {review.comment && (
                                                    <p style={{ color: "#2d3748", lineHeight: "1.6", marginTop: "0.5rem" }}>
                                                        {review.comment}
                                                    </p>
                                                )}
                                                {review.approved === false && review.comment && (
                                                    <div
                                                        style={{
                                                            display: "inline-block",
                                                            padding: "0.25rem 0.75rem",
                                                            background: "#fef3c7",
                                                            color: "#92400e",
                                                            borderRadius: "4px",
                                                            fontSize: "0.85rem",
                                                            marginTop: "0.5rem",
                                                        }}
                                                    >
                                                        Pending Approval
                                                    </div>
                                                )}
                                            </div>
                                            {review.createdAt && (
                                                <div style={{ fontSize: "0.9rem", color: "#718096", textAlign: "right" }}>
                                                    {new Date(review.createdAt).toLocaleDateString()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


