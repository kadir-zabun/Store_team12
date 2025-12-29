import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import productApi from "../api/productApi";
import categoryApi from "../api/categoryApi";
import cartApi from "../api/cartApi";
import { cartStorage } from "../utils/cartStorage";
import { formatProductForDisplay } from "../utils/productAdapter";
import { useCartCount } from "../hooks/useCartCount";
import { useToast } from "../contexts/ToastContext";
import { useUserRole } from "../hooks/useUserRole";
import { getErrorMessage } from "../utils/errorHandler";
import CustomSelect from "../components/CustomSelect";

export default function ProductsPage() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addingToCart, setAddingToCart] = useState({});
    const navigate = useNavigate();
    const location = useLocation();
    const { refreshCartCount } = useCartCount();
    const { success: showSuccess, error: showError } = useToast();
    const userRole = useUserRole();

    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("lowest-price"); // Changed to single sort option
    const [filterInStock, setFilterInStock] = useState(false);
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    const getInitialCategory = () => {
        const urlParams = new URLSearchParams(location.search);
        return urlParams.get("category") || "";
    };
    const [selectedCategory, setSelectedCategory] = useState(getInitialCategory);
    const [categories, setCategories] = useState([]);

    useEffect(() => {
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
        
        // Check URL for category parameter and update state immediately
        const urlParams = new URLSearchParams(location.search);
        const categoryParam = urlParams.get("category");
        if (categoryParam) {
            setSelectedCategory(categoryParam);
        } else {
            setSelectedCategory("");
        }
    }, [location.pathname, location.search]);

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
                // Otherwise, use normal pagination
                else {
                    const response = await productApi.getAllProducts(0, 200);
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
                    
                    // Sort products based on selected sort option
                    filteredProducts.sort((a, b) => {
                        let aVal, bVal;
                        switch (sortBy) {
                            case "lowest-price":
                                aVal = a.finalPrice || a.price || 0;
                                bVal = b.finalPrice || b.price || 0;
                                return aVal - bVal;
                            case "highest-price":
                                aVal = a.finalPrice || a.price || 0;
                                bVal = b.finalPrice || b.price || 0;
                                return bVal - aVal;
                            case "popularity":
                                // Popularity = most sold (highest popularity value)
                                aVal = a.popularity || 0;
                                bVal = b.popularity || 0;
                                return bVal - aVal; // Descending for most popular
                            case "highest-rating":
                                // Average rating from reviews
                                aVal = a.averageRating || a.rating || 0;
                                bVal = b.averageRating || b.rating || 0;
                                return bVal - aVal; // Descending for highest rating
                            default:
                                aVal = a.finalPrice || a.price || 0;
                                bVal = b.finalPrice || b.price || 0;
                                return aVal - bVal;
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
        }, searchQuery.trim() ? 500 : 0);

        return () => clearTimeout(timeoutId);
    }, [searchQuery, sortBy, filterInStock, minPrice, maxPrice, selectedCategory, showError]);

    const handleAddToCart = async (productId) => {
        if (userRole === "PRODUCT_MANAGER" || userRole === "SALES_MANAGER" || userRole === "SUPPORT_AGENT") {
            showError("You do not have permission to add products to cart.");
            return;
        }

        const token = localStorage.getItem("access_token");
        const product = products.find(p => p.productId === productId);
        
        if (!product) {
            showError("Product not found");
            return;
        }

        const stock = product.quantity || 0;
        if (stock <= 0) {
            showError("This product is out of stock and cannot be added to cart.");
            return;
        }

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
                refreshCartCount();
                showSuccess("Product added to cart successfully!");
            } else {
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
        <div style={{ minHeight: "calc(100vh - 80px)", background: "#f7fafc" }}>
            <div
                style={{
                    minHeight: "calc(100vh - 80px)",
                    display: "flex",
                    maxWidth: "100%",
                    margin: "0",
                }}
            >
                {/* Left Sidebar - Filters */}
                <div
                    style={{
                        width: "280px",
                        flexShrink: 0,
                        background: "#fff",
                        borderRight: "1px solid #e2e8f0",
                        padding: "1.5rem",
                        height: "calc(100vh - 80px)",
                        overflowY: "auto",
                        position: "sticky",
                        top: "80px",
                    }}
                >
                    <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#2d3748", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid #e2e8f0" }}>
                        Filters
                    </h2>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                        {/* Category Filter */}
                        <div>
                            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, color: "#4a5568", marginBottom: "0.5rem" }}>
                                Category
                            </label>
                            <CustomSelect
                                value={selectedCategory}
                                onChange={(e) => {
                                    setSelectedCategory(e.target.value);
                                    if (e.target.value) {
                                        navigate(`/products?category=${e.target.value}`);
                                    } else {
                                        navigate("/products");
                                    }
                                }}
                                options={[
                                    { value: "", label: "All Categories" },
                                    ...categories.map(cat => ({ value: cat.categoryId, label: cat.categoryName }))
                                ]}
                                placeholder="All Categories"
                                minWidth="100%"
                            />
                        </div>

                        {/* Price Range Filter */}
                        <div>
                            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, color: "#4a5568", marginBottom: "0.5rem" }}>
                                Price Range
                            </label>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                <input
                                    type="number"
                                    placeholder="Min Price"
                                    value={minPrice}
                                    onChange={(e) => setMinPrice(e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "0.75rem",
                                        borderRadius: "8px",
                                        border: "2px solid #e2e8f0",
                                        fontSize: "0.9rem",
                                        outline: "none",
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
                                <input
                                    type="number"
                                    placeholder="Max Price"
                                    value={maxPrice}
                                    onChange={(e) => setMaxPrice(e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "0.75rem",
                                        borderRadius: "8px",
                                        border: "2px solid #e2e8f0",
                                        fontSize: "0.9rem",
                                        outline: "none",
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
                            </div>
                        </div>

                        {/* In Stock Filter */}
                        <div>
                            <label 
                                style={{ 
                                    display: "flex", 
                                    alignItems: "center", 
                                    gap: "0.75rem", 
                                    cursor: "pointer",
                                    userSelect: "none",
                                }}
                                onClick={(e) => {
                                    e.preventDefault();
                                    setFilterInStock(!filterInStock);
                                }}
                            >
                                <div
                                    style={{
                                        width: "20px",
                                        height: "20px",
                                        border: "2px solid #e2e8f0",
                                        borderRadius: "4px",
                                        backgroundColor: filterInStock ? "#667eea" : "#fff",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                        flexShrink: 0,
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = "#667eea";
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!filterInStock) {
                                            e.currentTarget.style.borderColor = "#e2e8f0";
                                        }
                                    }}
                                >
                                    {filterInStock && (
                                        <span style={{ color: "#fff", fontSize: "14px", fontWeight: "bold" }}>✓</span>
                                    )}
                                </div>
                                <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#4a5568" }}>In Stock Only</span>
                            </label>
                        </div>

                        {/* Clear Filters Button */}
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
                                width: "100%",
                                padding: "0.75rem",
                                background: "#e2e8f0",
                                color: "#4a5568",
                                border: "none",
                                borderRadius: "8px",
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
                            Clear Filters
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div style={{ flex: 1, background: "#fff", padding: "2rem" }}>
                    {/* Header with Search and Sort */}
                    <div style={{ marginBottom: "2rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
                            <h1
                                style={{
                                    fontSize: "clamp(1.5rem, 3vw, 2rem)",
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

                        {/* Search Bar */}
                        <div style={{ marginBottom: "1.5rem" }}>
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: "100%",
                                    maxWidth: "600px",
                                    padding: "0.75rem 1rem",
                                    borderRadius: "8px",
                                    border: "1px solid #e2e8f0",
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
                        </div>

                        {/* Sort Options */}
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", paddingBottom: "1rem", borderBottom: "1px solid #e2e8f0" }}>
                            <label style={{ fontSize: "0.9rem", fontWeight: 600, color: "#4a5568" }}>Sort by:</label>
                            <CustomSelect
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                options={[
                                    { value: "lowest-price", label: "Lowest Price" },
                                    { value: "highest-price", label: "Highest Price" },
                                    { value: "popularity", label: "Popularity" },
                                    { value: "highest-rating", label: "Highest Rating" }
                                ]}
                                minWidth="180px"
                            />
                        </div>
                    </div>

                    {loading ? (
                            <div style={{ textAlign: "center", padding: "3rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                                <div
                                    style={{
                                        width: "50px",
                                        height: "50px",
                                        border: "4px solid #e2e8f0",
                                        borderTop: "4px solid #667eea",
                                        borderRadius: "50%",
                                        animation: "spin 1s linear infinite",
                                    }}
                                />
                                <div style={{ color: "#a0aec0", fontSize: "1.1rem" }}>Loading products...</div>
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
                                                            e.target.src = "https://via.placeholder.com/300x250?text=No+Image";
                                                            e.target.style.objectFit = "contain";
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
                                            {(userRole !== "PRODUCT_MANAGER" && userRole !== "SALES_MANAGER" && userRole !== "SUPPORT_AGENT") && (
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
                                                        borderRadius: "4px",
                                                        fontWeight: 600,
                                                        cursor: (product.quantity || 0) > 0 && product.inStock && !addingToCart[product.productId] ? "pointer" : "not-allowed",
                                                        transition: "all 0.2s",
                                                        opacity: (product.quantity || 0) > 0 && product.inStock && !addingToCart[product.productId] ? 1 : 0.6,
                                                        fontSize: "0.85rem",
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
                                            {(userRole === "PRODUCT_MANAGER" || userRole === "SALES_MANAGER" || userRole === "SUPPORT_AGENT") && (
                                                <div
                                                    style={{
                                                        width: "100%",
                                                        padding: "0.75rem",
                                                        background: "#e2e8f0",
                                                        color: "#4a5568",
                                                        border: "none",
                                                        borderRadius: "4px",
                                                        fontWeight: 600,
                                                        textAlign: "center",
                                                        fontSize: "0.85rem",
                                                    }}
                                                >
                                                    {userRole === "PRODUCT_MANAGER" && "Product Manager View"}
                                                    {userRole === "SALES_MANAGER" && "Sales Manager View"}
                                                    {userRole === "SUPPORT_AGENT" && "Support Agent View"}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    <style>{`
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>
            </div>
        </div>
    );
}
