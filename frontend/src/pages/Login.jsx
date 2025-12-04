import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import authApi from "../api/authApi";
import cartApi from "../api/cartApi";
import { cartStorage } from "../utils/cartStorage";
import { useToast } from "../contexts/ToastContext";

export default function LoginPage() {
    const [usernameOrEmail, setUsernameOrEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [userName, setUserName] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { success: showSuccess, error: showError, info: showInfo } = useToast();

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

    const handleLogout = () => {
        localStorage.removeItem("access_token");
        setUserName(null);
        setShowDropdown(false);
        navigate("/login");
    };

    const toggleDropdown = () => {
        setShowDropdown(!showDropdown);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        try {
            const res = await authApi.login(usernameOrEmail, password);
            const apiResponse = res.data;
            const authResponse = apiResponse.data;

            if (authResponse && authResponse.token) {
                localStorage.setItem("access_token", authResponse.token);
                localStorage.setItem("user_role", authResponse.role || "CUSTOMER");
                
                const guestCart = cartStorage.getCart();
                // Sadece CUSTOMER için cart merge yap
                if (authResponse.role === "CUSTOMER" && guestCart.items.length > 0) {
                    try {
                        for (const item of guestCart.items) {
                            await cartApi.addToCart(item.productId, item.quantity);
                        }
                        cartStorage.clearCart();
                        showSuccess("Cart items merged successfully!");
                    } catch (err) {
                        console.error("Error merging cart:", err);
                        showError("Some cart items could not be merged. Please check your cart.");
                    }
                }
                
                showSuccess("Login successful! Redirecting...");
                window.dispatchEvent(new Event("storage"));
                window.dispatchEvent(new CustomEvent("tokenSet"));
                setTimeout(() => {
                    // Role göre yönlendirme
                    if (authResponse.role === "PRODUCT_OWNER") {
                        window.location.href = "/owner-dashboard";
                    } else {
                        window.location.href = "/";
                    }
                }, 150);
            } else {
                const errorMsg = "Login failed. Please try again.";
                setError(errorMsg);
                showError(errorMsg);
            }
        } catch (err) {
            console.error("LOGIN ERROR:", err);
            
            // Check if it's an authentication error (401, 403) or unexpected error
            const status = err.response?.status;
            const errorMessage = 
                err.response?.data?.data?.message ||
                err.response?.data?.error?.message ||
                err.response?.data?.message ||
                "";
            
            // If it's an auth error or unexpected error, show user-friendly message
            if (status === 401 || status === 403 || errorMessage.includes("Unexpected error") || errorMessage.includes("Kullanıcı bulunamadı")) {
                const friendlyMessage = "Email or password is incorrect";
                setError(friendlyMessage);
                showError(friendlyMessage);
            } else if (errorMessage) {
                // Use the actual error message if it's something else
                setError(errorMessage);
                showError(errorMessage);
            } else {
                // Fallback
                const fallbackMessage = "Email or password is incorrect";
                setError(fallbackMessage);
                showError(fallbackMessage);
            }
        }
    };

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
                        🛍️ Store
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
                            Cart
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
                                    <button
                                        onClick={() => {
                                            setShowDropdown(false);
                                            showInfo("Order History feature coming soon!");
                                        }}
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
                                        }}
                                    >
                                        <span>📋</span>
                                        <span>Order History</span>
                                    </button>
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
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                    padding: "2rem",
            }}
        >
            <form
                onSubmit={handleSubmit}
                style={{
                    display: "flex",
                    flexDirection: "column",
                        gap: "1.2rem",
                        background: "rgba(255, 255, 255, 0.95)",
                        backdropFilter: "blur(10px)",
                        padding: "3rem",
                        borderRadius: "20px",
                        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
                        minWidth: "400px",
                        maxWidth: "450px",
                }}
            >
                <h2
                    style={{
                        textAlign: "center",
                            color: "#2d3748",
                            fontSize: "2rem",
                            fontWeight: 700,
                        margin: 0,
                            marginBottom: "0.5rem",
                    }}
                >
                        Welcome Back
                </h2>
                    <p style={{ textAlign: "center", color: "#718096", marginBottom: "1rem" }}>
                        Sign in to your account
                    </p>

                <input
                    type="text"
                    placeholder="Username or Email"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    style={{
                            padding: "1rem",
                            fontSize: "1rem",
                            borderRadius: "12px",
                            border: "2px solid #e2e8f0",
                            background: "#fff",
                            color: "#2d3748",
                            transition: "all 0.2s",
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = "#667eea";
                            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = "#e2e8f0";
                            e.currentTarget.style.boxShadow = "none";
                    }}
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                            padding: "1rem",
                            fontSize: "1rem",
                            borderRadius: "12px",
                            border: "2px solid #e2e8f0",
                            background: "#fff",
                            color: "#2d3748",
                            transition: "all 0.2s",
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = "#667eea";
                            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = "#e2e8f0";
                            e.currentTarget.style.boxShadow = "none";
                    }}
                />

                {error && (
                        <div
                            style={{
                                padding: "0.75rem 1rem",
                                background: "#fed7d7",
                                color: "#c53030",
                                borderRadius: "8px",
                                fontSize: "0.9rem",
                            }}
                        >
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        style={{
                            padding: "1rem",
                            fontSize: "1.1rem",
                            fontWeight: 600,
                            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "12px",
                            cursor: "pointer",
                            transition: "all 0.3s",
                            boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)",
                            marginTop: "0.5rem",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.5)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "0 4px 15px rgba(102, 126, 234, 0.4)";
                        }}
                    >
                        Sign In
                    </button>

                <div
                    style={{
                            textAlign: "center",
                            marginTop: "0.5rem",
                            fontSize: "0.95rem",
                            color: "#718096",
                        }}
                    >
                        <Link
                            to="/forgot-password"
                            style={{
                                color: "#667eea",
                                textDecoration: "none",
                                fontWeight: 600,
                                display: "block",
                                marginBottom: "0.5rem",
                    }}
                >
                            Forgot Password?
                        </Link>
                        Don't have an account?{" "}
                    <Link
                        to="/register"
                        style={{
                                color: "#667eea",
                            textDecoration: "none",
                                fontWeight: 600,
                        }}
                    >
                        Sign up
                    </Link>
                </div>
            </form>
            </div>
        </div>
    );
}
