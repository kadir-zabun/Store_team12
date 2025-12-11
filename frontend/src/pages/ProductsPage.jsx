import { Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import productApi from "../api/productApi";
import categoryApi from "../api/categoryApi";
import cartApi from "../api/cartApi";
import { cartStorage } from "../utils/cartStorage";
import { formatProductForDisplay } from "../utils/productAdapter";
import { useCartCount } from "../hooks/useCartCount";
import { useToast } from "../contexts/ToastContext";
import { useUserRole } from "../hooks/useUserRole";
import { getErrorMessage } from "../utils/errorHandler";

export default function ProductsPage() {
    const [userName, setUserName] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addingToCart, setAddingToCart] = useState({});
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { cartCount, refreshCartCount } = useCartCount();
    const { success: showSuccess, error: showError, info: showInfo } = useToast();
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
        
        // Load categories
        const loadCategories = async () => {
            try {
                const response = await categoryApi.getAllCategories();
                const categoriesData = response?.data?.data || response?.data || [];
                setCategories(Array.isArray(categoriesData) ? categoriesData : []);
            } catch (error) {
                console.error("Error loading categories:", error);
            }
        };
        loadCategories();
        
        // Check URL for category parameter
        const urlParams = new URLSearchParams(location.search);
        const categoryParam = urlParams.get("category");
        if (categoryParam) {
            setSelectedCategory(categoryParam);
        }
    }, [location.pathname, location.search]);

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

    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("productName");
    const [sortDir, setSortDir] = useState("asc");
    const [filterInStock, setFilterInStock] = useState(false);
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        const loadProducts = async () => {
            setLoading(true);
            try {
                console.log("📥 Fetching products from database...");
                
                let productsData = null;
                
                // If category is selected, use category endpoint
                if (selectedCategory) {
                    const response = await productApi.getProductsByCategory(selectedCategory, 0, 200);
                    productsData = response.data?.data?.content || response.data?.content || response.data?.data || response.data || [];
                    if (!Array.isArray(productsData)) {
                        productsData = [];
                    }
                    console.log("Category products:", productsData);
                }
                // If search query exists, use search endpoint
                else if (searchQuery.trim()) {
                    const response = await productApi.searchProducts(searchQuery.trim());
                    // Backend returns {success: true, data: [...], meta: {...}}
                    productsData = response.data?.data || response.data || [];
                    if (!Array.isArray(productsData)) {
                        productsData = [];
                    }
                    console.log("Search results:", productsData);
                }
                // If in stock filter is active, use in stock endpoint
                else if (filterInStock) {
                    const response = await productApi.getInStockProducts();
                    productsData = response.data?.data || response.data || [];
                    if (!Array.isArray(productsData)) {
                        productsData = [];
                    }
                }
                // Otherwise, use normal pagination with sorting
                // Note: We always fetch all products and filter/sort in frontend to use discounted prices
                else {
                    // Backend'den tüm ürünleri çek (fiyat filtrelemesi frontend'de yapılacak)
                    const response = await productApi.getAllProducts(0, 200, sortBy === "price" ? "productName" : sortBy, sortDir);
                    const apiResponse = response.data;
                    
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
                }
                
                if (productsData && productsData.length > 0) {
                    let filteredProducts = productsData.map(formatProductForDisplay);
                    
                    // Apply price range filter based on discounted price (finalPrice)
                    if (minPrice || maxPrice) {
                        const min = minPrice ? parseFloat(minPrice) : 0;
                        const max = maxPrice ? parseFloat(maxPrice) : 999999;
                        filteredProducts = filteredProducts.filter(p => {
                            const finalPrice = p.finalPrice || p.price || 0;
                            return finalPrice >= min && finalPrice <= max;
                        });
                    }
                    
                    // Apply in stock filter if active
                    if (filterInStock) {
                        filteredProducts = filteredProducts.filter(p => p.inStock);
                    }
                    
                    // Always sort in frontend to use discounted price (finalPrice)
                    // This ensures price sorting uses discounted prices, not original prices
                    filteredProducts.sort((a, b) => {
                        let aVal, bVal;
                        switch (sortBy) {
                            case "productName":
                                aVal = a.productName?.toLowerCase() || "";
                                bVal = b.productName?.toLowerCase() || "";
                                break;
                            case "price":
                                // Use finalPrice (discounted price) for sorting
                                aVal = a.finalPrice || a.price || 0;
                                bVal = b.finalPrice || b.price || 0;
                                break;
                            case "popularity":
                                aVal = a.popularity || 0;
                                bVal = b.popularity || 0;
                                break;
                            default:
                                aVal = a.productName?.toLowerCase() || "";
                                bVal = b.productName?.toLowerCase() || "";
                        }
                        
                        if (sortDir === "asc") {
                            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
                        } else {
                            return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
                        }
                    });
                    
                    setProducts(filteredProducts);
                    console.log(`✅ Loaded ${filteredProducts.length} products from database`);
                } else {
                    console.log("ℹ️ No products found");
                    setProducts([]);
                }
            } catch (error) {
                console.error("❌ Error loading products from database:", error);
                const errorMessage = getErrorMessage(error, "Failed to load products. Please refresh the page.");
                showError(errorMessage);
                setProducts([]);
            } finally {
                setLoading(false);
            }
        };

        // Debounce search query to avoid too many API calls
        const timeoutId = setTimeout(() => {
            loadProducts();
        }, searchQuery.trim() ? 500 : 0); // 500ms delay for search, immediate for other filters

        return () => clearTimeout(timeoutId);
    }, [searchQuery, sortBy, sortDir, filterInStock, minPrice, maxPrice, selectedCategory, showError]);

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

    const handleAddToCart = async (productId) => {
        // PRODUCT_OWNER cannot add to cart
        if (userRole === "PRODUCT_OWNER") {
            showError("Product owners cannot add products to cart.");
            return;
        }

        const token = localStorage.getItem("access_token");
        const product = products.find(p => p.productId === productId);
        
        if (!product) {
            showError("Product not found");
            return;
        }

        // Stock kontrolü - quantity 0 veya daha az ise eklenemez
        const stock = product.quantity || 0;
        if (stock <= 0) {
            showError("This product is out of stock and cannot be added to cart.");
            return;
        }

        // Guest cart için mevcut quantity kontrolü
        if (!token) {
            const guestCart = cartStorage.getCart();
            const existingItem = guestCart.items.find(item => item.productId === productId);
            const currentQuantity = existingItem ? existingItem.quantity : 0;
            const newQuantity = currentQuantity + 1;
            
            if (newQuantity > stock) {
                showError(`Only ${stock} items available in stock. You already have ${currentQuantity} in your cart.`);
                return;
            }
        }

        setAddingToCart({ ...addingToCart, [productId]: true });
        
        try {
            if (token) {
                await cartApi.addToCart(productId, 1);
                // Refresh cart count after adding to cart
                refreshCartCount();
                showSuccess("Product added to cart successfully!");
            } else {
                // Guest cart için indirimli fiyatı kullan
                const finalPrice = product.discount > 0 && product.price > 0
                    ? product.price - (product.price * product.discount / 100)
                    : product.price;
                cartStorage.addItem(
                    productId,
                    product.productName,
                    finalPrice,
                    1
                );
                window.dispatchEvent(new Event("cartUpdated"));
                refreshCartCount();
                showSuccess("Product added to cart! Please login to checkout.");
            }
        } catch (err) {
            console.error("Error adding to cart:", err);
            const errorMessage = getErrorMessage(err, "Failed to add product to cart. Please try again.");
            showError(errorMessage);
        } finally {
            setAddingToCart({ ...addingToCart, [productId]: false });
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
                        {userRole !== "PRODUCT_OWNER" && (
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
                        )}
                        {userRole === "PRODUCT_OWNER" && (
                            <Link
                                to="/owner-dashboard"
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
                                Dashboard
                            </Link>
                        )}
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
                                    {userRole !== "PRODUCT_OWNER" && (
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
                                    )}
                                    {userRole === "PRODUCT_OWNER" && (
                                        <Link
                                            to="/owner-dashboard"
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
                                            <span>📊</span>
                                            <span>Dashboard</span>
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
                                            padding: "0.9rem 1.2rem",
                                            color: "#2d3748",
                                            fontSize: "0.95rem",
                                            textDecoration: "none",
                                            borderBottom: "1px solid #f1f5f9",
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
                        maxWidth: "1400px",
                        width: "100%",
                    }}
                >
                    <div style={{ marginBottom: "2rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
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
                                    📦 {products.length} products
                                </div>
                            )}
                        </div>

                        {/* Search and Filters */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
                            {/* Search Bar */}
                            <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                                <input
                                    type="text"
                                    placeholder="Search products..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        flex: "1",
                                        minWidth: "200px",
                                        padding: "0.75rem 1rem",
                                        borderRadius: "10px",
                                        border: "2px solid #e2e8f0",
                                        fontSize: "1rem",
                                        outline: "none",
                                        transition: "all 0.2s",
                                        background: "#fff",
                                        color: "#2d3748",
                                    }}
                                    onFocus={(e) => {
                                        e.currentTarget.style.borderColor = "#667eea";
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor = "#e2e8f0";
                                    }}
                                />
                                <button
                                    onClick={() => {
                                        setSearchQuery("");
                                        setMinPrice("");
                                        setMaxPrice("");
                                        setFilterInStock(false);
                                        setSelectedCategory("");
                                        navigate("/products");
                                    }}
                                    style={{
                                        padding: "0.75rem 1.5rem",
                                        background: "#e2e8f0",
                                        color: "#4a5568",
                                        border: "none",
                                        borderRadius: "10px",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = "#cbd5e0";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = "#e2e8f0";
                                    }}
                                >
                                    Clear
                                </button>
                            </div>

                            {/* Sort and Filters */}
                            <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.9rem", fontWeight: 600, color: "#4a5568" }}>Category:</label>
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => {
                                            setSelectedCategory(e.target.value);
                                            if (e.target.value) {
                                                navigate(`/products?category=${e.target.value}`);
                                            } else {
                                                navigate("/products");
                                            }
                                        }}
                                        style={{
                                            padding: "0.5rem 1rem",
                                            borderRadius: "8px",
                                            border: "2px solid #e2e8f0",
                                            fontSize: "0.9rem",
                                            outline: "none",
                                            cursor: "pointer",
                                            background: "#fff",
                                            color: "#2d3748",
                                            minWidth: "150px",
                                        }}
                                    >
                                        <option value="">All Categories</option>
                                        {categories.map(cat => (
                                            <option key={cat.categoryId} value={cat.categoryId}>
                                                {cat.categoryName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.9rem", fontWeight: 600, color: "#4a5568" }}>Sort by:</label>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        style={{
                                            padding: "0.5rem 1rem",
                                            borderRadius: "8px",
                                            border: "2px solid #e2e8f0",
                                            fontSize: "0.9rem",
                                            outline: "none",
                                            cursor: "pointer",
                                            background: "#fff",
                                            color: "#2d3748",
                                        }}
                                    >
                                        <option value="productName">Name</option>
                                        <option value="price">Price</option>
                                        <option value="popularity">Popularity</option>
                                    </select>
                                    <select
                                        value={sortDir}
                                        onChange={(e) => setSortDir(e.target.value)}
                                        style={{
                                            padding: "0.5rem 1rem",
                                            borderRadius: "8px",
                                            border: "2px solid #e2e8f0",
                                            fontSize: "0.9rem",
                                            outline: "none",
                                            cursor: "pointer",
                                            background: "#fff",
                                            color: "#2d3748",
                                        }}
                                    >
                                        <option value="asc">Ascending</option>
                                        <option value="desc">Descending</option>
                                    </select>
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.9rem", fontWeight: 600, color: "#4a5568" }}>Price:</label>
                                    <input
                                        type="number"
                                        placeholder="Min"
                                        value={minPrice}
                                        onChange={(e) => setMinPrice(e.target.value)}
                                        style={{
                                            width: "100px",
                                            padding: "0.5rem",
                                            borderRadius: "8px",
                                            border: "2px solid #e2e8f0",
                                            fontSize: "0.9rem",
                                            outline: "none",
                                            background: "#fff",
                                            color: "#2d3748",
                                        }}
                                    />
                                    <span style={{ color: "#4a5568" }}>-</span>
                                    <input
                                        type="number"
                                        placeholder="Max"
                                        value={maxPrice}
                                        onChange={(e) => setMaxPrice(e.target.value)}
                                        style={{
                                            width: "100px",
                                            padding: "0.5rem",
                                            borderRadius: "8px",
                                            border: "2px solid #e2e8f0",
                                            fontSize: "0.9rem",
                                            outline: "none",
                                            background: "#fff",
                                            color: "#2d3748",
                                        }}
                                    />
                                </div>

                                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                                    <input
                                        type="checkbox"
                                        checked={filterInStock}
                                        onChange={(e) => setFilterInStock(e.target.checked)}
                                        style={{
                                            width: "18px",
                                            height: "18px",
                                            cursor: "pointer",
                                            accentColor: "#667eea",
                                        }}
                                    />
                                    <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#4a5568" }}>In Stock Only</span>
                                </label>
                            </div>
                        </div>
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
                                    onClick={() => navigate(`/products/${product.productId}`)}
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
                                            {(product.categoryNames && product.categoryNames.length > 0)
                                                ? product.categoryNames[0]
                                                : "Uncategorized"}
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
                                        {userRole !== "PRODUCT_OWNER" && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAddToCart(product.productId);
                                                }}
                                                disabled={(product.quantity || 0) <= 0 || !product.inStock || addingToCart[product.productId]}
                                                style={{
                                                    width: "100%",
                                                    padding: "0.75rem",
                                                    background: (product.quantity || 0) > 0 && product.inStock && !addingToCart[product.productId]
                                                        ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                                                        : "#cbd5e0",
                                                    color: "#fff",
                                                    border: "none",
                                                    borderRadius: "10px",
                                                    fontWeight: 600,
                                                    cursor: (product.quantity || 0) > 0 && product.inStock && !addingToCart[product.productId] ? "pointer" : "not-allowed",
                                                    transition: "all 0.2s",
                                                    opacity: (product.quantity || 0) > 0 && product.inStock && !addingToCart[product.productId] ? 1 : 0.6,
                                                }}
                                                onMouseEnter={(e) => {
                                                    if ((product.quantity || 0) > 0 && product.inStock && !addingToCart[product.productId]) {
                                                        e.currentTarget.style.transform = "scale(1.02)";
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if ((product.quantity || 0) > 0 && product.inStock && !addingToCart[product.productId]) {
                                                        e.currentTarget.style.transform = "scale(1)";
                                                    }
                                                }}
                                            >
                                                {addingToCart[product.productId] ? "Adding..." : (product.quantity || 0) <= 0 ? "Out of Stock" : product.inStock ? "Add to Cart" : "Out of Stock"}
                                            </button>
                                        )}
                                        {userRole === "PRODUCT_OWNER" && (
                                            <div
                                                style={{
                                                    width: "100%",
                                                    padding: "0.75rem",
                                                    background: "#e2e8f0",
                                                    color: "#4a5568",
                                                    border: "none",
                                                    borderRadius: "10px",
                                                    fontWeight: 600,
                                                    textAlign: "center",
                                                    fontSize: "0.9rem",
                                                }}
                                            >
                                                Product Owner View
                                            </div>
                                        )}
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
