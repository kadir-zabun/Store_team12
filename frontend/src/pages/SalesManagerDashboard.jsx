import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useUserRole } from "../hooks/useUserRole";
import { useToast } from "../contexts/ToastContext";
import salesApi from "../api/salesApi";
import productApi from "../api/productApi";

export default function SalesManagerDashboard() {
    const [userName, setUserName] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [activeTab, setActiveTab] = useState("pricing");
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingProducts, setLoadingProducts] = useState(false);

    // Form states
    const [priceForm, setPriceForm] = useState({ productId: "", price: "" });
    const [discountForm, setDiscountForm] = useState({ productIds: [], discountPercent: "" });

    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const userRole = useUserRole();
    const { success: showSuccess, error: showError } = useToast();

    // Redirect if not SALES_MANAGER
    useEffect(() => {
        if (userRole !== "SALES_MANAGER") {
            navigate("/");
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
        loadProducts();
    }, []);

    const loadProducts = async () => {
        setLoadingProducts(true);
        try {
            const response = await productApi.getAllProducts(0, 200);
            const productsData =
                response.data?.data?.content ||
                response.data?.content ||
                response.data?.data ||
                response.data ||
                [];
            setProducts(Array.isArray(productsData) ? productsData : []);
        } catch (error) {
            console.error("Error loading products:", error);
            showError("Failed to load products.");
        } finally {
            setLoadingProducts(false);
            setLoading(false);
        }
    };

    const handleSetPrice = async (e) => {
        e.preventDefault();
        try {
            await salesApi.setPrice(priceForm.productId, parseFloat(priceForm.price));
            showSuccess("Price updated successfully!");
            setPriceForm({ productId: "", price: "" });
            loadProducts();
        } catch (error) {
            console.error("Error setting price:", error);
            showError(error.response?.data?.message || "Failed to update price.");
        }
    };

    const handleSetDiscount = async (e) => {
        e.preventDefault();
        if (discountForm.productIds.length === 0) {
            showError("Please select at least one product.");
            return;
        }
        try {
            await salesApi.setDiscount(
                discountForm.productIds,
                parseFloat(discountForm.discountPercent)
            );
            showSuccess("Discount applied successfully! Users with this product in their wishlist have been notified.");
            setDiscountForm({ productIds: [], discountPercent: "" });
            loadProducts();
        } catch (error) {
            console.error("Error setting discount:", error);
            showError(error.response?.data?.message || "Failed to apply discount.");
        }
    };

    const toggleProductSelection = (productId) => {
        setDiscountForm((prev) => {
            const isSelected = prev.productIds.includes(productId);
            return {
                ...prev,
                productIds: isSelected
                    ? prev.productIds.filter((id) => id !== productId)
                    : [...prev.productIds, productId],
            };
        });
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

    const formatCurrency = (amount) => {
        if (!amount) return "₺0.00";
        return new Intl.NumberFormat("tr-TR", {
            style: "currency",
            currency: "TRY",
        }).format(amount);
    };

    if (loading) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div>Loading...</div>
            </div>
        );
    }

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
                            to="/sales-manager"
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
                            Sales Manager
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
                    padding: "2rem",
                }}
            >
                <div
                    style={{
                        background: "rgba(255, 255, 255, 0.95)",
                        backdropFilter: "blur(10px)",
                        borderRadius: "20px",
                        padding: "2rem",
                        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
                        maxWidth: "1400px",
                        margin: "0 auto",
                        width: "100%",
                    }}
                >
                    <h1
                        style={{
                            fontSize: "clamp(2rem, 4vw, 3rem)",
                            fontWeight: 700,
                            color: "#2d3748",
                            marginBottom: "1rem",
                        }}
                    >
                        Sales Manager Dashboard
                    </h1>
                    <p style={{ color: "#718096", fontSize: "1.1rem", marginBottom: "2rem" }}>
                        Welcome, {userName}! Set product prices and apply discounts.
                    </p>

                    {/* Tabs */}
                    <div
                        style={{
                            display: "flex",
                            gap: "1rem",
                            marginBottom: "2rem",
                            borderBottom: "2px solid #e2e8f0",
                        }}
                    >
                        {[
                            { id: "pricing", label: "💰 Price Management", icon: "💰" },
                            { id: "discount", label: "🎯 Discount Management", icon: "🎯" },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    padding: "0.8rem 1.5rem",
                                    border: "none",
                                    background: activeTab === tab.id ? "#667eea" : "transparent",
                                    color: activeTab === tab.id ? "#fff" : "#4a5568",
                                    fontWeight: activeTab === tab.id ? 600 : 500,
                                    cursor: "pointer",
                                    borderRadius: "8px 8px 0 0",
                                    transition: "all 0.2s",
                                    borderBottom: activeTab === tab.id ? "3px solid #667eea" : "3px solid transparent",
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Pricing Tab */}
                    {activeTab === "pricing" && (
                        <div>
                            <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1.5rem" }}>
                                Set Product Price
                            </h2>
                            <form
                                onSubmit={handleSetPrice}
                                style={{
                                    background: "#f7fafc",
                                    padding: "1.5rem",
                                    borderRadius: "12px",
                                    marginBottom: "2rem",
                                }}
                            >
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "1rem", alignItems: "end" }}>
                                    <div>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                                            Select Product
                                        </label>
                                        <select
                                            value={priceForm.productId}
                                            onChange={(e) => setPriceForm({ ...priceForm, productId: e.target.value })}
                                            required
                                            style={{
                                                width: "100%",
                                                padding: "0.75rem",
                                                borderRadius: "8px",
                                                border: "1px solid #e2e8f0",
                                                fontSize: "1rem",
                                            }}
                                        >
                                            <option value="">Select a product...</option>
                                            {products.map((product) => (
                                                <option key={product.productId} value={product.productId}>
                                                    {product.productName} - {formatCurrency(product.price)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                                            New Price (₺)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={priceForm.price}
                                            onChange={(e) => setPriceForm({ ...priceForm, price: e.target.value })}
                                            required
                                            style={{
                                                width: "100%",
                                                padding: "0.75rem",
                                                borderRadius: "8px",
                                                border: "1px solid #e2e8f0",
                                                fontSize: "1rem",
                                            }}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        style={{
                                            padding: "0.75rem 2rem",
                                            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                            color: "#fff",
                                            border: "none",
                                            borderRadius: "8px",
                                            fontWeight: 600,
                                            cursor: "pointer",
                                            fontSize: "1rem",
                                        }}
                                    >
                                        Update Price
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Discount Tab */}
                    {activeTab === "discount" && (
                        <div>
                            <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1.5rem" }}>
                                Apply Discount to Products
                            </h2>
                            <form
                                onSubmit={handleSetDiscount}
                                style={{
                                    background: "#f7fafc",
                                    padding: "1.5rem",
                                    borderRadius: "12px",
                                    marginBottom: "2rem",
                                }}
                            >
                                <div style={{ marginBottom: "1.5rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                                        Discount Rate (%)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        value={discountForm.discountPercent}
                                        onChange={(e) =>
                                            setDiscountForm({ ...discountForm, discountPercent: e.target.value })
                                        }
                                        required
                                        style={{
                                            width: "100%",
                                            maxWidth: "300px",
                                            padding: "0.75rem",
                                            borderRadius: "8px",
                                            border: "1px solid #e2e8f0",
                                            fontSize: "1rem",
                                        }}
                                    />
                                </div>
                                <div style={{ marginBottom: "1.5rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                                        Products to Apply Discount ({discountForm.productIds.length} selected)
                                    </label>
                                    <div
                                        style={{
                                            maxHeight: "300px",
                                            overflowY: "auto",
                                            border: "1px solid #e2e8f0",
                                            borderRadius: "8px",
                                            padding: "1rem",
                                            background: "#fff",
                                        }}
                                    >
                                        {loadingProducts ? (
                                            <div>Loading...</div>
                                        ) : products.length === 0 ? (
                                            <div>No products found.</div>
                                        ) : (
                                            products.map((product) => {
                                                const isSelected = discountForm.productIds.includes(product.productId);
                                                return (
                                                    <div
                                                        key={product.productId}
                                                        onClick={() => toggleProductSelection(product.productId)}
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: "1rem",
                                                            padding: "0.75rem",
                                                            marginBottom: "0.5rem",
                                                            borderRadius: "8px",
                                                            cursor: "pointer",
                                                            background: isSelected ? "#e6f3ff" : "#f7fafc",
                                                            border: `2px solid ${isSelected ? "#667eea" : "transparent"}`,
                                                            transition: "all 0.2s",
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleProductSelection(product.productId)}
                                                            style={{ cursor: "pointer" }}
                                                        />
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontWeight: 600 }}>{product.productName}</div>
                                                            <div style={{ color: "#718096", fontSize: "0.9rem" }}>
                                                                {formatCurrency(product.price)}
                                                                {product.discount > 0 && (
                                                                    <span style={{ marginLeft: "0.5rem", color: "#e53e3e" }}>
                                                                        (%{product.discount} discount)
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    style={{
                                        padding: "0.75rem 2rem",
                                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                        color: "#fff",
                                        border: "none",
                                        borderRadius: "8px",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        fontSize: "1rem",
                                    }}
                                >
                                    Apply Discount
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

