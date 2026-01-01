import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import productApi from "../api/productApi";
import { useToast } from "../contexts/ToastContext";
import { useUserRole } from "../hooks/useUserRole";
import CustomSelect from "../components/CustomSelect";

export default function ProductReviewsPage() {
    const { productId } = useParams();
    const [product, setProduct] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [filteredReviews, setFilteredReviews] = useState([]);
    const [reviewSearchQuery, setReviewSearchQuery] = useState("");
    const [reviewStatusFilter, setReviewStatusFilter] = useState("");
    const [appliedReviewStatusFilter, setAppliedReviewStatusFilter] = useState("");
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState({});
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

        if (productId) {
            loadProductAndReviews();
        }
    }, [navigate, userRole, productId]);

    const loadProductAndReviews = async () => {
        try {
            setLoading(true);
            // Load product details
            const productRes = await productApi.getProductById(productId);
            const productData = productRes.data?.data || productRes.data || productRes;
            setProduct(productData);

            // Load reviews
            await loadReviews();
        } catch (error) {
            console.error("Error loading product:", error);
            showError(error.response?.data?.message || "Failed to load product. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const loadReviews = async () => {
        try {
            const response = await productApi.getProductReviews(productId);
            // Backend returns {success: true, data: [...], meta: {...}} or direct array
            const reviewsData = response.data?.data || response.data || [];
            // Sort reviews by date (newest first)
            const sortedReviews = Array.isArray(reviewsData) ? [...reviewsData].sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA; // Descending order (newest first)
            }) : [];
            setReviews(sortedReviews);
            setFilteredReviews(sortedReviews);
            setAppliedReviewStatusFilter(""); // Reset filter when loading new reviews
            setReviewStatusFilter("");
        } catch (error) {
            console.error("Error loading reviews:", error);
            showError(error.response?.data?.message || "Failed to load reviews. Please try again.");
        }
    };

    // Helper function to check if review is rejected
    const isReviewRejected = (review) => {
        return review.approved === false && (!review.comment || review.comment.trim() === "");
    };

    // Apply review filters
    const handleApplyReviewFilters = () => {
        setAppliedReviewStatusFilter(reviewStatusFilter);
    };

    // Filter reviews based on search and applied filter
    useEffect(() => {
        let filtered = [...reviews];

        // Apply status filter
        if (appliedReviewStatusFilter) {
            filtered = filtered.filter((review) => {
                if (appliedReviewStatusFilter === "PENDING") {
                    return review.approved === false && review.comment && review.comment.trim() !== "";
                } else if (appliedReviewStatusFilter === "APPROVED") {
                    return review.approved === true;
                } else if (appliedReviewStatusFilter === "REJECTED") {
                    return isReviewRejected(review);
                }
                return true;
            });
        }

        // Apply search filter
        if (reviewSearchQuery.trim()) {
            filtered = filtered.filter((review) => {
                const comment = review.comment || "";
                const username = review.username || review.userId || "";
                return (
                    comment.toLowerCase().includes(reviewSearchQuery.toLowerCase()) ||
                    username.toLowerCase().includes(reviewSearchQuery.toLowerCase())
                );
            });
        }

        setFilteredReviews(filtered);
    }, [appliedReviewStatusFilter, reviewSearchQuery, reviews]);

    const handleApproveReview = async (reviewId) => {
        setProcessing({ ...processing, [reviewId]: true });
        try {
            await productApi.approveReview(reviewId);
            showSuccess("Review approved successfully!");
            await loadReviews();
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
            await loadReviews();
        } catch (error) {
            console.error("Error rejecting review:", error);
            showError(error.response?.data?.message || "Failed to reject review. Please try again.");
        } finally {
            setProcessing({ ...processing, [reviewId]: false });
        }
    };

    // Check role from localStorage directly if hook hasn't loaded yet
    const storedRole = localStorage.getItem("user_role");
    const currentRole = userRole || storedRole;

    // If not PRODUCT_MANAGER, show message (will redirect in useEffect)
    if (currentRole !== "PRODUCT_MANAGER" && currentRole !== null && currentRole !== undefined) {
        return (
            <div style={{ minHeight: "calc(100vh - 80px)", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ background: "rgba(255, 255, 255, 0.95)", padding: "2rem", borderRadius: "20px", textAlign: "center" }}>
                    <h2 style={{ color: "#2d3748" }}>Access Denied</h2>
                    <p style={{ color: "#718096" }}>This page is only accessible to Product Managers.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: "calc(100vh - 80px)", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
            <style>
                {`
                    .review-scrollable::-webkit-scrollbar {
                        width: 8px;
                    }
                    .review-scrollable::-webkit-scrollbar-track {
                        background: #f7fafc;
                        border-radius: 4px;
                    }
                    .review-scrollable::-webkit-scrollbar-thumb {
                        background: #cbd5e0;
                        border-radius: 4px;
                    }
                    .review-scrollable::-webkit-scrollbar-thumb:hover {
                        background: #667eea;
                    }
                    .review-scrollable {
                        scrollbar-width: thin;
                        scrollbar-color: #cbd5e0 #f7fafc;
                    }
                    .review-scrollable:hover {
                        scrollbar-color: #667eea #f7fafc;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}
            </style>
            <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
                <div style={{ background: "rgba(255, 255, 255, 0.95)", padding: "2rem", borderRadius: "20px", boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)" }}>
                    {loading || (currentRole === null || currentRole === undefined) ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem", minHeight: "400px" }}>
                            <div style={{ width: "50px", height: "50px", border: "4px solid rgba(102, 126, 234, 0.3)", borderTop: "4px solid #667eea", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
                            <div style={{ marginTop: "1rem", color: "#718096", fontSize: "1rem" }}>Loading reviews...</div>
                        </div>
                    ) : (
                        <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                        <div>
                            <button
                                onClick={() => navigate("/owner/reviews")}
                                style={{
                                    padding: "0.5rem 1rem",
                                    background: "#e2e8f0",
                                    color: "#2d3748",
                                    border: "none",
                                    borderRadius: "8px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    fontSize: "0.9rem",
                                    marginBottom: "1rem",
                                }}
                            >
                                ← Back to Products
                            </button>
                            <h1 style={{ fontSize: "2.5rem", fontWeight: 700, color: "#2d3748" }}>
                                {product?.productName || "Product Reviews"}
                            </h1>
                        </div>
                    </div>

                    {/* Search and Filter Section */}
                    <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" }}>
                        <input
                            type="text"
                            placeholder="Search reviews by comment or username..."
                            value={reviewSearchQuery}
                            onChange={(e) => setReviewSearchQuery(e.target.value)}
                            style={{
                                flex: 1,
                                minWidth: "250px",
                                padding: "0.75rem",
                                border: "2px solid #e2e8f0",
                                borderRadius: "8px",
                                fontSize: "0.9rem",
                                boxSizing: "border-box",
                                background: "#fff",
                            }}
                        />
                        <CustomSelect
                            value={reviewStatusFilter}
                            onChange={(e) => setReviewStatusFilter(e.target.value)}
                            options={[
                                { value: "", label: "All Reviews" },
                                { value: "PENDING", label: "Pending" },
                                { value: "APPROVED", label: "Approved" },
                                { value: "REJECTED", label: "Rejected" }
                            ]}
                            placeholder="Filter by Status"
                            minWidth="150px"
                        />
                        <button
                            onClick={handleApplyReviewFilters}
                            style={{
                                padding: "0.75rem 1.5rem",
                                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                color: "#fff",
                                border: "none",
                                borderRadius: "8px",
                                fontWeight: 600,
                                cursor: "pointer",
                                fontSize: "0.9rem",
                                transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = "0 4px 8px rgba(102, 126, 234, 0.4)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = "none";
                            }}
                        >
                            Apply Filter
                        </button>
                    </div>

                    {/* Reviews List */}
                    {!Array.isArray(filteredReviews) || filteredReviews.length === 0 ? (
                        <div style={{ padding: "2rem", textAlign: "center", color: "#718096" }}>
                            {reviewSearchQuery || appliedReviewStatusFilter ? "No reviews match the selected filters." : "No reviews for this product yet."}
                        </div>
                    ) : (
                        <div className="review-scrollable" style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "600px", overflowY: "auto" }}>
                            {filteredReviews.map((review) => {
                                const rejected = isReviewRejected(review);
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
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem" }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "#2d3748", marginBottom: "0.5rem" }}>
                                                    Rating: {review.rating ? "⭐".repeat(review.rating) : "N/A"} ({review.rating}/10)
                                                </div>
                                                {review.comment && (
                                                    <div style={{ color: "#4a5568", marginBottom: "0.5rem" }}>
                                                        {review.comment}
                                                    </div>
                                                )}
                                                <div style={{ fontSize: "0.85rem", color: "#718096", marginTop: "0.5rem" }}>
                                                    By: {review.username || review.userId || "Unknown"} | {review.createdAt ? new Date(review.createdAt).toLocaleString() : "N/A"}
                                                </div>
                                            </div>
                                            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                                {rejected && (
                                                    <div
                                                        style={{
                                                            padding: "0.25rem 0.75rem",
                                                            background: "#e53e3e",
                                                            color: "#fff",
                                                            borderRadius: "6px",
                                                            fontSize: "0.85rem",
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        Rejected
                                                    </div>
                                                )}
                                                {!rejected && (
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
                                                )}
                                            </div>
                                        </div>
                                        {review.comment && !review.approved && !rejected && (
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
                                );
                            })}
                        </div>
                    )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

