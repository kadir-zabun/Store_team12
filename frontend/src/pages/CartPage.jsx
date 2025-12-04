import { Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import cartApi from "../api/cartApi";
import { cartStorage } from "../utils/cartStorage";
import { useCartCount } from "../hooks/useCartCount";
import { useToast } from "../contexts/ToastContext";
import { useUserRole } from "../hooks/useUserRole";
import { getErrorMessage } from "../utils/errorHandler";

export default function CartPage() {
    const [userName, setUserName] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [cart, setCart] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [updating, setUpdating] = useState({});
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { cartCount, refreshCartCount } = useCartCount();
    const { success: showSuccess, error: showError, info: showInfo } = useToast();
    const userRole = useUserRole();

    // Redirect PRODUCT_OWNER to dashboard
    useEffect(() => {
        if (userRole === "PRODUCT_OWNER") {
            navigate("/owner-dashboard");
        }
    }, [userRole, navigate]);

    const extractUsernameFromToken = () => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            setUserName(null);
            return;
        }
        try {
            const payloadBase64 = token.split(".")[1];
            const normalized = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
            const payloadJson = atob(normalized);
            const payload = JSON.parse(payloadJson);
            const nameFromToken = payload.sub || payload.name || payload.username;
            setUserName(nameFromToken || null);
        } catch (e) {
            setUserName(null);
        }
    };

    useEffect(() => {
        extractUsernameFromToken();
        const intervalId = setInterval(() => {
            extractUsernameFromToken();
        }, 200);
        const timeoutId = setTimeout(() => {
            clearInterval(intervalId);
            setInterval(() => {
                extractUsernameFromToken();
            }, 2000);
        }, 10000);
        return () => {
            clearInterval(intervalId);
            clearTimeout(timeoutId);
        };
    }, []);

    useEffect(() => {
        extractUsernameFromToken();
    }, [location.pathname]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        if (showDropdown) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showDropdown]);

    useEffect(() => {
        loadCart();
        
        const handleStorageChange = () => {
            const token = localStorage.getItem("access_token");
            if (!token) {
                loadCart();
            }
        };
        
        const handleCartUpdated = () => {
            const token = localStorage.getItem("access_token");
            if (!token) {
                loadCart();
            }
        };
        
        window.addEventListener("storage", handleStorageChange);
        window.addEventListener("cartUpdated", handleCartUpdated);
        const tokenSetListener = () => {
            loadCart();
        };
        window.addEventListener("tokenSet", tokenSetListener);
        
        return () => {
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("cartUpdated", handleCartUpdated);
            window.removeEventListener("tokenSet", tokenSetListener);
        };
    }, []);

    const loadCart = async () => {
        setLoading(true);
        setError("");
        const token = localStorage.getItem("access_token");
        
        if (!token) {
            const guestCart = cartStorage.getCart();
            setCart({
                items: guestCart.items.map(item => ({
                    productId: item.productId,
                    productName: item.productName,
                    price: item.price,
                    quantity: item.quantity,
                    subtotal: item.subtotal,
                })),
                totalPrice: guestCart.totalPrice,
            });
            setLoading(false);
            return;
        }

        try {
            const response = await cartApi.getCart();
            const apiResponse = response.data;
            
            if (apiResponse && apiResponse.data) {
                setCart(apiResponse.data);
            } else if (apiResponse) {
                setCart(apiResponse);
            } else {
                setCart(null);
            }
        } catch (err) {
            console.error("Error loading cart:", err);
            if (err.response?.status === 401) {
                localStorage.removeItem("access_token");
                localStorage.removeItem("user_role");
                const guestCart = cartStorage.getCart();
                setCart({
                    items: guestCart.items.map(item => ({
                        productId: item.productId,
                        productName: item.productName,
                        price: item.price,
                        quantity: item.quantity,
                        subtotal: item.subtotal,
                    })),
                    totalPrice: guestCart.totalPrice,
                });
                setError("Your session has expired. Please login again.");
                showError("Your session has expired. Please login again.");
            } else {
                const errorMessage = getErrorMessage(err, "Failed to load your cart. Please try again.");
                setError(errorMessage);
                showError(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateQuantity = async (productId, newQuantity) => {
        if (newQuantity < 1) {
            return;
        }

        const token = localStorage.getItem("access_token");
        setUpdating({ ...updating, [productId]: true });
        
        try {
            if (token) {
                const response = await cartApi.updateCartItem(productId, newQuantity);
                const apiResponse = response.data;
                
                if (apiResponse && apiResponse.data) {
                    setCart(apiResponse.data);
                } else if (apiResponse) {
                    setCart(apiResponse);
                }
                // Refresh cart count after updating
                refreshCartCount();
            } else {
                const updatedCart = cartStorage.updateItemQuantity(productId, newQuantity);
                setCart({
                    items: updatedCart.items.map(item => ({
                        productId: item.productId,
                        productName: item.productName,
                        price: item.price,
                        quantity: item.quantity,
                        subtotal: item.subtotal,
                    })),
                    totalPrice: updatedCart.totalPrice,
                });
                window.dispatchEvent(new Event("cartUpdated"));
            }
        } catch (err) {
            console.error("Error updating cart:", err);
            const errorMessage = getErrorMessage(err, "Failed to update item quantity. Please try again.");
            showError(errorMessage);
        } finally {
            setUpdating({ ...updating, [productId]: false });
        }
    };

    const handleRemoveItem = async (productId) => {
        if (!window.confirm("Are you sure you want to remove this item from your cart?")) {
            return;
        }

        const token = localStorage.getItem("access_token");
        setUpdating({ ...updating, [productId]: true });
        
        try {
            if (token) {
                const response = await cartApi.removeFromCart(productId);
                const apiResponse = response.data;
                
                if (apiResponse && apiResponse.data) {
                    setCart(apiResponse.data);
                } else if (apiResponse) {
                    setCart(apiResponse);
                }
                // Refresh cart count after removing
                refreshCartCount();
            } else {
                const updatedCart = cartStorage.removeItem(productId);
                setCart({
                    items: updatedCart.items.map(item => ({
                        productId: item.productId,
                        productName: item.productName,
                        price: item.price,
                        quantity: item.quantity,
                        subtotal: item.subtotal,
                    })),
                    totalPrice: updatedCart.totalPrice,
                });
                window.dispatchEvent(new Event("cartUpdated"));
            }
        } catch (err) {
            console.error("Error removing item:", err);
            const errorMessage = getErrorMessage(err, "Failed to remove item from cart. Please try again.");
            showError(errorMessage);
        } finally {
            setUpdating({ ...updating, [productId]: false });
        }
    };

    const handleClearCart = async () => {
        if (!window.confirm("Are you sure you want to clear your entire cart?")) {
            return;
        }

        const token = localStorage.getItem("access_token");
        
        try {
            if (token) {
                await cartApi.clearCart();
                // Refresh cart count after clearing
                refreshCartCount();
            } else {
                cartStorage.clearCart();
                window.dispatchEvent(new Event("cartUpdated"));
            }
            setCart({ items: [], totalPrice: 0 });
        } catch (err) {
            console.error("Error clearing cart:", err);
            const errorMessage = getErrorMessage(err, "Failed to clear your cart. Please try again.");
            showError(errorMessage);
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

    const formatPrice = (price) => {
        if (typeof price === "number") {
            return price.toFixed(2);
        }
        if (typeof price === "string") {
            return parseFloat(price).toFixed(2);
        }
        return "0.00";
    };

    const cartItems = cart?.items || [];
    const totalPrice = cart?.totalPrice || 0;

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
                        <Link
                            to="/"
                            style={{
                                color: "#4a5568",
                                textDecoration: "none",
                                padding: "0.5rem 1rem",
                                borderRadius: "8px",
                                fontWeight: 500,
                                transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#f7fafc";
                                e.currentTarget.style.color = "#667eea";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.color = "#4a5568";
                            }}
                        >
                            Home
                        </Link>
                        <Link
                            to="/products"
                            style={{
                                color: "#4a5568",
                                textDecoration: "none",
                                padding: "0.5rem 1rem",
                                borderRadius: "8px",
                                fontWeight: 500,
                                transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#f7fafc";
                                e.currentTarget.style.color = "#667eea";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.color = "#4a5568";
                            }}
                        >
                            Products
                        </Link>
                        <Link
                            to="/cart"
                            style={{
                                color: "#667eea",
                                textDecoration: "none",
                                padding: "0.5rem 1rem",
                                borderRadius: "8px",
                                fontWeight: 600,
                                background: "#f7fafc",
                                transition: "all 0.2s",
                                position: "relative",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                            }}
                        >
                            <span>Cart</span>
                            {cartCount > 0 && (
                                <span
                                    style={{
                                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                        color: "#fff",
                                        borderRadius: "50%",
                                        minWidth: "20px",
                                        height: "20px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "0.75rem",
                                        fontWeight: 700,
                                        padding: "0 0.25rem",
                                    }}
                                >
                                    {cartCount > 99 ? "99+" : cartCount}
                                </span>
                            )}
                        </Link>
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "1rem", position: "relative" }}>
                    {userName ? (
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
                                    transition: "all 0.3s",
                                    boxShadow: "0 2px 4px rgba(102, 126, 234, 0.3)",
                                }}
                            >
                                <span style={{ fontSize: "1.2rem" }}>👤</span>
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
                                    <Link
                                        to="/cart"
                                        onClick={() => setShowDropdown(false)}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.8rem",
                                            padding: "0.9rem 1.2rem",
                                            color: "#2d3748",
                                            textDecoration: "none",
                                            fontSize: "0.95rem",
                                            borderBottom: "1px solid #f1f5f9",
                                        }}
                                    >
                                        <span>🛒</span>
                                        <span>My Cart</span>
                                    </Link>
                                    <Link
                                        to="/orders"
                                        onClick={() => setShowDropdown(false)}
                                        style={{
                                            width: "100%",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.8rem",
                                            textAlign: "left",
                                            padding: "0.9rem 1.2rem",
                                            color: "#2d3748",
                                            fontSize: "0.95rem",
                                            border: "none",
                                            background: "transparent",
                                            cursor: "pointer",
                                            borderBottom: "1px solid #f1f5f9",
                                            textDecoration: "none",
                                        }}
                                    >
                                        <span>📋</span>
                                        <span>Order History</span>
                                    </Link>
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
                    ) : (
                        <Link
                            to="/login"
                            style={{
                                color: "#fff",
                                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                textDecoration: "none",
                                padding: "0.6rem 1.5rem",
                                borderRadius: "10px",
                                fontWeight: 600,
                                transition: "all 0.3s",
                                boxShadow: "0 2px 4px rgba(102, 126, 234, 0.3)",
                            }}
                        >
                            Login
                        </Link>
                    )}
                </div>
            </nav>

            <div
                style={{
                    minHeight: "calc(100vh - 80px)",
                    padding: "4rem 2rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                }}
            >
                <div
                    style={{
                        background: "rgba(255, 255, 255, 0.95)",
                        backdropFilter: "blur(10px)",
                        borderRadius: "20px",
                        padding: "3rem",
                        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
                        maxWidth: "1200px",
                        width: "100%",
                    }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
                        <h1
                            style={{
                                fontSize: "clamp(2rem, 4vw, 3rem)",
                                fontWeight: 700,
                                color: "#2d3748",
                            }}
                        >
                            Your Cart
                        </h1>
                        {cartItems.length > 0 && (
                            <button
                                onClick={handleClearCart}
                                style={{
                                    padding: "0.6rem 1.2rem",
                                    background: "#fed7d7",
                                    color: "#c53030",
                                    border: "none",
                                    borderRadius: "8px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                    fontSize: "0.9rem",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "#fc8181";
                                    e.currentTarget.style.color = "#fff";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "#fed7d7";
                                    e.currentTarget.style.color = "#c53030";
                                }}
                            >
                                Clear Cart
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div style={{ textAlign: "center", padding: "3rem", color: "#a0aec0", fontSize: "1.1rem" }}>
                            Loading your cart...
                        </div>
                    ) : error ? (
                        <div style={{ textAlign: "center", padding: "3rem" }}>
                            <div style={{ color: "#e53e3e", fontSize: "1.1rem", marginBottom: "1rem" }}>
                                {error}
                            </div>
                            <button
                                onClick={loadCart}
                                style={{
                                    padding: "0.6rem 1.2rem",
                                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "8px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                }}
                            >
                                Retry
                            </button>
                        </div>
                    ) : cartItems.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "3rem" }}>
                            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🛒</div>
                            <div style={{ color: "#a0aec0", fontSize: "1.1rem", marginBottom: "2rem" }}>
                                Your cart is empty. Add products from the Products page.
                            </div>
                            <Link
                                to="/products"
                                style={{
                                    display: "inline-block",
                                    padding: "0.8rem 2rem",
                                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                    color: "#fff",
                                    textDecoration: "none",
                                    borderRadius: "10px",
                                    fontWeight: 600,
                                    transition: "all 0.3s",
                                    boxShadow: "0 2px 4px rgba(102, 126, 234, 0.3)",
                                }}
                            >
                                Browse Products
                            </Link>
                        </div>
                    ) : (
                        <div>
                            <div style={{ marginBottom: "2rem" }}>
                                {cartItems.map((item) => (
                                    <div
                                        key={item.productId}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "1.5rem",
                                            padding: "1.5rem",
                                            background: "#f7fafc",
                                            borderRadius: "12px",
                                            marginBottom: "1rem",
                                            border: "1px solid #e2e8f0",
                                        }}
                                    >
                                        <div style={{ flex: 1 }}>
                                            <h3
                                                style={{
                                                    fontSize: "1.2rem",
                                                    fontWeight: 600,
                                                    color: "#2d3748",
                                                    marginBottom: "0.5rem",
                                                }}
                                            >
                                                {item.productName}
                                            </h3>
                                            <div style={{ fontSize: "1rem", color: "#667eea", fontWeight: 600 }}>
                                                ${formatPrice(item.price)} each
                                            </div>
                                        </div>

                                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                            <button
                                                onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                                                disabled={updating[item.productId] || item.quantity <= 1}
                                                style={{
                                                    width: "36px",
                                                    height: "36px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    background: "#e2e8f0",
                                                    border: "none",
                                                    borderRadius: "6px",
                                                    fontSize: "1.2rem",
                                                    fontWeight: 600,
                                                    cursor: updating[item.productId] || item.quantity <= 1 ? "not-allowed" : "pointer",
                                                    opacity: updating[item.productId] || item.quantity <= 1 ? 0.5 : 1,
                                                    transition: "all 0.2s",
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!updating[item.productId] && item.quantity > 1) {
                                                        e.currentTarget.style.background = "#cbd5e0";
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!updating[item.productId] && item.quantity > 1) {
                                                        e.currentTarget.style.background = "#e2e8f0";
                                                    }
                                                }}
                                            >
                                                −
                                            </button>
                                            <div
                                                style={{
                                                    minWidth: "60px",
                                                    textAlign: "center",
                                                    fontSize: "1.1rem",
                                                    fontWeight: 600,
                                                    color: "#2d3748",
                                                }}
                                            >
                                                {updating[item.productId] ? "..." : item.quantity}
                                            </div>
                                            <button
                                                onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                                                disabled={updating[item.productId]}
                                                style={{
                                                    width: "36px",
                                                    height: "36px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    background: "#e2e8f0",
                                                    border: "none",
                                                    borderRadius: "6px",
                                                    fontSize: "1.2rem",
                                                    fontWeight: 600,
                                                    cursor: updating[item.productId] ? "not-allowed" : "pointer",
                                                    opacity: updating[item.productId] ? 0.5 : 1,
                                                    transition: "all 0.2s",
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!updating[item.productId]) {
                                                        e.currentTarget.style.background = "#cbd5e0";
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!updating[item.productId]) {
                                                        e.currentTarget.style.background = "#e2e8f0";
                                                    }
                                                }}
                                            >
                                                +
                                            </button>
                                        </div>

                                        <div
                                            style={{
                                                minWidth: "120px",
                                                textAlign: "right",
                                                fontSize: "1.2rem",
                                                fontWeight: 700,
                                                color: "#667eea",
                                            }}
                                        >
                                            ${formatPrice(item.subtotal)}
                                        </div>

                                        <button
                                            onClick={() => handleRemoveItem(item.productId)}
                                            disabled={updating[item.productId]}
                                            style={{
                                                padding: "0.5rem 1rem",
                                                background: "#fed7d7",
                                                color: "#c53030",
                                                border: "none",
                                                borderRadius: "6px",
                                                fontSize: "0.9rem",
                                                fontWeight: 600,
                                                cursor: updating[item.productId] ? "not-allowed" : "pointer",
                                                opacity: updating[item.productId] ? 0.5 : 1,
                                                transition: "all 0.2s",
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!updating[item.productId]) {
                                                    e.currentTarget.style.background = "#fc8181";
                                                    e.currentTarget.style.color = "#fff";
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!updating[item.productId]) {
                                                    e.currentTarget.style.background = "#fed7d7";
                                                    e.currentTarget.style.color = "#c53030";
                                                }
                                            }}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div
                                style={{
                                    padding: "2rem",
                                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                    borderRadius: "12px",
                                    color: "#fff",
                                }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                                    <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>Total Price:</div>
                                    <div style={{ fontSize: "2rem", fontWeight: 700 }}>${formatPrice(totalPrice)}</div>
                                </div>
                                <button
                                    onClick={() => {
                                        const token = localStorage.getItem("access_token");
                                        if (!token) {
                                            if (window.confirm("Please login to proceed to checkout. Would you like to login now?")) {
                                                navigate("/login");
                                            }
                                        } else {
                                            navigate("/checkout");
                                        }
                                    }}
                                    style={{
                                        width: "100%",
                                        padding: "1rem",
                                        background: "#fff",
                                        color: "#667eea",
                                        border: "none",
                                        borderRadius: "10px",
                                        fontSize: "1.1rem",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        transition: "all 0.3s",
                                        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = "translateY(-2px)";
                                        e.currentTarget.style.boxShadow = "0 6px 12px rgba(0, 0, 0, 0.15)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = "translateY(0)";
                                        e.currentTarget.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
                                    }}
                                >
                                    {localStorage.getItem("access_token") ? "Proceed to Checkout" : "Login to Checkout"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
