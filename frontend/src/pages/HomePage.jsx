import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useCartCount } from "../hooks/useCartCount";
import { useToast } from "../contexts/ToastContext";
import { useUserRole } from "../hooks/useUserRole";
import categoryApi from "../api/categoryApi";
import productApi from "../api/productApi";

export default function HomePage() {
    const [userName, setUserName] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [activeTab, setActiveTab] = useState("products"); // "products" or "categories"
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { cartCount } = useCartCount();
    const { info: showInfo } = useToast();
    const userRole = useUserRole();

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
        
        // Load categories and products
        const loadData = async () => {
            setLoading(true);
            try {
                const [categoriesRes, productsRes] = await Promise.all([
                    categoryApi.getAllCategories(),
                    productApi.getAllProducts(0, 12, "productName", "asc")
                ]);
                
                const categoriesData = categoriesRes?.data?.data || categoriesRes?.data || [];
                const productsData = productsRes?.data?.data?.content || productsRes?.data?.content || productsRes?.data || [];
                
                setCategories(Array.isArray(categoriesData) ? categoriesData : []);
                setProducts(Array.isArray(productsData) ? productsData : []);
            } catch (error) {
                console.error("Error loading data:", error);
            } finally {
                setLoading(false);
            }
        };
        
        loadData();

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
        localStorage.removeItem("user_role");
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
                        🛍️ TeknoSU
                    </Link>
                    <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
                        <Link
                            to="/"
                            style={{
                                color: location.pathname === "/" ? "#667eea" : "#4a5568",
                                textDecoration: location.pathname === "/" ? "underline" : "none",
                                textDecorationThickness: location.pathname === "/" ? "2px" : "0",
                                textUnderlineOffset: location.pathname === "/" ? "4px" : "0",
                                padding: "0.5rem 1rem",
                                borderRadius: "4px",
                                fontWeight: location.pathname === "/" ? 600 : 500,
                                transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => {
                                if (location.pathname !== "/") {
                                    e.currentTarget.style.background = "#f7fafc";
                                    e.currentTarget.style.color = "#667eea";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (location.pathname !== "/") {
                                    e.currentTarget.style.background = "transparent";
                                    e.currentTarget.style.color = "#4a5568";
                                }
                            }}
                        >
                            Home
                        </Link>
                        <Link
                            to="/products"
                            style={{
                                color: location.pathname === "/products" ? "#667eea" : "#4a5568",
                                textDecoration: location.pathname === "/products" ? "underline" : "none",
                                textDecorationThickness: location.pathname === "/products" ? "2px" : "0",
                                textUnderlineOffset: location.pathname === "/products" ? "4px" : "0",
                                padding: "0.5rem 1rem",
                                borderRadius: "4px",
                                fontWeight: location.pathname === "/products" ? 600 : 500,
                                transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => {
                                if (location.pathname !== "/products") {
                                    e.currentTarget.style.background = "#f7fafc";
                                    e.currentTarget.style.color = "#667eea";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (location.pathname !== "/products") {
                                    e.currentTarget.style.background = "transparent";
                                    e.currentTarget.style.color = "#4a5568";
                                }
                            }}
                        >
                            Products
                        </Link>
                        {userRole === "SALES_MANAGER" && (
                            <Link
                                to="/sales-manager"
                                style={{
                                    color: location.pathname === "/sales-manager" ? "#667eea" : "#4a5568",
                                    textDecoration: location.pathname === "/sales-manager" ? "underline" : "none",
                                    textDecorationThickness: location.pathname === "/sales-manager" ? "2px" : "0",
                                    textUnderlineOffset: location.pathname === "/sales-manager" ? "4px" : "0",
                                    padding: "0.5rem 1rem",
                                    borderRadius: "4px",
                                    fontWeight: location.pathname === "/sales-manager" ? 600 : 500,
                                    transition: "all 0.2s",
                                }}
                                onMouseEnter={(e) => {
                                    if (location.pathname !== "/sales-manager") {
                                        e.currentTarget.style.background = "#f7fafc";
                                        e.currentTarget.style.color = "#667eea";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (location.pathname !== "/sales-manager") {
                                        e.currentTarget.style.background = "transparent";
                                        e.currentTarget.style.color = "#4a5568";
                                    }
                                }}
                            >
                                Sales Manager
                            </Link>
                        )}
                        {userRole === "CUSTOMER" && (
                            <Link
                                to="/cart"
                                style={{
                                    color: location.pathname === "/cart" ? "#667eea" : "#4a5568",
                                    textDecoration: location.pathname === "/cart" ? "underline" : "none",
                                    textDecorationThickness: location.pathname === "/cart" ? "2px" : "0",
                                    textUnderlineOffset: location.pathname === "/cart" ? "4px" : "0",
                                    padding: "0.5rem 1rem",
                                    borderRadius: "4px",
                                    fontWeight: location.pathname === "/cart" ? 600 : 500,
                                    transition: "all 0.2s",
                                    position: "relative",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                }}
                                onMouseEnter={(e) => {
                                    if (location.pathname !== "/cart") {
                                        e.currentTarget.style.background = "#f7fafc";
                                        e.currentTarget.style.color = "#667eea";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (location.pathname !== "/cart") {
                                        e.currentTarget.style.background = "transparent";
                                        e.currentTarget.style.color = "#4a5568";
                                    }
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
                        )}
                        {userRole === "CUSTOMER" && (
                            <Link
                                to="/wishlist"
                                style={{
                                    color: location.pathname === "/wishlist" ? "#667eea" : "#4a5568",
                                    textDecoration: location.pathname === "/wishlist" ? "underline" : "none",
                                    textDecorationThickness: location.pathname === "/wishlist" ? "2px" : "0",
                                    textUnderlineOffset: location.pathname === "/wishlist" ? "4px" : "0",
                                    padding: "0.5rem 1rem",
                                    borderRadius: "4px",
                                    fontWeight: location.pathname === "/wishlist" ? 600 : 500,
                                    transition: "all 0.2s",
                                }}
                                onMouseEnter={(e) => {
                                    if (location.pathname !== "/wishlist") {
                                        e.currentTarget.style.background = "#f7fafc";
                                        e.currentTarget.style.color = "#667eea";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (location.pathname !== "/wishlist") {
                                        e.currentTarget.style.background = "transparent";
                                        e.currentTarget.style.color = "#4a5568";
                                    }
                                }}
                            >
                                Wishlist
                            </Link>
                        )}
                        {(userRole === "PRODUCT_MANAGER" || localStorage.getItem("user_role") === "PRODUCT_MANAGER") && (
                            <Link
                                to="/owner-dashboard"
                                style={{
                                    color: location.pathname === "/owner-dashboard" ? "#667eea" : "#4a5568",
                                    textDecoration: location.pathname === "/owner-dashboard" ? "underline" : "none",
                                    textDecorationThickness: location.pathname === "/owner-dashboard" ? "2px" : "0",
                                    textUnderlineOffset: location.pathname === "/owner-dashboard" ? "4px" : "0",
                                    padding: "0.5rem 1rem",
                                    borderRadius: "4px",
                                    fontWeight: location.pathname === "/owner-dashboard" ? 600 : 500,
                                    transition: "all 0.2s",
                                }}
                                onMouseEnter={(e) => {
                                    if (location.pathname !== "/owner-dashboard") {
                                        e.currentTarget.style.background = "#f7fafc";
                                        e.currentTarget.style.color = "#667eea";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (location.pathname !== "/owner-dashboard") {
                                        e.currentTarget.style.background = "transparent";
                                        e.currentTarget.style.color = "#4a5568";
                                    }
                                }}
                            >
                                Dashboard
                            </Link>
                        )}
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
                        <div 
                            ref={dropdownRef} 
                            style={{ position: "relative" }}
                            onMouseEnter={() => setShowDropdown(true)}
                            onMouseLeave={() => setShowDropdown(false)}
                        >
                            <button
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.6rem",
                                    padding: "0.5rem 1rem",
                                    borderRadius: "4px",
                                    border: "none",
                                    background: showDropdown ? "#f7fafc" : "transparent",
                                    color: showDropdown ? "#667eea" : "#4a5568",
                                    fontSize: "0.95rem",
                                    fontWeight: 500,
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "#f7fafc";
                                    e.currentTarget.style.color = "#667eea";
                                }}
                                onMouseLeave={(e) => {
                                    if (!showDropdown) {
                                        e.currentTarget.style.background = "transparent";
                                        e.currentTarget.style.color = "#4a5568";
                                    } else {
                                        e.currentTarget.style.background = "#f7fafc";
                                        e.currentTarget.style.color = "#667eea";
                                    }
                                }}
                            >
                                <span style={{ fontSize: "1rem" }}>👤</span>
                                <span>{userName}</span>
                                <span style={{ fontSize: "0.7rem" }}>▼</span>
                            </button>

                            {showDropdown && (
                                <div
                                    style={{
                                        position: "absolute",
                                        top: "100%",
                                        right: 0,
                                        marginTop: "0",
                                        paddingTop: "0.25rem",
                                        background: "transparent",
                                        zIndex: 1000,
                                    }}
                                    onMouseEnter={() => setShowDropdown(true)}
                                    onMouseLeave={() => setShowDropdown(false)}
                                >
                                    <div
                                        style={{
                                            background: "#fff",
                                            border: "1px solid #e2e8f0",
                                            borderRadius: "4px",
                                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                                            minWidth: "180px",
                                            overflow: "hidden",
                                        }}
                                    >
                                    {userRole === "CUSTOMER" && (
                                    <>
                                    {(userRole !== "PRODUCT_MANAGER" && userRole !== "SALES_MANAGER" && userRole !== "SUPPORT_AGENT") && (
                                        <Link
                                            to="/cart"
                                            onClick={() => setShowDropdown(false)}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "0.8rem",
                                                padding: "0.75rem 1rem",
                                                color: "#4a5568",
                                                textDecoration: "none",
                                                fontSize: "0.9rem",
                                                borderBottom: "1px solid #f1f5f9",
                                                background: "transparent",
                                                transition: "all 0.2s",
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = "#667eea";
                                                e.currentTarget.style.color = "#fff";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = "transparent";
                                                e.currentTarget.style.color = "#4a5568";
                                            }}
                                        >
                                            <span>🛒</span>
                                            <span>My Cart</span>
                                        </Link>
                                    )}
                                    <Link
                                        to="/wishlist"
                                        onClick={() => setShowDropdown(false)}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.8rem",
                                            padding: "0.75rem 1rem",
                                            color: "#4a5568",
                                            textDecoration: "none",
                                            fontSize: "0.9rem",
                                            borderBottom: "1px solid #f1f5f9",
                                            background: "transparent",
                                            transition: "all 0.2s",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = "#667eea";
                                            e.currentTarget.style.color = "#fff";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = "transparent";
                                            e.currentTarget.style.color = "#4a5568";
                                        }}
                                    >
                                        <span>❤️</span>
                                        <span>My Wishlist</span>
                                    </Link>
                                    </>
                                    )}
                                    {(userRole === "PRODUCT_MANAGER" || localStorage.getItem("user_role") === "PRODUCT_MANAGER") && (
                                        <Link
                                            to="/owner-dashboard"
                                            onClick={() => setShowDropdown(false)}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "0.8rem",
                                                padding: "0.75rem 1rem",
                                                color: "#4a5568",
                                                textDecoration: "none",
                                                fontSize: "0.9rem",
                                                borderBottom: "1px solid #f1f5f9",
                                                background: "transparent",
                                                transition: "all 0.2s",
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = "#667eea";
                                                e.currentTarget.style.color = "#fff";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = "transparent";
                                                e.currentTarget.style.color = "#4a5568";
                                        }}
                                        >
                                            <span>📊</span>
                                            <span>Dashboard</span>
                                        </Link>
                                    )}
                                    {userRole === "SALES_MANAGER" && (
                                        <Link
                                            to="/sales-manager"
                                            onClick={() => setShowDropdown(false)}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "0.8rem",
                                                padding: "0.75rem 1rem",
                                                color: "#4a5568",
                                                textDecoration: "none",
                                                fontSize: "0.9rem",
                                                borderBottom: "1px solid #f1f5f9",
                                                background: "transparent",
                                                transition: "all 0.2s",
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = "#667eea";
                                                e.currentTarget.style.color = "#fff";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = "transparent";
                                                e.currentTarget.style.color = "#4a5568";
                                        }}
                                        >
                                            <span>💰</span>
                                            <span>Sales Manager</span>
                                        </Link>
                                    )}
                                    <Link
                                        to="/orders"
                                        onClick={() => setShowDropdown(false)}
                                        style={{
                                            width: "100%",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.8rem",
                                            textAlign: "left",
                                            padding: "0.75rem 1rem",
                                            color: "#4a5568",
                                            fontSize: "0.9rem",
                                            border: "none",
                                            background: "transparent",
                                            cursor: "pointer",
                                            borderBottom: "1px solid #f1f5f9",
                                            textDecoration: "none",
                                            transition: "all 0.2s",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = "#667eea";
                                            e.currentTarget.style.color = "#fff";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = "transparent";
                                            e.currentTarget.style.color = "#4a5568";
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
                                            padding: "0.75rem 1rem",
                                            color: "#e53e3e",
                                            fontSize: "0.9rem",
                                            border: "none",
                                            background: "transparent",
                                            cursor: "pointer",
                                            transition: "all 0.2s",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = "#fed7d7";
                                            e.currentTarget.style.color = "#c53030";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = "transparent";
                                            e.currentTarget.style.color = "#e53e3e";
                                        }}
                                    >
                                        <span>🚪</span>
                                        <span>Logout</span>
                                    </button>
                                    </div>
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
                    alignItems: "center",
                    padding: "4rem 2rem",
                    color: "#fff",
                }}
            >
                <div
                    style={{
                        maxWidth: "1200px",
                        width: "100%",
                        animation: "fadeInUp 0.8s ease-out",
                    }}
                >
                    <div style={{ textAlign: "center", marginBottom: "3rem" }}>
                        <h1
                            style={{
                                fontSize: "clamp(2.5rem, 5vw, 4.5rem)",
                                fontWeight: 800,
                                marginBottom: "1.5rem",
                                textShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
                                lineHeight: "1.2",
                            }}
                        >
                            Welcome to TeknoSU
                        </h1>
                        <p
                            style={{
                                fontSize: "clamp(1.1rem, 2vw, 1.5rem)",
                                marginBottom: "2rem",
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
                    </div>

                    {/* Tab Navigation */}
                    <div style={{ 
                        display: "flex", 
                        gap: "1rem", 
                        justifyContent: "center", 
                        marginBottom: "3rem",
                        flexWrap: "wrap"
                    }}>
                        <button
                            onClick={() => setActiveTab("products")}
                            style={{
                                padding: "0.75rem 2rem",
                                background: activeTab === "products" 
                                    ? "rgba(255, 255, 255, 0.95)" 
                                    : "rgba(255, 255, 255, 0.2)",
                                color: activeTab === "products" ? "#667eea" : "#fff",
                                border: "2px solid rgba(255, 255, 255, 0.5)",
                                borderRadius: "12px",
                                fontSize: "1.1rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                transition: "all 0.3s",
                                backdropFilter: "blur(10px)",
                            }}
                            onMouseEnter={(e) => {
                                if (activeTab !== "products") {
                                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (activeTab !== "products") {
                                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                                }
                            }}
                        >
                            📦 Products
                        </button>
                        <button
                            onClick={() => setActiveTab("categories")}
                            style={{
                                padding: "0.75rem 2rem",
                                background: activeTab === "categories" 
                                    ? "rgba(255, 255, 255, 0.95)" 
                                    : "rgba(255, 255, 255, 0.2)",
                                color: activeTab === "categories" ? "#667eea" : "#fff",
                                border: "2px solid rgba(255, 255, 255, 0.5)",
                                borderRadius: "12px",
                                fontSize: "1.1rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                transition: "all 0.3s",
                                backdropFilter: "blur(10px)",
                            }}
                            onMouseEnter={(e) => {
                                if (activeTab !== "categories") {
                                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (activeTab !== "categories") {
                                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                                }
                            }}
                        >
                            🏷️ Categories
                        </button>
                    </div>

                    {/* Tab Content */}
                    {activeTab === "products" ? (
                        <div style={{ 
                            background: "rgba(255, 255, 255, 0.95)", 
                            borderRadius: "20px", 
                            padding: "2rem",
                            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)"
                        }}>
                            <h2 style={{ fontSize: "2rem", fontWeight: 700, color: "#2d3748", marginBottom: "1.5rem", textAlign: "center" }}>
                                Featured Products
                            </h2>
                            {loading ? (
                                <div style={{ textAlign: "center", padding: "3rem", color: "#718096" }}>Loading products...</div>
                            ) : products.length > 0 ? (
                                <div style={{ 
                                    display: "grid", 
                                    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", 
                                    gap: "1.5rem" 
                                }}>
                                    {products.slice(0, 8).map((product) => (
                                        <Link
                                            key={product.productId}
                                            to={`/products/${product.productId}`}
                                            style={{
                                                background: "#f7fafc",
                                                padding: "1.5rem",
                                                borderRadius: "12px",
                                                border: "1px solid #e2e8f0",
                                                textDecoration: "none",
                                                color: "inherit",
                                                transition: "all 0.3s",
                                                display: "block",
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = "translateY(-4px)";
                                                e.currentTarget.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.1)";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = "translateY(0)";
                                                e.currentTarget.style.boxShadow = "none";
                                            }}
                                        >
                                            {product.images && product.images.length > 0 && (
                                                <img 
                                                    src={product.images[0]} 
                                                    alt={product.productName}
                                                    style={{
                                                        width: "100%",
                                                        height: "200px",
                                                        objectFit: "cover",
                                                        borderRadius: "8px",
                                                        marginBottom: "1rem"
                                                    }}
                                                />
                                            )}
                                            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#2d3748", marginBottom: "0.5rem" }}>
                                                {product.productName}
                                            </h3>
                                            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#667eea" }}>
                                                ${product.price?.toFixed(2) || "0.00"}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: "center", padding: "3rem", color: "#718096" }}>No products available</div>
                            )}
                            <div style={{ textAlign: "center", marginTop: "2rem" }}>
                                <Link
                                    to="/products"
                                    style={{
                                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                        color: "#fff",
                                        padding: "0.75rem 2rem",
                                        borderRadius: "12px",
                                        textDecoration: "none",
                                        fontWeight: 600,
                                        display: "inline-block",
                                        transition: "all 0.3s",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = "translateY(-2px)";
                                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.4)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = "translateY(0)";
                                        e.currentTarget.style.boxShadow = "none";
                                    }}
                                >
                                    View All Products →
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div style={{ 
                            background: "rgba(255, 255, 255, 0.95)", 
                            borderRadius: "20px", 
                            padding: "2rem",
                            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)"
                        }}>
                            <h2 style={{ fontSize: "2rem", fontWeight: 700, color: "#2d3748", marginBottom: "1.5rem", textAlign: "center" }}>
                                Product Categories
                            </h2>
                            {loading ? (
                                <div style={{ textAlign: "center", padding: "3rem", color: "#718096" }}>Loading categories...</div>
                            ) : categories.length > 0 ? (
                                <div style={{ 
                                    display: "grid", 
                                    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", 
                                    gap: "1.5rem" 
                                }}>
                                    {categories.map((category) => (
                                        <Link
                                            key={category.categoryId}
                                            to={`/products?category=${category.categoryId}`}
                                            style={{
                                                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                                padding: "2rem",
                                                borderRadius: "12px",
                                                textDecoration: "none",
                                                color: "#fff",
                                                transition: "all 0.3s",
                                                display: "block",
                                                textAlign: "center",
                                                overflow: "hidden",
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = "translateY(-4px)";
                                                e.currentTarget.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.2)";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = "translateY(0)";
                                                e.currentTarget.style.boxShadow = "none";
                                            }}
                                        >
                                            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🏷️</div>
                                            <h3 style={{ 
                                                fontSize: "1.1rem", 
                                                fontWeight: 700, 
                                                marginBottom: "0.5rem",
                                                wordBreak: "break-word",
                                                overflowWrap: "break-word",
                                                lineHeight: "1.4",
                                                hyphens: "auto",
                                                maxWidth: "100%",
                                            }}>
                                                {category.categoryName}
                                            </h3>
                                            {category.description && (
                                                <p style={{ 
                                                    fontSize: "0.9rem", 
                                                    opacity: 0.9,
                                                    wordBreak: "break-word",
                                                    overflowWrap: "break-word",
                                                    lineHeight: "1.5",
                                                }}>
                                                    {category.description}
                                                </p>
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: "center", padding: "3rem", color: "#718096" }}>No categories available</div>
                            )}
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
