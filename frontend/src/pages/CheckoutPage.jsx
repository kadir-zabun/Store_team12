import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import cartApi from "../api/cartApi";
import orderApi from "../api/orderApi";
import paymentApi from "../api/paymentApi";
import userApi from "../api/userApi";
import { useToast } from "../contexts/ToastContext";
import { useCartCount } from "../hooks/useCartCount";
import { useUserRole } from "../hooks/useUserRole";

export default function CheckoutPage() {
    const [userName, setUserName] = useState(null);
    const [cart, setCart] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [userId, setUserId] = useState(null);
    const [shippingInfo, setShippingInfo] = useState({
        fullName: "",
        address: "",
        city: "",
        zipCode: "",
        phone: "",
    });
    const navigate = useNavigate();
    const { refreshCartCount } = useCartCount();
    const { success: showSuccess, error: showError } = useToast();
    const userRole = useUserRole();

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            navigate("/login");
            return;
        }

        if (userRole === "PRODUCT_OWNER") {
            navigate("/owner-dashboard");
            return;
        }

        const loadCart = async () => {
            try {
                const response = await cartApi.getCart();
                const apiResponse = response.data;
                
                // Handle both wrapped and direct response formats
                let cartData = null;
                if (apiResponse && apiResponse.data) {
                    cartData = apiResponse.data;
                } else if (apiResponse) {
                    cartData = apiResponse;
                }
                
                // Ensure cart has items array
                if (cartData && (!cartData.items || !Array.isArray(cartData.items))) {
                    cartData.items = [];
                }
                
                console.log("Cart data loaded:", cartData);
                console.log("Cart items:", cartData?.items);
                
                setCart(cartData);

                // Get userId from JWT token
                // Backend now converts username to userId for all operations
                try {
                    const payloadBase64 = token.split(".")[1];
                    const normalized = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
                    const payloadJson = atob(normalized);
                    const payload = JSON.parse(payloadJson);
                    const username = payload.sub || payload.name || payload.username;
                    
                    if (username) {
                        setUserName(username);
                        // Get actual userId from username (backend uses userId for orders)
                        try {
                            const userIdResponse = await userApi.getUserIdByUsername(username);
                            const userId = userIdResponse.data || userIdResponse.data?.data;
                            console.log("Got userId from API:", userId);
                            setUserId(userId || username); // Fallback to username if userId not found
                        } catch (e) {
                            console.warn("Could not get userId, using username as fallback:", e);
                            setUserId(username);
                        }
                    }
                } catch (e) {
                    console.error("Error parsing token:", e);
                }
            } catch (error) {
                console.error("Error loading cart:", error);
                showError("Failed to load cart. Please try again.");
                navigate("/cart");
            } finally {
                setLoading(false);
            }
        };

        loadCart();
    }, [navigate, userRole]);

    const handlePlaceOrder = async () => {
        console.log("Place order clicked");
        console.log("userId:", userId);
        console.log("cart:", cart);
        console.log("cart.items:", cart?.items);
        console.log("cart.items length:", cart?.items?.length);
        
        if (!userId) {
            showError("User information is missing. Please try logging in again.");
            return;
        }
        
        if (!cart) {
            showError("Cart is not loaded. Please refresh the page.");
            return;
        }
        
        if (!Array.isArray(cart.items) || cart.items.length === 0) {
            showError("Cart is empty. Please add items to your cart first.");
            return;
        }

        if (!shippingInfo.fullName || !shippingInfo.address || !shippingInfo.city || !shippingInfo.zipCode || !shippingInfo.phone) {
            showError("Please fill in all shipping information.");
            return;
        }

        setProcessing(true);
        try {
            console.log("Creating order from cart for userId:", userId);
            console.log("UserId type:", typeof userId);
            
            // Ensure userId is a string and not empty
            if (!userId) {
                throw new Error("User ID is missing. Please try logging in again.");
            }
            
            const userIdString = String(userId).trim();
            if (!userIdString) {
                throw new Error("Invalid user ID. Please try logging in again.");
            }
            
            console.log("Using userId as string:", userIdString);
            console.log("Full URL will be: /api/orders/from-cart");
            console.log("Backend will use JWT to get userId");
            
            // Create order from cart (backend uses JWT to get userId)
            const orderResponse = await orderApi.createOrderFromCart();
            
            // Log full response for debugging
            console.log("Full orderResponse:", orderResponse);
            console.log("orderResponse.data:", orderResponse.data);
            console.log("orderResponse.data type:", typeof orderResponse.data);
            
            // Backend returns Order directly in response.data (ResponseEntity<Order>)
            // Handle both direct response and wrapped response
            let order = orderResponse.data;
            
            // If response.data is wrapped (has data property), unwrap it
            if (order && order.data && typeof order.data === 'object') {
                order = order.data;
            }
            
            console.log("Order object:", order);
            console.log("Order keys:", order ? Object.keys(order) : "null");
            console.log("order.orderId:", order?.orderId);
            console.log("order.id:", order?.id);
            console.log("order._id:", order?._id);

            if (!order) {
                console.error("Order is null or undefined");
                throw new Error("Order creation failed - no order returned from server");
            }

            // Try multiple possible field names for order ID
            // MongoDB uses _id, but Spring Data maps it to orderId field in Java
            // Jackson serializes it as orderId in JSON
            let orderId = order.orderId || order.id || order._id;
            
            // If orderId is still not found, check if it's nested
            if (!orderId && order.order && (order.order.orderId || order.order.id || order.order._id)) {
                orderId = order.order.orderId || order.order.id || order.order._id;
                order = order.order; // Use nested order object
            }
            
            console.log("Extracted orderId:", orderId);
            
            // If orderId is still missing, try to get the most recent order for this user
            // This is a fallback in case the response structure is unexpected
            if (!orderId) {
                console.warn("Order ID not found in response. Order object:", JSON.stringify(order, null, 2));
                console.warn("Attempting to fetch most recent order as fallback...");
                
                try {
                    // Get user's orders and use the most recent one
                    const ordersResponse = await orderApi.getOrdersByCustomer(userIdString);
                    const orders = Array.isArray(ordersResponse.data) ? ordersResponse.data : [];
                    if (orders.length > 0) {
                        // Sort by orderDate descending and get the first one
                        const sortedOrders = orders.sort((a, b) => {
                            const dateA = a.orderDate ? new Date(a.orderDate).getTime() : 0;
                            const dateB = b.orderDate ? new Date(b.orderDate).getTime() : 0;
                            return dateB - dateA;
                        });
                        const mostRecentOrder = sortedOrders[0];
                        orderId = mostRecentOrder.orderId || mostRecentOrder.id || mostRecentOrder._id;
                        order = mostRecentOrder;
                        console.log("Using most recent order as fallback. OrderId:", orderId);
                    }
                } catch (fallbackError) {
                    console.error("Fallback failed:", fallbackError);
                }
            }
            
            if (!orderId) {
                console.error("Order ID not found even after fallback. Order object:", JSON.stringify(order, null, 2));
                throw new Error("Order creation failed - no order ID returned. Order was created but ID is missing.");
            }
            const totalAmount = cart.totalPrice || cart.items.reduce((sum, item) => sum + (item.subtotal || (item.price * item.quantity)), 0);

            // Process payment
            const paymentData = {
                userId: userId,
                orderId: orderId,
                amount: totalAmount,
                items: cart.items.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price || (item.subtotal ? item.subtotal / item.quantity : 0),
                })),
            };

            console.log("Processing payment:", paymentData);
            const paymentResponse = await paymentApi.mockPayment(paymentData);
            // Backend returns payment response directly (not wrapped)
            const invoice = paymentResponse.data || paymentResponse;
            
            console.log("Payment processed, invoice:", invoice);

            // Navigate to invoice page with order ID
            navigate(`/invoice/${orderId}`, {
                state: {
                    order: order,
                    invoice: invoice,
                    shippingInfo: shippingInfo,
                },
            });

            refreshCartCount();
            showSuccess("Order placed successfully!");
        } catch (error) {
            console.error("Error placing order:", error);
            console.error("Error response:", error.response);
            console.error("Error response data:", error.response?.data);
            
            // Extract error message as string - ensure it's always a string
            let errorMessage = "Failed to place order. Please try again.";
            
            try {
                if (error.response?.data) {
                    const errorData = error.response.data;
                    
                    // If it's already a string, use it
                    if (typeof errorData === 'string') {
                        errorMessage = errorData;
                    }
                    // If it's an object, extract message or error field
                    else if (typeof errorData === 'object' && errorData !== null) {
                        if (errorData.message && typeof errorData.message === 'string') {
                            errorMessage = errorData.message;
                        } else if (errorData.error && typeof errorData.error === 'string') {
                            errorMessage = errorData.error;
                        } else if (errorData.code && typeof errorData.code === 'string') {
                            errorMessage = `Error: ${errorData.code}`;
                        } else {
                            // Last resort: try to stringify, but limit length
                            const errorStr = JSON.stringify(errorData);
                            errorMessage = errorStr.length > 200 ? errorStr.substring(0, 200) + "..." : errorStr;
                        }
                    }
                } else if (error.message && typeof error.message === 'string') {
                    errorMessage = error.message;
                }
            } catch (e) {
                console.error("Error parsing error message:", e);
                errorMessage = "Failed to place order. Please try again.";
            }
            
            // Ensure errorMessage is always a string
            if (typeof errorMessage !== 'string') {
                errorMessage = String(errorMessage);
            }
            
            console.log("Showing error message:", errorMessage);
            showError(errorMessage);
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ color: "#fff", fontSize: "1.5rem" }}>Loading...</div>
            </div>
        );
    }

    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
        return (
            <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ background: "rgba(255, 255, 255, 0.95)", padding: "2rem", borderRadius: "20px", textAlign: "center" }}>
                    <h2 style={{ marginBottom: "1rem" }}>Your cart is empty</h2>
                    <Link to="/products" style={{ color: "#667eea", textDecoration: "none", fontWeight: 600 }}>Continue Shopping</Link>
                </div>
            </div>
        );
    }

    const totalPrice = cart.totalPrice || cart.items.reduce((sum, item) => sum + (item.subtotal || item.price * item.quantity), 0);

    return (
        <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding: "2rem" }}>
            <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "2rem" }}>
                    {/* Shipping Information */}
                    <div style={{ background: "rgba(255, 255, 255, 0.95)", padding: "2rem", borderRadius: "20px", boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)" }}>
                        <h2 style={{ marginBottom: "1.5rem", color: "#2d3748" }}>Shipping Information</h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <input
                                type="text"
                                placeholder="Full Name"
                                value={shippingInfo.fullName}
                                onChange={(e) => setShippingInfo({ ...shippingInfo, fullName: e.target.value })}
                                style={{ padding: "0.75rem", borderRadius: "10px", border: "2px solid #e2e8f0", fontSize: "1rem", background: "#fff", color: "#2d3748", boxSizing: "border-box", width: "100%" }}
                            />
                            <input
                                type="text"
                                placeholder="Address"
                                value={shippingInfo.address}
                                onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                                style={{ padding: "0.75rem", borderRadius: "10px", border: "2px solid #e2e8f0", fontSize: "1rem", background: "#fff", color: "#2d3748", boxSizing: "border-box", width: "100%" }}
                            />
                            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
                                <input
                                    type="text"
                                    placeholder="City"
                                    value={shippingInfo.city}
                                    onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                                    style={{ padding: "0.75rem", borderRadius: "10px", border: "2px solid #e2e8f0", fontSize: "1rem", background: "#fff", color: "#2d3748", boxSizing: "border-box", width: "100%" }}
                                />
                                <input
                                    type="text"
                                    placeholder="ZIP Code"
                                    value={shippingInfo.zipCode}
                                    onChange={(e) => setShippingInfo({ ...shippingInfo, zipCode: e.target.value })}
                                    style={{ padding: "0.75rem", borderRadius: "10px", border: "2px solid #e2e8f0", fontSize: "1rem", background: "#fff", color: "#2d3748", boxSizing: "border-box", width: "100%" }}
                                />
                            </div>
                            <input
                                type="tel"
                                placeholder="Phone Number"
                                value={shippingInfo.phone}
                                onChange={(e) => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                                style={{ padding: "0.75rem", borderRadius: "10px", border: "2px solid #e2e8f0", fontSize: "1rem", background: "#fff", color: "#2d3748", boxSizing: "border-box", width: "100%" }}
                            />
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div style={{ background: "rgba(255, 255, 255, 0.95)", padding: "2rem", borderRadius: "20px", boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)" }}>
                        <h2 style={{ marginBottom: "1.5rem", color: "#2d3748" }}>Order Summary</h2>
                        <div style={{ marginBottom: "1.5rem" }}>
                            {cart.items.map((item) => (
                                <div key={item.productId} style={{ display: "flex", justifyContent: "space-between", padding: "1rem 0", borderBottom: "1px solid #e2e8f0" }}>
                                    <div>
                                        <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>{item.productName}</div>
                                        <div style={{ fontSize: "0.9rem", color: "#718096" }}>Qty: {item.quantity}</div>
                                    </div>
                                    <div style={{ fontWeight: 600, color: "#667eea" }}>${(item.subtotal || item.price * item.quantity).toFixed(2)}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ paddingTop: "1rem", borderTop: "2px solid #e2e8f0" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", fontSize: "1.2rem", fontWeight: 700 }}>
                                <span>Total:</span>
                                <span style={{ color: "#667eea" }}>${totalPrice.toFixed(2)}</span>
                            </div>
                            <button
                                onClick={handlePlaceOrder}
                                disabled={processing}
                                style={{
                                    width: "100%",
                                    padding: "1rem",
                                    background: processing ? "#cbd5e0" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "10px",
                                    fontSize: "1.1rem",
                                    fontWeight: 700,
                                    cursor: processing ? "not-allowed" : "pointer",
                                    transition: "all 0.3s",
                                }}
                            >
                                {processing ? "Processing..." : "Place Order"}
                            </button>
                            <Link to="/cart" style={{ display: "block", textAlign: "center", marginTop: "1rem", color: "#667eea", textDecoration: "none" }}>
                                ← Back to Cart
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

