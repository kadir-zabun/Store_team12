import { Link, useNavigate, useLocation, Outlet } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useCartCount } from "../hooks/useCartCount";
import { useUserRole } from "../hooks/useUserRole";

export default function Layout() {
    const [userName, setUserName] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showDashboardDropdown, setShowDashboardDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const dashboardDropdownRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { cartCount } = useCartCount();
    const userRole = useUserRole();

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
        const timeoutId = setTimeout(() => {
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
            if (dashboardDropdownRef.current && !dashboardDropdownRef.current.contains(event.target)) {
                setShowDashboardDropdown(false);
            }
        };
        if (showDropdown || showDashboardDropdown) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showDropdown, showDashboardDropdown]);

    const handleLogout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user_role");
        setUserName(null);
        setShowDropdown(false);
        navigate("/login");
    };

    const isActivePath = (path) => {
        if (path === "/") {
            return location.pathname === "/";
        }
        return location.pathname.startsWith(path);
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
                                color: isActivePath("/") && location.pathname === "/" ? "#667eea" : "#4a5568",
                                textDecoration: isActivePath("/") && location.pathname === "/" ? "underline" : "none",
                                textDecorationThickness: isActivePath("/") && location.pathname === "/" ? "2px" : "0",
                                textUnderlineOffset: isActivePath("/") && location.pathname === "/" ? "4px" : "0",
                                padding: "0.5rem 1rem",
                                borderRadius: "4px",
                                fontWeight: isActivePath("/") && location.pathname === "/" ? 600 : 500,
                                transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => {
                                if (!isActivePath("/") || location.pathname !== "/") {
                                    e.currentTarget.style.background = "#f7fafc";
                                    e.currentTarget.style.color = "#667eea";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isActivePath("/") || location.pathname !== "/") {
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
                                color: isActivePath("/products") ? "#667eea" : "#4a5568",
                                textDecoration: isActivePath("/products") ? "underline" : "none",
                                textDecorationThickness: isActivePath("/products") ? "2px" : "0",
                                textUnderlineOffset: isActivePath("/products") ? "4px" : "0",
                                padding: "0.5rem 1rem",
                                borderRadius: "4px",
                                fontWeight: isActivePath("/products") ? 600 : 500,
                                transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => {
                                if (!isActivePath("/products")) {
                                    e.currentTarget.style.background = "#f7fafc";
                                    e.currentTarget.style.color = "#667eea";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isActivePath("/products")) {
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
                                    color: isActivePath("/sales-manager") ? "#667eea" : "#4a5568",
                                    textDecoration: isActivePath("/sales-manager") ? "underline" : "none",
                                    textDecorationThickness: isActivePath("/sales-manager") ? "2px" : "0",
                                    textUnderlineOffset: isActivePath("/sales-manager") ? "4px" : "0",
                                    padding: "0.5rem 1rem",
                                    borderRadius: "4px",
                                    fontWeight: isActivePath("/sales-manager") ? 600 : 500,
                                    transition: "all 0.2s",
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActivePath("/sales-manager")) {
                                        e.currentTarget.style.background = "#f7fafc";
                                        e.currentTarget.style.color = "#667eea";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActivePath("/sales-manager")) {
                                        e.currentTarget.style.background = "transparent";
                                        e.currentTarget.style.color = "#4a5568";
                                    }
                                }}
                            >
                                Sales Manager
                            </Link>
                        )}
                        {userRole === "CUSTOMER" && (
                            <>
                                <Link
                                    to="/cart"
                                    style={{
                                        color: isActivePath("/cart") ? "#667eea" : "#4a5568",
                                        textDecoration: isActivePath("/cart") ? "underline" : "none",
                                        textDecorationThickness: isActivePath("/cart") ? "2px" : "0",
                                        textUnderlineOffset: isActivePath("/cart") ? "4px" : "0",
                                        padding: "0.5rem 1rem",
                                        borderRadius: "4px",
                                        fontWeight: isActivePath("/cart") ? 600 : 500,
                                        transition: "all 0.2s",
                                        position: "relative",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isActivePath("/cart")) {
                                            e.currentTarget.style.background = "#f7fafc";
                                            e.currentTarget.style.color = "#667eea";
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isActivePath("/cart")) {
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
                                <Link
                                    to="/wishlist"
                                    style={{
                                        color: isActivePath("/wishlist") ? "#667eea" : "#4a5568",
                                        textDecoration: isActivePath("/wishlist") ? "underline" : "none",
                                        textDecorationThickness: isActivePath("/wishlist") ? "2px" : "0",
                                        textUnderlineOffset: isActivePath("/wishlist") ? "4px" : "0",
                                        padding: "0.5rem 1rem",
                                        borderRadius: "4px",
                                        fontWeight: isActivePath("/wishlist") ? 600 : 500,
                                        transition: "all 0.2s",
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isActivePath("/wishlist")) {
                                            e.currentTarget.style.background = "#f7fafc";
                                            e.currentTarget.style.color = "#667eea";
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isActivePath("/wishlist")) {
                                            e.currentTarget.style.background = "transparent";
                                            e.currentTarget.style.color = "#4a5568";
                                        }
                                    }}
                                >
                                    Wishlist
                                </Link>
                            </>
                        )}
                        {(userRole === "SUPPORT_AGENT" || localStorage.getItem("user_role") === "SUPPORT_AGENT") && (
                            <Link
                                to="/support/chat"
                                style={{
                                    color: isActivePath("/support/chat") ? "#667eea" : "#4a5568",
                                    textDecoration: isActivePath("/support/chat") ? "underline" : "none",
                                    textDecorationThickness: isActivePath("/support/chat") ? "2px" : "0",
                                    textUnderlineOffset: isActivePath("/support/chat") ? "4px" : "0",
                                    padding: "0.5rem 1rem",
                                    borderRadius: "4px",
                                    fontWeight: isActivePath("/support/chat") ? 600 : 500,
                                    transition: "all 0.2s",
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActivePath("/support/chat")) {
                                        e.currentTarget.style.background = "#f7fafc";
                                        e.currentTarget.style.color = "#667eea";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActivePath("/support/chat")) {
                                        e.currentTarget.style.background = "transparent";
                                        e.currentTarget.style.color = "#4a5568";
                                    }
                                }}
                            >
                                Support Chat
                            </Link>
                        )}
                        {(userRole === "PRODUCT_MANAGER" || localStorage.getItem("user_role") === "PRODUCT_MANAGER") && (
                            <div
                                ref={dashboardDropdownRef}
                                style={{ position: "relative" }}
                                onMouseEnter={() => setShowDashboardDropdown(true)}
                                onMouseLeave={() => setShowDashboardDropdown(false)}
                            >
                                <Link
                                    to="/owner-dashboard"
                                    style={{
                                        color: isActivePath("/owner-dashboard") || isActivePath("/owner/") ? "#667eea" : "#4a5568",
                                        textDecoration: isActivePath("/owner-dashboard") || isActivePath("/owner/") ? "underline" : "none",
                                        textDecorationThickness: isActivePath("/owner-dashboard") || isActivePath("/owner/") ? "2px" : "0",
                                        textUnderlineOffset: isActivePath("/owner-dashboard") || isActivePath("/owner/") ? "4px" : "0",
                                        padding: "0.5rem 1rem",
                                        borderRadius: "4px",
                                        fontWeight: isActivePath("/owner-dashboard") || isActivePath("/owner/") ? 600 : 500,
                                        transition: "all 0.2s",
                                        display: "inline-block",
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isActivePath("/owner-dashboard") && !isActivePath("/owner/")) {
                                            e.currentTarget.style.background = "#f7fafc";
                                            e.currentTarget.style.color = "#667eea";
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isActivePath("/owner-dashboard") && !isActivePath("/owner/")) {
                                            e.currentTarget.style.background = "transparent";
                                            e.currentTarget.style.color = "#4a5568";
                                        }
                                    }}
                                >
                                    Dashboard
                                </Link>
                                {showDashboardDropdown && (
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: "100%",
                                            left: 0,
                                            marginTop: "0",
                                            paddingTop: "0.25rem",
                                            background: "transparent",
                                            zIndex: 1000,
                                        }}
                                        onMouseEnter={() => setShowDashboardDropdown(true)}
                                        onMouseLeave={() => setShowDashboardDropdown(false)}
                                    >
                                        <div
                                            style={{
                                                background: "#fff",
                                                border: "1px solid #e2e8f0",
                                                borderRadius: "4px",
                                                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                                                minWidth: "180px",
                                                overflow: "hidden",
                                                display: "flex",
                                                flexDirection: "row",
                                            }}
                                        >
                                            <Link
                                                to="/owner/products"
                                                onClick={() => setShowDashboardDropdown(false)}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "0.8rem",
                                                    padding: "0.75rem 1rem",
                                                    color: isActivePath("/owner/products") ? "#667eea" : "#4a5568",
                                                    textDecoration: "none",
                                                    fontSize: "0.9rem",
                                                    borderRight: "1px solid #f1f5f9",
                                                    background: "transparent",
                                                    transition: "all 0.2s",
                                                    fontWeight: isActivePath("/owner/products") ? 600 : 400,
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = "#667eea";
                                                    e.currentTarget.style.color = "#fff";
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = "transparent";
                                                    e.currentTarget.style.color = isActivePath("/owner/products") ? "#667eea" : "#4a5568";
                                                }}
                                            >
                                                <span>📦</span>
                                                <span>Products</span>
                                            </Link>
                                            <Link
                                                to="/owner/orders"
                                                onClick={() => setShowDashboardDropdown(false)}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "0.8rem",
                                                    padding: "0.75rem 1rem",
                                                    color: isActivePath("/owner/orders") ? "#667eea" : "#4a5568",
                                                    textDecoration: "none",
                                                    fontSize: "0.9rem",
                                                    borderRight: "1px solid #f1f5f9",
                                                    background: "transparent",
                                                    transition: "all 0.2s",
                                                    fontWeight: isActivePath("/owner/orders") ? 600 : 400,
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = "#667eea";
                                                    e.currentTarget.style.color = "#fff";
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = "transparent";
                                                    e.currentTarget.style.color = isActivePath("/owner/orders") ? "#667eea" : "#4a5568";
                                                }}
                                            >
                                                <span>📋</span>
                                                <span>Orders</span>
                                            </Link>
                                            <Link
                                                to="/owner/reviews"
                                                onClick={() => setShowDashboardDropdown(false)}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "0.8rem",
                                                    padding: "0.75rem 1rem",
                                                    color: isActivePath("/owner/reviews") ? "#667eea" : "#4a5568",
                                                    textDecoration: "none",
                                                    fontSize: "0.9rem",
                                                    background: "transparent",
                                                    transition: "all 0.2s",
                                                    fontWeight: isActivePath("/owner/reviews") ? 600 : 400,
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = "#667eea";
                                                    e.currentTarget.style.color = "#fff";
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = "transparent";
                                                    e.currentTarget.style.color = isActivePath("/owner/reviews") ? "#667eea" : "#4a5568";
                                                }}
                                            >
                                                <span>⭐</span>
                                                <span>Reviews</span>
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>
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
                                                <Link
                                                    to="/my-reviews"
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
                                                    <span>⭐</span>
                                                    <span>My Reviews</span>
                                                </Link>
                                                <Link
                                                    to="/my-account"
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
                                                    <span>👤</span>
                                                    <span>My Account</span>
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

            {/* Page Content */}
            <div style={{ position: "relative" }}>
                <Outlet />
            </div>
        </div>
    );
}

