import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useCartCount } from "../hooks/useCartCount";
import { useToast } from "../contexts/ToastContext";

export default function HomePage() {
    const [userName, setUserName] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { cartCount } = useCartCount();
    const { info: showInfo } = useToast();

    const extractUsernameFromToken = () => {
        const token = localStorage.getItem("access_token");
        console.log("🔍 Checking token:", token ? "Token exists" : "No token");
        
        if (!token) {
            setUserName(null);
            return;
        }

        try {
            const payloadBase64 = token.split(".")[1];
            const normalized = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
            const payloadJson = atob(normalized);
            const payload = JSON.parse(payloadJson);
            console.log("📦 JWT Payload:", payload);
            
            const nameFromToken = payload.sub || payload.name || payload.username;
            console.log("👤 Extracted username:", nameFromToken);
            
            if (nameFromToken) {
                setUserName(nameFromToken);
                console.log("✅ Username set to:", nameFromToken);
            } else {
                console.warn("⚠️ No username found in token payload");
                setUserName(null);
            }
        } catch (e) {
            console.error("❌ Failed to decode JWT", e);
            setUserName(null);
        }
    };

    useEffect(() => {
        console.log("🏠 HomePage component mounted");
        extractUsernameFromToken();

        const handleTokenSet = () => {
            console.log("🎯 tokenSet event received");
            extractUsernameFromToken();
        };
        window.addEventListener("tokenSet", handleTokenSet);

        const handleStorageChange = (e) => {
            console.log("💾 storage event received, key:", e.key);
            if (e.key === "access_token" || !e.key) {
                extractUsernameFromToken();
            }
        };
        window.addEventListener("storage", handleStorageChange);

        const handleFocus = () => {
            console.log("👁️ window focus event");
            extractUsernameFromToken();
        };
        window.addEventListener("focus", handleFocus);

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
            window.removeEventListener("tokenSet", handleTokenSet);
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("focus", handleFocus);
            clearInterval(intervalId);
            clearTimeout(timeoutId);
        };
    }, []);

    useEffect(() => {
        console.log("👤 userName state changed:", userName);
    }, [userName]);

    useEffect(() => {
        console.log("🛣️ Route changed to:", location.pathname);
        extractUsernameFromToken();
        
        const timeoutId = setTimeout(() => {
            console.log("⏰ Delayed token check after route change");
            extractUsernameFromToken();
        }, 300);

        return () => {
            clearTimeout(timeoutId);
        };
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
                                position: "relative",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
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

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1rem",
                        position: "relative",
                    }}
                >
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
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = "translateY(-2px)";
                                    e.currentTarget.style.boxShadow = "0 4px 8px rgba(102, 126, 234, 0.4)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "translateY(0)";
                                    e.currentTarget.style.boxShadow = "0 2px 4px rgba(102, 126, 234, 0.3)";
                                }}
                            >
                                <span style={{ fontSize: "1.2rem" }}>👤</span>
                                <span>{userName}</span>
                                <span style={{ fontSize: "0.7rem" }}>
                                    {showDropdown ? "▲" : "▼"}
                                </span>
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
                                        overflow: "hidden",
                                        animation: "fadeIn 0.2s ease-in",
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
                                            transition: "background 0.2s",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = "#f7fafc";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = "#fff";
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
                                            transition: "background 0.2s",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = "#f7fafc";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = "transparent";
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
                                            transition: "background 0.2s",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = "#fed7d7";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = "transparent";
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
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "translateY(-2px)";
                                e.currentTarget.style.boxShadow = "0 4px 8px rgba(102, 126, 234, 0.4)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "translateY(0)";
                                e.currentTarget.style.boxShadow = "0 2px 4px rgba(102, 126, 234, 0.3)";
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
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    textAlign: "center",
                    padding: "4rem 2rem",
                    color: "#fff",
                }}
            >
                <div
                    style={{
                        maxWidth: "800px",
                        animation: "fadeInUp 0.8s ease-out",
                    }}
                >
                    <h1
                        style={{
                            fontSize: "clamp(2.5rem, 5vw, 4.5rem)",
                            fontWeight: 800,
                            marginBottom: "1.5rem",
                            textShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
                            lineHeight: "1.2",
                        }}
                    >
                        Welcome to Store
                    </h1>
                    <p
                        style={{
                            fontSize: "clamp(1.1rem, 2vw, 1.5rem)",
                            marginBottom: "3rem",
                            opacity: 0.95,
                            textShadow: "0 1px 5px rgba(0, 0, 0, 0.2)",
                            lineHeight: "1.6",
                        }}
                    >
                        Discover amazing products at unbeatable prices. 
                        {userName ? (
                            <span style={{ display: "block", marginTop: "0.5rem", fontWeight: 600 }}>
                                Welcome back, {userName}! 🎉
                            </span>
                        ) : (
                            <span style={{ display: "block", marginTop: "0.5rem" }}>
                                Start your shopping journey today.
                            </span>
                        )}
                    </p>
                    {!userName && (
                        <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center", flexWrap: "wrap" }}>
                            <Link
                                to="/login"
                                style={{
                                    background: "#fff",
                                    color: "#667eea",
                                    fontSize: "1.1rem",
                                    fontWeight: 600,
                                    padding: "1rem 2.5rem",
                                    borderRadius: "12px",
                                    textDecoration: "none",
                                    transition: "all 0.3s",
                                    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = "translateY(-3px)";
                                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.3)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "translateY(0)";
                                    e.currentTarget.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.2)";
                                }}
                            >
                                Get Started
                            </Link>
                            <Link
                                to="/register"
                                style={{
                                    background: "rgba(255, 255, 255, 0.2)",
                                    color: "#fff",
                                    fontSize: "1.1rem",
                                    fontWeight: 600,
                                    padding: "1rem 2.5rem",
                                    borderRadius: "12px",
                                    border: "2px solid rgba(255, 255, 255, 0.5)",
                                    textDecoration: "none",
                                    transition: "all 0.3s",
                                    backdropFilter: "blur(10px)",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
                                    e.currentTarget.style.transform = "translateY(-3px)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                                    e.currentTarget.style.transform = "translateY(0)";
                                }}
                            >
                                Sign Up
                            </Link>
                        </div>
                    )}
                    {userName && (
                        <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center", flexWrap: "wrap" }}>
                            <Link
                                to="/products"
                                style={{
                                    background: "#fff",
                                    color: "#667eea",
                                    fontSize: "1.1rem",
                                    fontWeight: 600,
                                    padding: "1rem 2.5rem",
                                    borderRadius: "12px",
                                    textDecoration: "none",
                                    transition: "all 0.3s",
                                    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = "translateY(-3px)";
                                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.3)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "translateY(0)";
                                    e.currentTarget.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.2)";
                                }}
                            >
                                Browse Products
                            </Link>
                            <Link
                                to="/cart"
                                style={{
                                    background: "rgba(255, 255, 255, 0.2)",
                                    color: "#fff",
                                    fontSize: "1.1rem",
                                    fontWeight: 600,
                                    padding: "1rem 2.5rem",
                                    borderRadius: "12px",
                                    border: "2px solid rgba(255, 255, 255, 0.5)",
                                    textDecoration: "none",
                                    transition: "all 0.3s",
                                    backdropFilter: "blur(10px)",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
                                    e.currentTarget.style.transform = "translateY(-3px)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                                    e.currentTarget.style.transform = "translateY(0)";
                                }}
                            >
                                View Cart
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
}
