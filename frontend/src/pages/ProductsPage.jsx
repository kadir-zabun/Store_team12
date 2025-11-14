import { Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import productApi from "../api/productApi";
import { formatProductForDisplay } from "../utils/productAdapter";

export default function ProductsPage() {
    const [userName, setUserName] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

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
        const loadProducts = async () => {
            setLoading(true);
            try {
                console.log("📥 Fetching products from database...");
                const response = await productApi.getAllProducts(0, 100);
                const apiResponse = response.data;
                
                let productsData = null;
                if (apiResponse && apiResponse.data) {
                    if (apiResponse.data.content) {
                        productsData = apiResponse.data.content;
                    } else if (Array.isArray(apiResponse.data)) {
                        productsData = apiResponse.data;
                    } else {
                        productsData = apiResponse.data;
                    }
                } else if (Array.isArray(apiResponse)) {
                    productsData = apiResponse;
                }
                
                if (productsData && productsData.length > 0) {
                    const backendProducts = productsData.map(formatProductForDisplay);
                    setProducts(backendProducts);
                    console.log(`✅ Loaded ${backendProducts.length} products from database`);
                } else {
                    console.log("ℹ️ No products in database yet");
                    setProducts([]);
                }
            } catch (error) {
                console.error("❌ Error loading products from database:", error);
                setProducts([]);
            } finally {
                setLoading(false);
            }
        };

        loadProducts();
    }, []);

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
                                color: "#667eea",
                                textDecoration: "none",
                                padding: "0.5rem 1rem",
                                borderRadius: "8px",
                                fontWeight: 600,
                                background: "#f7fafc",
                                transition: "all 0.2s",
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
                                            alert("Order History feature coming soon!");
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
                        maxWidth: "1400px",
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
                            Products
                        </h1>
                        {products.length > 0 && (
                            <div
                                style={{
                                    padding: "0.5rem 1rem",
                                    background: "#c6f6d5",
                                    color: "#22543d",
                                    borderRadius: "8px",
                                    fontSize: "0.9rem",
                                }}
                            >
                                📦 Database: {products.length} products
                            </div>
                        )}
                    </div>

                    {loading ? (
                        <div style={{ textAlign: "center", padding: "3rem", color: "#a0aec0", fontSize: "1.1rem" }}>
                            Loading products...
                        </div>
                    ) : products.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "3rem", color: "#a0aec0", fontSize: "1.1rem" }}>
                            No products found.
                        </div>
                    ) : (
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                                gap: "2rem",
                            }}
                        >
                            {products.map((product) => (
                                <div
                                    key={product.productId}
                                    style={{
                                        background: "#fff",
                                        borderRadius: "16px",
                                        overflow: "hidden",
                                        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                                        transition: "all 0.3s",
                                        cursor: "pointer",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = "translateY(-8px)";
                                        e.currentTarget.style.boxShadow = "0 12px 24px rgba(0, 0, 0, 0.15)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = "translateY(0)";
                                        e.currentTarget.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
                                    }}
                                >
                                    <div style={{ width: "100%", height: "250px", background: "#f7fafc", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                                        {(() => {
                                            const imageUrl = product.images && Array.isArray(product.images) && product.images.length > 0 && product.images[0]
                                                ? product.images[0]
                                                : "https://via.placeholder.com/300x250?text=No+Image";
                                            
                                            return (
                                                <img
                                                    src={imageUrl}
                                                    alt={product.productName || "Product"}
                                                    style={{
                                                        width: "100%",
                                                        height: "100%",
                                                        objectFit: "cover",
                                                        display: "block",
                                                    }}
                                                    onError={(e) => {
                                                        console.error("❌ Image failed to load:", imageUrl);
                                                        e.target.src = "https://via.placeholder.com/300x250?text=No+Image";
                                                        e.target.style.objectFit = "contain";
                                                    }}
                                                    onLoad={() => {
                                                        console.log("✅ Image loaded:", imageUrl);
                                                    }}
                                                />
                                            );
                                        })()}
                                    </div>
                                    <div style={{ padding: "1.5rem" }}>
                                        <div
                                            style={{
                                                fontSize: "0.85rem",
                                                color: "#667eea",
                                                fontWeight: 600,
                                                marginBottom: "0.5rem",
                                            }}
                                        >
                                            {product.categoryName}
                                        </div>
                                        <h3
                                            style={{
                                                fontSize: "1.1rem",
                                                fontWeight: 600,
                                                color: "#2d3748",
                                                marginBottom: "0.75rem",
                                                lineHeight: "1.4",
                                            }}
                                        >
                                            {product.productName}
                                        </h3>
                                        <div style={{ marginBottom: "1rem" }}>
                                            {product.hasDiscount ? (
                                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                                    <span
                                                        style={{
                                                            fontSize: "1.5rem",
                                                            fontWeight: 700,
                                                            color: "#667eea",
                                                        }}
                                                    >
                                                        ${product.finalPrice}
                                                    </span>
                                                    <span
                                                        style={{
                                                            fontSize: "1rem",
                                                            color: "#a0aec0",
                                                            textDecoration: "line-through",
                                                        }}
                                                    >
                                                        ${product.price.toFixed(2)}
                                                    </span>
                                                    <span
                                                        style={{
                                                            fontSize: "0.85rem",
                                                            background: "#fed7d7",
                                                            color: "#c53030",
                                                            padding: "0.25rem 0.5rem",
                                                            borderRadius: "4px",
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        -{product.discountPercentage}%
                                                    </span>
                                                </div>
                                            ) : (
                                                <span
                                                    style={{
                                                        fontSize: "1.5rem",
                                                        fontWeight: 700,
                                                        color: "#667eea",
                                                    }}
                                                >
                                                    ${product.price.toFixed(2)}
                                                </span>
                                            )}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: "0.9rem",
                                                color: product.inStock ? "#2f855a" : "#c53030",
                                                marginBottom: "1rem",
                                            }}
                                        >
                                            {product.inStock ? `✓ In Stock (${product.quantity})` : "✗ Out of Stock"}
                                        </div>
                                        <button
                                            style={{
                                                width: "100%",
                                                padding: "0.75rem",
                                                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                                color: "#fff",
                                                border: "none",
                                                borderRadius: "10px",
                                                fontWeight: 600,
                                                cursor: "pointer",
                                                transition: "all 0.2s",
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = "scale(1.02)";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = "scale(1)";
                                            }}
                                        >
                                            Add to Cart
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
