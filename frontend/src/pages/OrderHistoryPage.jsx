import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import orderApi from "../api/orderApi";
import reviewApi from "../api/reviewApi";
import userApi from "../api/userApi";
import paymentApi from "../api/paymentApi";
import { useToast } from "../contexts/ToastContext";
import { useUserRole } from "../hooks/useUserRole";

export default function OrderHistoryPage() {
    const [userName, setUserName] = useState(null);
    const [userId, setUserId] = useState(null);
    const [orders, setOrders] = useState([]);
    const [deliveredOrders, setDeliveredOrders] = useState([]);
    const [myReviews, setMyReviews] = useState([]); // User's existing reviews
    const [loading, setLoading] = useState(true);
    const [reviewingProduct, setReviewingProduct] = useState(null);
    const [reviewForm, setReviewForm] = useState({
        rating: 0,
        comment: "",
    });
    const navigate = useNavigate();
    const { success: showSuccess, error: showError } = useToast();
    const userRole = useUserRole();

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            navigate("/login");
            return;
        }

        if (userRole === "PRODUCT_MANAGER") {
            navigate("/owner-dashboard");
            return;
        }

        const loadData = async () => {
            try {
                // Get username from token
                const payloadBase64 = token.split(".")[1];
                const normalized = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
                const payloadJson = atob(normalized);
                const payload = JSON.parse(payloadJson);
                const username = payload.sub || payload.name || payload.username;
                setUserName(username);

                if (username) {
                    // Get actual userId from username (backend uses userId for orders)
                    try {
                        const userIdResponse = await userApi.getUserIdByUsername(username);
                        // Backend returns String directly (ResponseEntity<String>)
                        const customerId = userIdResponse.data;
                        console.log("Got userId from API:", customerId);
                        console.log("userIdResponse:", userIdResponse);
                        console.log("userIdResponse.data:", userIdResponse.data);
                        
                        if (!customerId) {
                            console.error("userId is null or undefined");
                            showError("Failed to get user ID. Please try logging in again.");
                            return;
                        }
                        
                        setUserId(customerId);

                        // Get all orders using userId as customerId
                        console.log("Fetching orders for customerId:", customerId);
                        const ordersResponse = await orderApi.getOrdersByCustomer(customerId);
                        console.log("Orders response:", ordersResponse);
                        console.log("Orders response.data:", ordersResponse.data);
                        
                        // Handle both wrapped and direct response formats
                        let ordersData = [];
                        if (ordersResponse.data) {
                            // Check if response is wrapped (has success/data structure)
                            if (ordersResponse.data.success !== undefined && ordersResponse.data.data !== undefined) {
                                ordersData = ordersResponse.data.data || [];
                            } else if (Array.isArray(ordersResponse.data)) {
                                // Direct array response
                                ordersData = ordersResponse.data;
                            } else {
                                ordersData = [];
                            }
                        }
                        
                        console.log("Orders data (parsed):", ordersData);
                        console.log("Orders count:", ordersData.length);
                        setOrders(Array.isArray(ordersData) ? ordersData : []);

                        // Get delivered orders using userId as customerId
                        console.log("Fetching delivered orders for customerId:", customerId);
                        const deliveredResponse = await orderApi.getDeliveredOrdersByCustomer(customerId);
                        console.log("Delivered orders response:", deliveredResponse);
                        console.log("Delivered orders response.data:", deliveredResponse.data);
                        
                        // Handle both wrapped and direct response formats
                        let deliveredData = [];
                        if (deliveredResponse.data) {
                            // Check if response is wrapped (has success/data structure)
                            if (deliveredResponse.data.success !== undefined && deliveredResponse.data.data !== undefined) {
                                deliveredData = deliveredResponse.data.data || [];
                            } else if (Array.isArray(deliveredResponse.data)) {
                                // Direct array response
                                deliveredData = deliveredResponse.data;
                            } else {
                                deliveredData = [];
                            }
                        }
                        
                        console.log("Delivered orders data (parsed):", deliveredData);
                        console.log("Delivered orders count:", deliveredData.length);
                        setDeliveredOrders(Array.isArray(deliveredData) ? deliveredData : []);
                        
                        // Get user's reviews
                        try {
                            const reviewsResponse = await userApi.getMyReviews();
                            const reviewsData = reviewsResponse.data?.data || reviewsResponse.data || [];
                            console.log("Loaded reviews:", reviewsData);
                            setMyReviews(Array.isArray(reviewsData) ? reviewsData : []);
                        } catch (error) {
                            console.error("Error loading reviews:", error);
                        }
                    } catch (error) {
                        console.error("Error getting userId or orders:", error);
                        console.error("Error response:", error.response);
                        showError("Failed to load orders. Please try again.");
                    }
                }
            } catch (error) {
                console.error("Error loading orders:", error);
                showError("Failed to load orders. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [navigate, userRole, showError]);

    const handleReviewClick = (orderId, productId) => {
        // Check if user already reviewed this product
        const existingReview = myReviews.find(r => r.productId === productId);
        
        setReviewingProduct({ orderId, productId });
        
        if (existingReview) {
            // Load existing review data
            setReviewForm({
                rating: existingReview.rating || 0,
                comment: existingReview.comment || "",
            });
        } else {
            // New review
            setReviewForm({ rating: 0, comment: "" });
        }
    };

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        if (!reviewForm.rating || reviewForm.rating < 1 || reviewForm.rating > 10) {
            showError("Please select a rating between 1 and 10.");
            return;
        }

        try {
            const reviewData = {
                orderId: reviewingProduct.orderId,
                productId: reviewingProduct.productId,
                rating: reviewForm.rating,
                comment: reviewForm.comment || null,
            };

            const response = await userApi.createReview(reviewData);
            const result = response.data?.data || response.data || "Review submitted successfully!";
            showSuccess(result);
            setReviewingProduct(null);
            setReviewForm({ rating: 0, comment: "" });
            
            // Reload reviews to update UI
            try {
                const reviewsResponse = await userApi.getMyReviews();
                const reviewsData = reviewsResponse.data?.data || reviewsResponse.data || [];
                console.log("Reloaded reviews after submit:", reviewsData);
                setMyReviews(Array.isArray(reviewsData) ? reviewsData : []);
            } catch (error) {
                console.error("Error reloading reviews:", error);
            }
        } catch (error) {
            console.error("Error submitting review:", error);
            const errorMessage = error.response?.data?.message || error.response?.data || "Failed to submit review. Please try again.";
            showError(errorMessage);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "DELIVERED":
                return "#2f855a";
            case "PROCESSING":
                return "#3182ce";
            case "IN_TRANSIT":
                return "#d69e2e";
            case "CANCELLED":
                return "#e53e3e";
            default:
                return "#718096";
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ color: "#fff", fontSize: "1.5rem" }}>Loading orders...</div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding: "2rem" }}>
            <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                    <h1 style={{ fontSize: "2.5rem", fontWeight: 700, color: "#fff" }}>Order History</h1>
                    <Link
                        to="/products"
                        style={{
                            padding: "0.75rem 1.5rem",
                            background: "rgba(255, 255, 255, 0.2)",
                            color: "#fff",
                            textDecoration: "none",
                            borderRadius: "10px",
                            fontWeight: 600,
                            backdropFilter: "blur(10px)",
                        }}
                    >
                        ← Back to Products
                    </Link>
                </div>

                {!Array.isArray(orders) || orders.length === 0 ? (
                    <div style={{ background: "rgba(255, 255, 255, 0.95)", padding: "3rem", borderRadius: "20px", textAlign: "center" }}>
                        <h2 style={{ marginBottom: "1rem", color: "#2d3748" }}>No orders yet</h2>
                        <Link to="/products" style={{ color: "#667eea", textDecoration: "none", fontWeight: 600 }}>Start Shopping</Link>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                        {orders.map((order) => (
                            <div
                                key={order.orderId || order.id}
                                style={{
                                    background: "rgba(255, 255, 255, 0.95)",
                                    padding: "2rem",
                                    borderRadius: "20px",
                                    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
                                }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                                    <div>
                                        <div style={{ fontSize: "1.2rem", fontWeight: 600, color: "#2d3748", marginBottom: "0.5rem" }}>
                                            Order #{order.orderId || order.id}
                                        </div>
                                        <div style={{ fontSize: "0.9rem", color: "#718096" }}>
                                            {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : "N/A"}
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            padding: "0.5rem 1rem",
                                            background: getStatusColor(order.status),
                                            color: "#fff",
                                            borderRadius: "8px",
                                            fontWeight: 600,
                                            fontSize: "0.9rem",
                                        }}
                                    >
                                        {order.status || "PROCESSING"}
                                    </div>
                                </div>

                                <div style={{ marginBottom: "1rem" }}>
                                    <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#4a5568", marginBottom: "0.75rem" }}>Items:</h3>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                        {order.items && order.items.map((item, index) => (
                                            <div
                                                key={index}
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    padding: "0.75rem",
                                                    background: "#f7fafc",
                                                    borderRadius: "8px",
                                                }}
                                            >
                                                <div>
                                                    <div style={{ fontWeight: 600, color: "#2d3748" }}>
                                                        {item.productName || `Product ${item.productId}`}
                                                    </div>
                                                    <div style={{ fontSize: "0.9rem", color: "#718096" }}>
                                                        Qty: {item.quantity} × ${(item.priceAtPurchase || item.price || 0).toFixed(2)}
                                                    </div>
                                                </div>
                                                <div style={{ fontWeight: 600, color: "#667eea" }}>
                                                    ${((item.priceAtPurchase || item.price || 0) * item.quantity).toFixed(2)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "1rem", borderTop: "2px solid #e2e8f0" }}>
                                    <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#2d3748" }}>
                                        Total: <span style={{ color: "#667eea" }}>${(order.totalPrice || 0).toFixed(2)}</span>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            try {
                                                const orderId = order.orderId || order.id;
                                                if (!orderId) {
                                                    showError("Order ID is missing.");
                                                    return;
                                                }
                                                const response = await paymentApi.getInvoicePdf(orderId);
                                                const blob = new Blob([response.data], { type: 'application/pdf' });
                                                const url = window.URL.createObjectURL(blob);
                                                window.open(url, '_blank');
                                                setTimeout(() => window.URL.revokeObjectURL(url), 100);
                                            } catch (error) {
                                                showError("Failed to load PDF. Please try again.");
                                            }
                                        }}
                                        style={{
                                            padding: "0.5rem 1rem",
                                            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                            color: "#fff",
                                            border: "none",
                                            borderRadius: "8px",
                                            fontWeight: 600,
                                            fontSize: "0.9rem",
                                            cursor: "pointer",
                                            transition: "all 0.3s",
                                        }}
                                    >
                                        View PDF
                                    </button>
                                </div>

                                {/* Review Forms for each product */}
                                {order.status === "DELIVERED" && order.items && order.items.length > 0 && (
                                    <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "2px solid #e2e8f0" }}>
                                        <h3 style={{ marginBottom: "1rem", color: "#2d3748", fontSize: "1.1rem", fontWeight: 600 }}>Review Products:</h3>
                                        {order.items.map((item, itemIndex) => {
                                            // Check if user already reviewed this product
                                            // Match by productId (string comparison)
                                            const existingReview = myReviews.find(
                                                r => r.productId && item.productId && String(r.productId) === String(item.productId)
                                            );
                                            const hasReview = !!existingReview;
                                            
                                            // Debug logs
                                            console.log(`Product ${item.productId}:`, {
                                                hasReview,
                                                existingReview,
                                                allReviews: myReviews.map(r => ({ productId: r.productId, rating: r.rating }))
                                            });

                                            return (
                                            <div key={itemIndex} style={{ marginBottom: "1.5rem" }}>
                                                <div style={{ marginBottom: "0.75rem", fontWeight: 600, color: "#4a5568", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                    <span>{item.productName || `Product ${item.productId}`}</span>
                                                </div>
                                                
                                                {/* Show existing review if exists */}
                                                {hasReview && !(reviewingProduct && reviewingProduct.orderId === (order.orderId || order.id) && reviewingProduct.productId === item.productId) && (
                                                    <div
                                                        style={{
                                                            padding: "1rem",
                                                            background: "#f7fafc",
                                                            borderRadius: "12px",
                                                            border: "1px solid #e2e8f0",
                                                            marginBottom: "0.75rem",
                                                        }}
                                                    >
                                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                                                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                                                <span style={{ fontWeight: 600, color: "#2d3748" }}>Your Rating:</span>
                                                                <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "#667eea" }}>
                                                                    {existingReview.rating}/10
                                                                </span>
                                                            </div>
                                                            <span style={{ fontSize: "0.85rem", color: "#2f855a", fontWeight: 500 }}>
                                                                ✓ Reviewed
                                                            </span>
                                                        </div>
                                                        {existingReview.comment && (
                                                            <div style={{ marginTop: "0.75rem" }}>
                                                                <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#4a5568", marginBottom: "0.25rem" }}>
                                                                    Your Comment:
                                                                </div>
                                                                <div style={{ 
                                                                    padding: "0.75rem", 
                                                                    background: "#fff", 
                                                                    borderRadius: "8px",
                                                                    color: "#2d3748",
                                                                    fontSize: "0.95rem",
                                                                    lineHeight: "1.5",
                                                                }}>
                                                                    {existingReview.comment}
                                                                </div>
                                                                <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#718096" }}>
                                                                    Status: {existingReview.approved ? (
                                                                        <span style={{ color: "#2f855a", fontWeight: 600 }}>✓ Approved (Visible)</span>
                                                                    ) : (
                                                                        <span style={{ color: "#d69e2e", fontWeight: 600 }}>⏳ Pending Approval</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={() => handleReviewClick(order.orderId || order.id, item.productId)}
                                                            style={{
                                                                marginTop: "0.75rem",
                                                                padding: "0.5rem 1rem",
                                                                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                                                color: "#fff",
                                                                border: "none",
                                                                borderRadius: "8px",
                                                                fontWeight: 600,
                                                                cursor: "pointer",
                                                                fontSize: "0.9rem",
                                                            }}
                                                        >
                                                            Update Review
                                                        </button>
                                                    </div>
                                                )}
                                                
                                                {/* Show review form when editing or writing new review */}
                                                {reviewingProduct && 
                                                 reviewingProduct.orderId === (order.orderId || order.id) && 
                                                 reviewingProduct.productId === item.productId ? (
                                                    <div
                                                        style={{
                                                            padding: "1.5rem",
                                                            background: "#f7fafc",
                                                            borderRadius: "12px",
                                                            border: "2px solid #e2e8f0",
                                                        }}
                                                    >
                                                        <h4 style={{ marginBottom: "1rem", color: "#2d3748" }}>
                                                            {hasReview ? "Update Review" : "Write a Review"}
                                                        </h4>
                                                        <form onSubmit={handleSubmitReview}>
                                                            <div style={{ marginBottom: "1rem" }}>
                                                                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#4a5568" }}>
                                                                    Rating (1-10):
                                                                </label>
                                                                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                                                        <button
                                                                            key={num}
                                                                            type="button"
                                                                            onClick={() => setReviewForm({ ...reviewForm, rating: num })}
                                                                            style={{
                                                                                width: "40px",
                                                                                height: "40px",
                                                                                borderRadius: "8px",
                                                                                border: "2px solid",
                                                                                borderColor: reviewForm.rating === num ? "#667eea" : "#e2e8f0",
                                                                                background: reviewForm.rating === num ? "#667eea" : "#fff",
                                                                                color: reviewForm.rating === num ? "#fff" : "#4a5568",
                                                                                fontWeight: 600,
                                                                                cursor: "pointer",
                                                                                transition: "all 0.2s",
                                                                            }}
                                                                        >
                                                                            {num}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div style={{ marginBottom: "1rem" }}>
                                                                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#4a5568" }}>
                                                                    Comment (optional):
                                                                </label>
                                                                <textarea
                                                                    value={reviewForm.comment}
                                                                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                                                                    placeholder="Share your experience..."
                                                                    rows="4"
                                                                    style={{
                                                                        width: "100%",
                                                                        padding: "0.75rem",
                                                                        borderRadius: "8px",
                                                                        border: "2px solid #e2e8f0",
                                                                        fontSize: "1rem",
                                                                        fontFamily: "inherit",
                                                                        resize: "vertical",
                                                                        outline: "none",
                                                                        background: "#fff",
                                                                        color: "#2d3748",
                                                                        boxSizing: "border-box",
                                                                    }}
                                                                />
                                                            </div>
                                                            <div style={{ display: "flex", gap: "1rem" }}>
                                                                <button
                                                                    type="submit"
                                                                    style={{
                                                                        padding: "0.75rem 1.5rem",
                                                                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                                                        color: "#fff",
                                                                        border: "none",
                                                                        borderRadius: "10px",
                                                                        fontWeight: 600,
                                                                        cursor: "pointer",
                                                                    }}
                                                                >
                                                                    {hasReview ? "Update Review" : "Submit Review"}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setReviewingProduct(null);
                                                                        setReviewForm({ rating: 0, comment: "" });
                                                                    }}
                                                                    style={{
                                                                        padding: "0.75rem 1.5rem",
                                                                        background: "#e2e8f0",
                                                                        color: "#4a5568",
                                                                        border: "none",
                                                                        borderRadius: "10px",
                                                                        fontWeight: 600,
                                                                        cursor: "pointer",
                                                                    }}
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </form>
                                                    </div>
                                                ) : !hasReview && (
                                                    <button
                                                        onClick={() => handleReviewClick(order.orderId || order.id, item.productId)}
                                                        style={{
                                                            padding: "0.5rem 1rem",
                                                            background: "#e2e8f0",
                                                            color: "#4a5568",
                                                            border: "none",
                                                            borderRadius: "8px",
                                                            fontWeight: 600,
                                                            cursor: "pointer",
                                                            fontSize: "0.9rem",
                                                        }}
                                                    >
                                                        Write Review
                                                    </button>
                                                )}
                                            </div>
                                        );
                                        })}
                                    </div>
                                )}

                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

