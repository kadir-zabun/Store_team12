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
    const [myRefunds, setMyRefunds] = useState([]); // User's refund requests
    const [myReviews, setMyReviews] = useState([]); // User's existing reviews
    const [loading, setLoading] = useState(true);
    const [reviewingProduct, setReviewingProduct] = useState(null);
    const [reviewForm, setReviewForm] = useState({
        rating: 0,
        comment: "",
    });
    const [refundingItem, setRefundingItem] = useState(null);
    const [refundForm, setRefundForm] = useState({
        quantity: 1,
        reason: "",
    });
    const [refundStatusMap, setRefundStatusMap] = useState({});
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

                        // Load user's refund requests
                        try {
                            const refundsResponse = await orderApi.getMyRefunds();
                            const refundsData = refundsResponse.data?.data || refundsResponse.data || [];
                            console.log("Loaded refunds:", refundsData);
                            setMyRefunds(Array.isArray(refundsData) ? refundsData : []);
                        } catch (error) {
                            console.error("Error loading refunds:", error);
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

    // Build a lookup for refund status by (orderId, productId)
    useEffect(() => {
        const map = {};
        (myRefunds || []).forEach((r) => {
            if (!r.orderId || !r.productId) return;
            const key = `${r.orderId}-${r.productId}`;
            map[key] = r;
        });
        setRefundStatusMap(map);
    }, [myRefunds]);

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
                                        {order.items && order.items.map((item, index) => {
                                            const orderDate = order.orderDate ? new Date(order.orderDate) : null;
                                            const daysSincePurchase = orderDate ? Math.floor((new Date() - orderDate) / (1000 * 60 * 60 * 24)) : null;
                        const refundableStatuses = ["DELIVERED", "REFUND_APPROVED"];
                        const canRefund = refundableStatuses.includes(order.status) && daysSincePurchase !== null && daysSincePurchase <= 30;
                                            const refundKey = `${order.orderId || order.id}-${item.productId}`;
                                            const refundInfo = refundStatusMap[refundKey];
                                            const isRefundApproved = refundInfo && refundInfo.status === "APPROVED";
                                            const isRefundPending = refundInfo && refundInfo.status === "PENDING";
                                            
                                            return (
                                                <div
                                                    key={index}
                                                    style={{
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        alignItems: "center",
                                                        padding: "0.75rem",
                                                        background: "#f7fafc",
                                                        borderRadius: "8px",
                                                    }}
                                                >
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 600, color: "#2d3748" }}>
                                                            {item.productName || `Product ${item.productId}`}
                                                        </div>
                                                        <div style={{ fontSize: "0.9rem", color: "#718096" }}>
                                                            Qty: {item.quantity} × ${(item.priceAtPurchase || item.price || 0).toFixed(2)}
                                                        </div>
                                                        {order.status === "DELIVERED" && (
                                                            <div style={{ fontSize: "0.85rem", color: daysSincePurchase !== null && daysSincePurchase <= 30 ? "#2f855a" : "#e53e3e", marginTop: "0.25rem" }}>
                                                                {daysSincePurchase !== null ? (
                                                                    daysSincePurchase <= 30 
                                                                        ? `${30 - daysSincePurchase} days left for refund`
                                                                        : "Refund window expired"
                                                                ) : ""}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                                        <div style={{ fontWeight: 600, color: "#667eea" }}>
                                                            ${((item.priceAtPurchase || item.price || 0) * item.quantity).toFixed(2)}
                                                        </div>
                                                            {isRefundApproved && (
                                                                <span style={{ padding: "0.4rem 0.8rem", background: "#2f855a", color: "#fff", borderRadius: "8px", fontWeight: 600, fontSize: "0.85rem" }}>
                                                                    Refund Accepted
                                                                </span>
                                                            )}
                                                            {isRefundPending && !isRefundApproved && (
                                                                <span style={{ padding: "0.4rem 0.8rem", background: "#d69e2e", color: "#fff", borderRadius: "8px", fontWeight: 600, fontSize: "0.85rem" }}>
                                                                    Refund Pending
                                                                </span>
                                                            )}
                                                            {canRefund && !isRefundApproved && !isRefundPending && (
                                                                <button
                                                                    onClick={() => {
                                                                        setRefundingItem({
                                                                            orderId: order.orderId || order.id,
                                                                            productId: item.productId,
                                                                            productName: item.productName,
                                                                            maxQuantity: item.quantity,
                                                                            priceAtPurchase: item.priceAtPurchase || item.price || 0,
                                                                        });
                                                                        setRefundForm({
                                                                            quantity: 1,
                                                                            reason: "",
                                                                        });
                                                                    }}
                                                                    style={{
                                                                        padding: "0.5rem 1rem",
                                                                        background: "#d69e2e",
                                                                        color: "#fff",
                                                                        border: "none",
                                                                        borderRadius: "8px",
                                                                        fontWeight: 600,
                                                                        fontSize: "0.85rem",
                                                                        cursor: "pointer",
                                                                        transition: "all 0.2s",
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        e.currentTarget.style.background = "#b7791f";
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        e.currentTarget.style.background = "#d69e2e";
                                                                    }}
                                                                >
                                                                    Request Refund
                                                                </button>
                                                            )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "1rem", borderTop: "2px solid #e2e8f0" }}>
                                    <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#2d3748" }}>
                                        Total: <span style={{ color: "#667eea" }}>${(order.totalPrice || 0).toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: "flex", gap: "0.5rem" }}>
                                        {order.status === "PROCESSING" && (
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        const orderId = order.orderId || order.id;
                                                        if (!orderId) {
                                                            showError("Order ID is missing.");
                                                            return;
                                                        }
                                                        if (!window.confirm("Are you sure you want to cancel this order?")) {
                                                            return;
                                                        }
                                                        await orderApi.cancelOrder(orderId);
                                                        showSuccess("Order cancelled successfully!");
                                                        // Reload orders
                                                        const ordersResponse = await orderApi.getOrdersByCustomer(userId);
                                                        const ordersData = ordersResponse.data?.data || ordersResponse.data || [];
                                                        setOrders(Array.isArray(ordersData) ? ordersData : []);
                                                    } catch (error) {
                                                        showError(error.response?.data?.message || "Failed to cancel order. Please try again.");
                                                    }
                                                }}
                                                style={{
                                                    padding: "0.5rem 1rem",
                                                    background: "#e53e3e",
                                                    color: "#fff",
                                                    border: "none",
                                                    borderRadius: "8px",
                                                    fontWeight: 600,
                                                    fontSize: "0.9rem",
                                                    cursor: "pointer",
                                                    transition: "all 0.3s",
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = "#c53030";
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = "#e53e3e";
                                                }}
                                            >
                                                Cancel Order
                                            </button>
                                        )}
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

                {/* Refund Request Modal */}
                {refundingItem && (
                    <div
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: "rgba(0, 0, 0, 0.5)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 1000,
                        }}
                        onClick={() => setRefundingItem(null)}
                    >
                        <div
                            style={{
                                background: "#fff",
                                borderRadius: "8px",
                                padding: "2rem",
                                maxWidth: "500px",
                                width: "90%",
                                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#2d3748", marginBottom: "1rem" }}>
                                Request Refund
                            </h2>
                            <div style={{ marginBottom: "1rem" }}>
                                <div style={{ fontSize: "0.9rem", color: "#718096", marginBottom: "0.5rem" }}>Product:</div>
                                <div style={{ fontWeight: 600, color: "#2d3748" }}>{refundingItem.productName}</div>
                            </div>
                            <div style={{ marginBottom: "1rem" }}>
                                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#4a5568", fontSize: "0.85rem" }}>
                                    Quantity (Max: {refundingItem.maxQuantity})
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max={refundingItem.maxQuantity}
                                    value={refundForm.quantity}
                                    onChange={(e) => setRefundForm({ ...refundForm, quantity: parseInt(e.target.value) || 1 })}
                                    style={{
                                        width: "100%",
                                        padding: "0.75rem",
                                        border: "1px solid #cbd5e0",
                                        borderRadius: "4px",
                                        fontSize: "0.9rem",
                                        boxSizing: "border-box",
                                    }}
                                />
                            </div>
                            <div style={{ marginBottom: "1rem" }}>
                                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#4a5568", fontSize: "0.85rem" }}>
                                    Reason (Optional)
                                </label>
                                <textarea
                                    value={refundForm.reason}
                                    onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                                    placeholder="Please provide a reason for the refund..."
                                    rows={4}
                                    style={{
                                        width: "100%",
                                        padding: "0.75rem",
                                        border: "1px solid #cbd5e0",
                                        borderRadius: "4px",
                                        fontSize: "0.9rem",
                                        boxSizing: "border-box",
                                        resize: "vertical",
                                    }}
                                />
                            </div>
                            <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "#f7fafc", borderRadius: "4px" }}>
                                <div style={{ fontSize: "0.85rem", color: "#718096", marginBottom: "0.25rem" }}>Refund Amount:</div>
                                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#667eea" }}>
                                    ${(refundingItem.priceAtPurchase * refundForm.quantity).toFixed(2)}
                                </div>
                                <div style={{ fontSize: "0.85rem", color: "#718096", marginTop: "0.25rem" }}>
                                    (Price at purchase: ${refundingItem.priceAtPurchase.toFixed(2)})
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: "1rem" }}>
                                <button
                                    onClick={async () => {
                                        try {
                                            const refundData = {
                                                orderId: refundingItem.orderId,
                                                productId: refundingItem.productId,
                                                quantity: refundForm.quantity,
                                                reason: refundForm.reason || null,
                                            };
                                            await orderApi.requestRefund(refundingItem.orderId, refundData);
                                            showSuccess("Refund request submitted successfully!");
                                            setRefundingItem(null);
                                            setRefundForm({ quantity: 1, reason: "" });
                                            // Reload orders
                                            const ordersResponse = await orderApi.getOrdersByCustomer(userId);
                                            const ordersData = ordersResponse.data?.data || ordersResponse.data || [];
                                            setOrders(Array.isArray(ordersData) ? ordersData : []);
                                            // Reload refunds to update statuses
                                            try {
                                                const refundsResponse = await orderApi.getMyRefunds();
                                                const refundsData = refundsResponse.data?.data || refundsResponse.data || [];
                                                setMyRefunds(Array.isArray(refundsData) ? refundsData : []);
                                            } catch (err) {
                                                console.error("Error reloading refunds:", err);
                                            }
                                        } catch (error) {
                                            showError(error.response?.data?.message || "Failed to request refund. Please try again.");
                                        }
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: "0.75rem 1.5rem",
                                        background: "#667eea",
                                        color: "#fff",
                                        border: "none",
                                        borderRadius: "4px",
                                        fontWeight: 600,
                                        fontSize: "0.9rem",
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = "#764ba2";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = "#667eea";
                                    }}
                                >
                                    Submit Request
                                </button>
                                <button
                                    onClick={() => {
                                        setRefundingItem(null);
                                        setRefundForm({ quantity: 1, reason: "" });
                                    }}
                                    style={{
                                        padding: "0.75rem 1.5rem",
                                        background: "#e2e8f0",
                                        color: "#4a5568",
                                        border: "none",
                                        borderRadius: "4px",
                                        fontWeight: 600,
                                        fontSize: "0.9rem",
                                        cursor: "pointer",
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

