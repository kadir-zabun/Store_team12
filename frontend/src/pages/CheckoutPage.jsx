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
    const [savedAddresses, setSavedAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState("");
    const [paymentInfo, setPaymentInfo] = useState({
        cardNumber: "",
        cardHolderName: "",
        expiryDate: "",
        cvv: "",
        saveCard: false,
    });
    const [savedCard, setSavedCard] = useState(null);
    const navigate = useNavigate();
    const { refreshCartCount } = useCartCount();
    const { success: showSuccess, error: showError } = useToast();
    const userRole = useUserRole();

    useEffect(() => {
        // Load saved addresses
        const savedAddressesData = localStorage.getItem("user_addresses");
        if (savedAddressesData) {
            try {
                const addresses = JSON.parse(savedAddressesData);
                setSavedAddresses(addresses);
            } catch (e) {
                console.error("Error loading addresses:", e);
            }
        }
    }, []);

    useEffect(() => {
        // Load selected address
        if (selectedAddressId && savedAddresses.length > 0) {
            const selectedAddress = savedAddresses.find((addr) => addr.id === selectedAddressId);
            if (selectedAddress) {
                setShippingInfo({
                    fullName: selectedAddress.fullName,
                    address: selectedAddress.address,
                    city: selectedAddress.city,
                    zipCode: selectedAddress.zipCode,
                    phone: selectedAddress.phone,
                });
            }
        }
    }, [selectedAddressId, savedAddresses]);

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

                            // Load saved card information
                            try {
                                const cardResponse = await userApi.getMyCard();
                                const cardData = cardResponse.data?.data || cardResponse.data;
                                if (cardData && cardData.cardNumber) {
                                    setSavedCard(cardData);
                                    setPaymentInfo({
                                        cardNumber: cardData.cardNumber || "",
                                        cardHolderName: cardData.cardHolderName || "",
                                        expiryDate: cardData.expiryDate || "",
                                        cvv: "",
                                        saveCard: false,
                                    });
                                }
                            } catch (e) {
                                console.log("No saved card found or error loading card:", e);
                            }
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

        if (!paymentInfo.cardNumber || !paymentInfo.cardHolderName || !paymentInfo.expiryDate || !paymentInfo.cvv) {
            showError("Please fill in all payment information.");
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

            // Format shipping address from form fields
            const formattedAddress = `${shippingInfo.fullName}, ${shippingInfo.address}, ${shippingInfo.city} ${shippingInfo.zipCode}, Tel: ${shippingInfo.phone}`;

            // Create order from cart (backend uses JWT to get userId)
            const orderResponse = await orderApi.createOrderFromCart(formattedAddress);


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
                cardNumber: paymentInfo.cardNumber,
                cardHolderName: paymentInfo.cardHolderName,
                expiryDate: paymentInfo.expiryDate,
                cvv: paymentInfo.cvv,
                saveCard: paymentInfo.saveCard,
            };

            console.log("Processing payment:", paymentData);
            const paymentResponse = await paymentApi.mockPayment(paymentData);
            // Backend returns payment response directly (not wrapped)
            const invoice = paymentResponse.data || paymentResponse;

            console.log("Payment processed, invoice:", invoice);

            // Save address if not already saved
            const addressExists = savedAddresses.some(
                (addr) =>
                    addr.fullName === shippingInfo.fullName &&
                    addr.address === shippingInfo.address &&
                    addr.city === shippingInfo.city &&
                    addr.zipCode === shippingInfo.zipCode &&
                    addr.phone === shippingInfo.phone
            );

            if (!addressExists) {
                const addressId = Date.now().toString();
                const newAddress = {
                    id: addressId,
                    fullName: shippingInfo.fullName,
                    address: shippingInfo.address,
                    city: shippingInfo.city,
                    zipCode: shippingInfo.zipCode,
                    phone: shippingInfo.phone,
                };
                const updatedAddresses = [...savedAddresses, newAddress];
                localStorage.setItem("user_addresses", JSON.stringify(updatedAddresses));
                setSavedAddresses(updatedAddresses);
            }

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
            <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding: "2rem" }}>
                <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
                    <div style={{ marginBottom: "1.5rem" }}>
                        <Link
                            to="/cart"
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                color: "#fff",
                                textDecoration: "none",
                                fontSize: "1rem",
                                fontWeight: 500,
                                padding: "0.5rem 1rem",
                                borderRadius: "8px",
                                background: "rgba(255, 255, 255, 0.2)",
                            }}
                        >
                            ← Back to Cart
                        </Link>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
                        <div style={{ color: "#fff", fontSize: "1.5rem" }}>Loading...</div>
                    </div>
                </div>
            </div>
        );
    }

    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
        return (
            <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding: "2rem" }}>
                <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
                    <div style={{ marginBottom: "1.5rem" }}>
                        <Link
                            to="/cart"
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                color: "#fff",
                                textDecoration: "none",
                                fontSize: "1rem",
                                fontWeight: 500,
                                padding: "0.5rem 1rem",
                                borderRadius: "8px",
                                background: "rgba(255, 255, 255, 0.2)",
                            }}
                        >
                            ← Back to Cart
                        </Link>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
                        <div style={{ background: "rgba(255, 255, 255, 0.95)", padding: "2rem", borderRadius: "20px", textAlign: "center" }}>
                            <h2 style={{ marginBottom: "1rem" }}>Your cart is empty</h2>
                            <Link to="/products" style={{ color: "#667eea", textDecoration: "none", fontWeight: 600 }}>Continue Shopping</Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const totalPrice = cart.totalPrice || cart.items.reduce((sum, item) => sum + (item.subtotal || item.price * item.quantity), 0);

    const formatCardNumber = (value) => {
        const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
        const matches = v.match(/\d{4,16}/g);
        const match = (matches && matches[0]) || "";
        const parts = [];
        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }
        if (parts.length) {
            return parts.join(" ");
        } else {
            return v;
        }
    };

    const formatExpiryDate = (value) => {
        const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
        if (v.length >= 2) {
            const month = parseInt(v.substring(0, 2), 10);
            // Validate month: must be between 01 and 12
            if (month < 1 || month > 12) {
                // If invalid month, don't update the value
                return paymentInfo.expiryDate;
            }
            return v.substring(0, 2) + "/" + v.substring(2, 4);
        }
        // For single digit, allow 0 and 1 as they can lead to valid months (01-12)
        if (v.length === 1 && parseInt(v, 10) > 1) {
            // If first digit is > 1, prepend 0 to make it 0X format
            const month = parseInt(v, 10);
            if (month >= 2 && month <= 9) {
                return "0" + v + "/";
            }
        }
        return v;
    };

    return (
        <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding: "2rem" }}>
            <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
                <div style={{ marginBottom: "1.5rem" }}>
                    <Link
                        to="/cart"
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            color: "#fff",
                            textDecoration: "none",
                            fontSize: "1rem",
                            fontWeight: 500,
                            padding: "0.5rem 1rem",
                            borderRadius: "8px",
                            background: "rgba(255, 255, 255, 0.2)",
                            transition: "all 0.3s",
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.background = "rgba(255, 255, 255, 0.3)";
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = "rgba(255, 255, 255, 0.2)";
                        }}
                    >
                        ← Back to Cart
                    </Link>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "2rem", marginBottom: "2rem" }}>
                    {/* Shipping Information */}
                    <div style={{ background: "rgba(255, 255, 255, 0.95)", padding: "2rem", borderRadius: "20px", boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)" }}>
                        <h2 style={{ marginBottom: "1.5rem", color: "#2d3748" }}>Shipping Information</h2>
                        {savedAddresses.length > 0 && (
                            <div style={{ marginBottom: "1rem" }}>
                                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, color: "#4a5568", marginBottom: "0.5rem" }}>
                                    Select Saved Address
                                </label>
                                <select
                                    value={selectedAddressId}
                                    onChange={(e) => {
                                        setSelectedAddressId(e.target.value);
                                        if (e.target.value === "") {
                                            setShippingInfo({ fullName: "", address: "", city: "", zipCode: "", phone: "" });
                                        }
                                    }}
                                    style={{
                                        padding: "0.75rem",
                                        borderRadius: "10px",
                                        border: "2px solid #e2e8f0",
                                        fontSize: "1rem",
                                        background: "#fff",
                                        color: "#2d3748",
                                        width: "100%",
                                        marginBottom: "1rem",
                                    }}
                                >
                                    <option value="">-- Select or enter new address --</option>
                                    {savedAddresses.map((addr) => (
                                        <option key={addr.id} value={addr.id}>
                                            {addr.fullName} - {addr.address}, {addr.city}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <input
                                type="text"
                                placeholder="Full Name"
                                value={shippingInfo.fullName}
                                onChange={(e) => {
                                    setShippingInfo({ ...shippingInfo, fullName: e.target.value });
                                    setSelectedAddressId("");
                                }}
                                style={{ padding: "0.75rem", borderRadius: "10px", border: "2px solid #e2e8f0", fontSize: "1rem", background: "#fff", color: "#2d3748", boxSizing: "border-box", width: "100%" }}
                            />
                            <input
                                type="text"
                                placeholder="Address"
                                value={shippingInfo.address}
                                onChange={(e) => {
                                    setShippingInfo({ ...shippingInfo, address: e.target.value });
                                    setSelectedAddressId("");
                                }}
                                style={{ padding: "0.75rem", borderRadius: "10px", border: "2px solid #e2e8f0", fontSize: "1rem", background: "#fff", color: "#2d3748", boxSizing: "border-box", width: "100%" }}
                            />
                            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
                                <input
                                    type="text"
                                    placeholder="City"
                                    value={shippingInfo.city}
                                    onChange={(e) => {
                                        setShippingInfo({ ...shippingInfo, city: e.target.value });
                                        setSelectedAddressId("");
                                    }}
                                    style={{ padding: "0.75rem", borderRadius: "10px", border: "2px solid #e2e8f0", fontSize: "1rem", background: "#fff", color: "#2d3748", boxSizing: "border-box", width: "100%" }}
                                />
                                <input
                                    type="text"
                                    placeholder="ZIP Code"
                                    value={shippingInfo.zipCode}
                                    onChange={(e) => {
                                        setShippingInfo({ ...shippingInfo, zipCode: e.target.value });
                                        setSelectedAddressId("");
                                    }}
                                    style={{ padding: "0.75rem", borderRadius: "10px", border: "2px solid #e2e8f0", fontSize: "1rem", background: "#fff", color: "#2d3748", boxSizing: "border-box", width: "100%" }}
                                />
                            </div>
                            <input
                                type="tel"
                                placeholder="Phone Number"
                                value={shippingInfo.phone}
                                onChange={(e) => {
                                    setShippingInfo({ ...shippingInfo, phone: e.target.value });
                                    setSelectedAddressId("");
                                }}
                                style={{ padding: "0.75rem", borderRadius: "10px", border: "2px solid #e2e8f0", fontSize: "1rem", background: "#fff", color: "#2d3748", boxSizing: "border-box", width: "100%" }}
                            />
                        </div>
                    </div>

                    {/* Payment Information */}
                    <div style={{ background: "rgba(255, 255, 255, 0.95)", padding: "2rem", borderRadius: "20px", boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)" }}>
                        <h2 style={{ marginBottom: "1.5rem", color: "#2d3748" }}>Payment Information</h2>
                        {savedCard && (
                            <div style={{ marginBottom: "1rem", padding: "0.75rem", background: "#f0f9ff", borderRadius: "10px", border: "1px solid #bfdbfe" }}>
                                <div style={{ fontSize: "0.9rem", color: "#1e40af", marginBottom: "0.5rem" }}>Saved Card: •••• {savedCard.cardNumber?.slice(-4)}</div>
                                <button
                                    onClick={() => {
                                        setSavedCard(null);
                                        setPaymentInfo({
                                            cardNumber: "",
                                            cardHolderName: "",
                                            expiryDate: "",
                                            cvv: "",
                                            saveCard: false,
                                        });
                                    }}
                                    style={{ fontSize: "0.85rem", color: "#667eea", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                                >
                                    Use different card
                                </button>
                            </div>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <input
                                type="text"
                                placeholder="Card Number"
                                value={paymentInfo.cardNumber}
                                onChange={(e) => setPaymentInfo({ ...paymentInfo, cardNumber: formatCardNumber(e.target.value) })}
                                maxLength={19}
                                style={{ padding: "0.75rem", borderRadius: "10px", border: "2px solid #e2e8f0", fontSize: "1rem", background: "#fff", color: "#2d3748", boxSizing: "border-box", width: "100%" }}
                            />
                            <input
                                type="text"
                                placeholder="Card Holder Name"
                                value={paymentInfo.cardHolderName}
                                onChange={(e) => setPaymentInfo({ ...paymentInfo, cardHolderName: e.target.value })}
                                style={{ padding: "0.75rem", borderRadius: "10px", border: "2px solid #e2e8f0", fontSize: "1rem", background: "#fff", color: "#2d3748", boxSizing: "border-box", width: "100%" }}
                            />
                            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
                                <input
                                    type="text"
                                    placeholder="MM/YY"
                                    value={paymentInfo.expiryDate}
                                    onChange={(e) => setPaymentInfo({ ...paymentInfo, expiryDate: formatExpiryDate(e.target.value) })}
                                    maxLength={5}
                                    style={{ padding: "0.75rem", borderRadius: "10px", border: "2px solid #e2e8f0", fontSize: "1rem", background: "#fff", color: "#2d3748", boxSizing: "border-box", width: "100%" }}
                                />
                                <input
                                    type="text"
                                    placeholder="CVV"
                                    value={paymentInfo.cvv}
                                    onChange={(e) => setPaymentInfo({ ...paymentInfo, cvv: e.target.value.replace(/\D/g, "").slice(0, 3) })}
                                    maxLength={3}
                                    style={{ padding: "0.75rem", borderRadius: "10px", border: "2px solid #e2e8f0", fontSize: "1rem", background: "#fff", color: "#2d3748", boxSizing: "border-box", width: "100%" }}
                                />
                            </div>
                            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                                <input
                                    type="checkbox"
                                    checked={paymentInfo.saveCard}
                                    onChange={(e) => setPaymentInfo({ ...paymentInfo, saveCard: e.target.checked })}
                                    style={{ width: "1.2rem", height: "1.2rem", cursor: "pointer" }}
                                />
                                <span style={{ fontSize: "0.9rem", color: "#4a5568" }}>Save card for future purchases</span>
                            </label>
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div style={{ background: "rgba(255, 255, 255, 0.95)", padding: "2rem", borderRadius: "20px", boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)" }}>
                        <h2 style={{ marginBottom: "1.5rem", color: "#2d3748" }}>Order Summary</h2>
                        <div style={{ marginBottom: "1.5rem" }}>
                            {cart.items && cart.items.length > 0 ? (
                                cart.items.map((item) => (
                                    <div key={item.productId} style={{ display: "flex", justifyContent: "space-between", padding: "1rem 0", borderBottom: "1px solid #e2e8f0", gap: "1rem" }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontWeight: 600,
                                                marginBottom: "0.25rem",
                                                color: "#2d3748",
                                                fontSize: "0.95rem",
                                                wordWrap: "break-word",
                                                overflowWrap: "break-word",
                                                lineHeight: "1.4"
                                            }}>
                                                {item.productName || `Product ${item.productId}`}
                                            </div>
                                            <div style={{ fontSize: "0.85rem", color: "#718096" }}>Qty: {item.quantity}</div>
                                        </div>
                                        <div style={{ fontWeight: 600, color: "#667eea", fontSize: "1rem", whiteSpace: "nowrap", marginLeft: "1rem" }}>
                                            ${(item.subtotal || (item.price || 0) * (item.quantity || 0)).toFixed(2)}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: "1rem", textAlign: "center", color: "#718096" }}>No items in cart</div>
                            )}
                        </div>
                        <div style={{ paddingTop: "1rem", borderTop: "2px solid #e2e8f0" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", fontSize: "1.2rem", fontWeight: 700 }}>
                                <span style={{ color: "#4a5568" }}>Total:</span>
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

