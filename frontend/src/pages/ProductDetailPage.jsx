import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import productApi from "../api/productApi";
import cartApi from "../api/cartApi";
import wishlistApi from "../api/wishlistApi";
import { useCartCount } from "../hooks/useCartCount";
import { useToast } from "../contexts/ToastContext";
import { useUserRole } from "../hooks/useUserRole";

export default function ProductDetailPage() {
    const { productId } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [addingToCart, setAddingToCart] = useState(false);
    const [addingToWishlist, setAddingToWishlist] = useState(false);
    const [isInWishlist, setIsInWishlist] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const { cartCount, refreshCartCount } = useCartCount();
    const { success: showSuccess, error: showError } = useToast();
    const userRole = useUserRole();

    const checkWishlistStatus = async () => {
        const token = localStorage.getItem("access_token");
        if (!token || userRole !== "CUSTOMER") return;

        try {
            const response = await wishlistApi.getWishlist();
            const wishlistData = response.data?.data || response.data;
            if (wishlistData && wishlistData.productIds) {
                setIsInWishlist(wishlistData.productIds.includes(productId));
            }
        } catch (error) {
            console.error("Error checking wishlist status:", error);
        }
    };

    useEffect(() => {
        const loadProduct = async () => {
            try {
                setLoading(true);
                const [productResponse, reviewsResponse] = await Promise.all([
                    productApi.getProductById(productId),
                    productApi.getApprovedReviewsForProduct(productId),
                ]);

                // Handle wrapped response
                let productData = productResponse.data;
                if (productData && productData.data) {
                    productData = productData.data;
                }

                let reviewsData = reviewsResponse.data;
                if (reviewsData && reviewsData.data) {
                    reviewsData = reviewsData.data;
                } else if (Array.isArray(reviewsData)) {
                    reviewsData = reviewsData;
                } else {
                    reviewsData = [];
                }

                setProduct(productData);
                console.log("Loaded reviews:", reviewsData);
                setReviews(Array.isArray(reviewsData) ? reviewsData : []);

                // Check if product is in wishlist (only for logged-in CUSTOMER)
                const token = localStorage.getItem("access_token");
                if (token && userRole === "CUSTOMER") {
                    await checkWishlistStatus();
                }
            } catch (error) {
                console.error("Error loading product:", error);
                showError("Failed to load product. Please try again.");
                navigate("/products");
            } finally {
                setLoading(false);
            }
        };

        if (productId) {
            loadProduct();
        }
    }, [productId, navigate, showError, userRole]);

    const handleAddToCart = async () => {
        // PRODUCT_MANAGER, SALES_MANAGER, and SUPPORT_AGENT cannot add to cart
        if (userRole === "PRODUCT_MANAGER" || userRole === "SALES_MANAGER" || userRole === "SUPPORT_AGENT") {
            showError("You do not have permission to add products to cart.");
            return;
        }
        if (!product) return;

        const stock = product.quantity || 0;
        
        // Stock kontrolü - quantity 0 veya daha az ise eklenemez
        if (stock <= 0) {
            showError("This product is out of stock and cannot be added to cart.");
            return;
        }

        // Seçilen quantity stock'tan fazla ise eklenemez
        if (quantity > stock) {
            showError(`Only ${stock} items available in stock.`);
            return;
        }

        // Guest cart için mevcut quantity kontrolü
        const token = localStorage.getItem("access_token");
        if (!token) {
            const { cartStorage } = await import("../utils/cartStorage");
            const guestCart = cartStorage.getCart();
            const existingItem = guestCart.items.find(item => item.productId === productId);
            const currentQuantity = existingItem ? existingItem.quantity : 0;
            const newQuantity = currentQuantity + quantity;
            
            if (newQuantity > stock) {
                showError(`Only ${stock} items available in stock. You already have ${currentQuantity} in your cart.`);
                return;
            }
        }

        setAddingToCart(true);
        try {
            if (token) {
                await cartApi.addToCart(productId, quantity);
            } else {
                // Guest cart - indirimli fiyatı kullan
                const { cartStorage } = await import("../utils/cartStorage");
                const finalPrice = product.discount > 0 && product.price > 0
                    ? product.price - (product.price * product.discount / 100)
                    : product.price;
                cartStorage.addItem(
                    product.productId,
                    product.productName,
                    finalPrice,
                    quantity
                );
            }
            refreshCartCount();
            showSuccess("Product added to cart successfully!");
        } catch (error) {
            console.error("Error adding to cart:", error);
            showError(error.response?.data?.message || "Failed to add product to cart.");
        } finally {
            setAddingToCart(false);
        }
    };

    const handleWishlistToggle = async () => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            showError("Please login to add products to your wishlist.");
            navigate("/login");
            return;
        }

        if (userRole !== "CUSTOMER") {
            showError("Only customers can add products to wishlist.");
            return;
        }

        setAddingToWishlist(true);
        try {
            if (isInWishlist) {
                await wishlistApi.removeFromWishlist(productId);
                setIsInWishlist(false);
                showSuccess("Product removed from wishlist!");
            } else {
                await wishlistApi.addToWishlist(productId);
                setIsInWishlist(true);
                showSuccess("Product added to wishlist!");
            }
        } catch (error) {
            console.error("Error toggling wishlist:", error);
            showError(error.response?.data?.message || "Failed to update wishlist.");
        } finally {
            setAddingToWishlist(false);
        }
    };

    const calculateAverageRating = () => {
        if (!reviews || reviews.length === 0) return 0;
        const total = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
        return (total / reviews.length).toFixed(1);
    };

    const getStockStatus = () => {
        const stock = product?.quantity || 0;
        if (stock === 0) {
            return { text: "Out of Stock", color: "#e53e3e" };
        } else if (stock < 10) {
            return { text: `Only ${stock} left in stock`, color: "#d69e2e" };
        } else {
            return { text: `In Stock (${stock} available)`, color: "#2f855a" };
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ color: "#fff", fontSize: "1.5rem" }}>Loading product...</div>
            </div>
        );
    }

    if (!product) {
        return (
            <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ background: "rgba(255, 255, 255, 0.95)", padding: "2rem", borderRadius: "20px", textAlign: "center" }}>
                    <h2 style={{ color: "#2d3748" }}>Product not found</h2>
                    <Link to="/products" style={{ color: "#667eea", textDecoration: "none", fontWeight: 600 }}>Back to Products</Link>
                </div>
            </div>
        );
    }

    const stockStatus = getStockStatus();
    const averageRating = calculateAverageRating();
    // Backend'de: price = originalActualPrice, discount = yüzde olarak
    // Frontend'de: discountPrice = price - (price * discount / 100)
    const discountPrice = product.discount && product.discount > 0 && product.price > 0
        ? (product.price - (product.price * product.discount / 100)).toFixed(2)
        : null;

    return (
        <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding: "2rem" }}>
            <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
                <Link
                    to="/products"
                    style={{
                        display: "inline-block",
                        marginBottom: "2rem",
                        color: "#fff",
                        textDecoration: "none",
                        fontWeight: 600,
                        fontSize: "1rem",
                    }}
                >
                    ← Back to Products
                </Link>

                <div style={{ background: "rgba(255, 255, 255, 0.95)", padding: "3rem", borderRadius: "20px", boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem", marginBottom: "3rem" }}>
                        {/* Product Image */}
                        <div>
                            {product.images && product.images.length > 0 ? (
                                <img
                                    src={product.images[0]}
                                    alt={product.productName}
                                    style={{
                                        width: "100%",
                                        height: "500px",
                                        objectFit: "cover",
                                        borderRadius: "16px",
                                        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
                                    }}
                                    onError={(e) => {
                                        e.target.src = "https://via.placeholder.com/500x500?text=No+Image";
                                    }}
                                />
                            ) : (
                                <div style={{
                                    width: "100%",
                                    height: "500px",
                                    background: "#f7fafc",
                                    borderRadius: "16px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#718096",
                                    fontSize: "1.2rem",
                                }}>
                                    No Image Available
                                </div>
                            )}
                        </div>

                        {/* Product Info */}
                        <div>
                            <h1 style={{ fontSize: "2.5rem", fontWeight: 700, color: "#2d3748", marginBottom: "1rem" }}>
                                {product.productName}
                            </h1>

                            {/* Rating */}
                            {averageRating > 0 && (
                                <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <span style={{ fontSize: "1.2rem", fontWeight: 600, color: "#d69e2e" }}>
                                        ⭐ {averageRating}
                                    </span>
                                    <span style={{ color: "#718096", fontSize: "0.9rem" }}>
                                        ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
                                    </span>
                                </div>
                            )}

                            {/* Price */}
                            <div style={{ marginBottom: "1.5rem" }}>
                                {discountPrice ? (
                                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                        <span style={{ fontSize: "2rem", fontWeight: 700, color: "#667eea" }}>
                                            ${discountPrice}
                                        </span>
                                        <span style={{ fontSize: "1.2rem", color: "#718096", textDecoration: "line-through" }}>
                                            ${product.price?.toFixed(2)}
                                        </span>
                                        <span style={{ fontSize: "0.9rem", color: "#2f855a", fontWeight: 600 }}>
                                            {Math.round(product.discount)}% OFF
                                        </span>
                                    </div>
                                ) : (
                                    <span style={{ fontSize: "2rem", fontWeight: 700, color: "#667eea" }}>
                                        ${product.price?.toFixed(2)}
                                    </span>
                                )}
                            </div>

                            {/* Product Details - All Required Fields */}
                            <div style={{ marginBottom: "2rem", padding: "1.5rem", background: "#f7fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                                <h3 style={{ fontSize: "1.3rem", fontWeight: 600, color: "#2d3748", marginBottom: "1.5rem" }}>
                                    Product Information
                                </h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                    {/* Name */}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.75rem", borderBottom: "1px solid #e2e8f0" }}>
                                        <span style={{ color: "#718096", fontWeight: 600, fontSize: "0.95rem" }}>Product Name:</span>
                                        <span style={{ color: "#2d3748", fontWeight: 600, fontSize: "1rem" }}>{product.productName || "N/A"}</span>
                                    </div>
                                    
                                    {/* Model */}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.75rem", borderBottom: "1px solid #e2e8f0" }}>
                                        <span style={{ color: "#718096", fontWeight: 600, fontSize: "0.95rem" }}>Model:</span>
                                        <span style={{ color: "#2d3748", fontWeight: 600, fontSize: "1rem" }}>{product.model || "N/A"}</span>
                                    </div>
                                    
                                    {/* Serial Number */}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.75rem", borderBottom: "1px solid #e2e8f0" }}>
                                        <span style={{ color: "#718096", fontWeight: 600, fontSize: "0.95rem" }}>Serial Number:</span>
                                        <span style={{ color: "#2d3748", fontWeight: 600, fontSize: "1rem" }}>{product.serialNumber || "N/A"}</span>
                                    </div>
                                    
                                    {/* Description */}
                                    <div style={{ paddingBottom: "0.75rem", borderBottom: "1px solid #e2e8f0" }}>
                                        <span style={{ color: "#718096", fontWeight: 600, fontSize: "0.95rem", display: "block", marginBottom: "0.5rem" }}>Description:</span>
                                        <p style={{ color: "#2d3748", lineHeight: "1.6", fontSize: "1rem", margin: 0 }}>
                                            {product.description || "N/A"}
                                        </p>
                                    </div>
                                    
                                    {/* Quantity in Stock */}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.75rem", borderBottom: "1px solid #e2e8f0" }}>
                                        <span style={{ color: "#718096", fontWeight: 600, fontSize: "0.95rem" }}>Quantity in Stock:</span>
                                        <span style={{ color: "#2d3748", fontWeight: 600, fontSize: "1rem" }}>{product.quantity || 0}</span>
                                    </div>
                                    
                                    {/* Price */}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.75rem", borderBottom: "1px solid #e2e8f0" }}>
                                        <span style={{ color: "#718096", fontWeight: 600, fontSize: "0.95rem" }}>Price:</span>
                                        <span style={{ color: "#2d3748", fontWeight: 600, fontSize: "1rem" }}>
                                            ${product.price?.toFixed(2) || "0.00"}
                                        </span>
                                    </div>
                                    
                                    {/* Warranty Status */}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.75rem", borderBottom: "1px solid #e2e8f0" }}>
                                        <span style={{ color: "#718096", fontWeight: 600, fontSize: "0.95rem" }}>Warranty Status:</span>
                                        <span style={{ color: "#2d3748", fontWeight: 600, fontSize: "1rem" }}>{product.warrantyStatus || "N/A"}</span>
                                    </div>
                                    
                                    {/* Distributor Information */}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ color: "#718096", fontWeight: 600, fontSize: "0.95rem" }}>Distributor Information:</span>
                                        <span style={{ color: "#2d3748", fontWeight: 600, fontSize: "1rem" }}>{product.distributionInfo || "N/A"}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Add to Cart and Wishlist */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                        <label style={{ color: "#4a5568", fontWeight: 600 }}>Quantity:</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max={product.quantity || 1}
                                            value={quantity}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || 1;
                                                setQuantity(Math.max(1, Math.min(val, product.quantity || 1)));
                                            }}
                                            style={{
                                                width: "80px",
                                                padding: "0.5rem",
                                                borderRadius: "8px",
                                                border: "2px solid #e2e8f0",
                                                fontSize: "1rem",
                                                background: "#fff",
                                                color: "#2d3748",
                                                textAlign: "center",
                                            }}
                                        />
                                    </div>
                                    {(userRole !== "PRODUCT_MANAGER" && userRole !== "SALES_MANAGER" && userRole !== "SUPPORT_AGENT") && (
                                        <button
                                            onClick={handleAddToCart}
                                            disabled={addingToCart || (product.quantity || 0) === 0}
                                            style={{
                                                flex: 1,
                                                padding: "1rem 2rem",
                                                background: (product.quantity || 0) === 0
                                                    ? "#cbd5e0"
                                                    : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                                color: "#fff",
                                                border: (product.quantity || 0) === 0 ? "none" : "2px solid transparent",
                                                borderRadius: "10px",
                                                fontSize: "1rem",
                                                fontWeight: 600,
                                                cursor: (product.quantity || 0) === 0 ? "not-allowed" : "pointer",
                                                transition: "all 0.2s",
                                                boxShadow: (product.quantity || 0) > 0 ? "0 2px 4px rgba(102, 126, 234, 0.3)" : "none",
                                            }}
                                            onMouseEnter={(e) => {
                                                if ((product.quantity || 0) > 0 && !addingToCart) {
                                                    e.currentTarget.style.background = "#fff";
                                                    e.currentTarget.style.color = "#667eea";
                                                    e.currentTarget.style.borderColor = "#667eea";
                                                    e.currentTarget.style.transform = "translateY(-2px)";
                                                    e.currentTarget.style.boxShadow = "0 4px 8px rgba(102, 126, 234, 0.4)";
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if ((product.quantity || 0) > 0) {
                                                    e.currentTarget.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
                                                    e.currentTarget.style.color = "#fff";
                                                    e.currentTarget.style.borderColor = "transparent";
                                                    e.currentTarget.style.transform = "translateY(0)";
                                                    e.currentTarget.style.boxShadow = "0 2px 4px rgba(102, 126, 234, 0.3)";
                                                }
                                            }}
                                        >
                                            {addingToCart ? "Adding..." : (product.quantity || 0) === 0 ? "Out of Stock" : "Add to Cart"}
                                        </button>
                                    )}
                                    {(userRole === "PRODUCT_MANAGER" || userRole === "SALES_MANAGER" || userRole === "SUPPORT_AGENT") && (
                                        <div
                                            style={{
                                                flex: 1,
                                                padding: "1rem 2rem",
                                                background: "#e2e8f0",
                                                color: "#4a5568",
                                                border: "none",
                                                borderRadius: "4px",
                                                fontSize: "0.9rem",
                                                fontWeight: 600,
                                                textAlign: "center",
                                            }}
                                        >
                                            {userRole === "PRODUCT_MANAGER" && "Product Manager View"}
                                            {userRole === "SALES_MANAGER" && "Sales Manager View"}
                                            {userRole === "SUPPORT_AGENT" && "Support Agent View"}
                                        </div>
                                    )}
                                </div>
                                {userRole === "CUSTOMER" && (
                                    <button
                                        onClick={handleWishlistToggle}
                                        disabled={addingToWishlist}
                                        style={{
                                            width: "100%",
                                            padding: "1rem 2rem",
                                            background: addingToWishlist
                                                ? "#cbd5e0"
                                                : isInWishlist
                                                    ? "linear-gradient(135deg, #e53e3e 0%, #c53030 100%)"
                                                    : "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                                            color: "#fff",
                                            border: addingToWishlist ? "none" : "2px solid transparent",
                                            borderRadius: "10px",
                                            fontSize: "1rem",
                                            fontWeight: 600,
                                            cursor: addingToWishlist ? "not-allowed" : "pointer",
                                            transition: "all 0.2s",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "0.5rem",
                                            opacity: addingToWishlist ? 0.6 : 1,
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!addingToWishlist) {
                                                e.currentTarget.style.background = "#fff";
                                                e.currentTarget.style.color = isInWishlist ? "#e53e3e" : "#f5576c";
                                                e.currentTarget.style.borderColor = isInWishlist ? "#e53e3e" : "#f5576c";
                                                e.currentTarget.style.transform = "translateY(-2px)";
                                                e.currentTarget.style.boxShadow = isInWishlist 
                                                    ? "0 4px 8px rgba(229, 62, 62, 0.4)"
                                                    : "0 4px 8px rgba(245, 87, 108, 0.4)";
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!addingToWishlist) {
                                                e.currentTarget.style.background = isInWishlist
                                                    ? "linear-gradient(135deg, #e53e3e 0%, #c53030 100%)"
                                                    : "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)";
                                                e.currentTarget.style.color = "#fff";
                                                e.currentTarget.style.borderColor = "transparent";
                                                e.currentTarget.style.transform = "translateY(0)";
                                                e.currentTarget.style.boxShadow = "none";
                                            }
                                        }}
                                    >
                                        {addingToWishlist ? (
                                            "Processing..."
                                        ) : isInWishlist ? (
                                            <>
                                                <span>❤️</span>
                                                <span>Remove from Wishlist</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>🤍</span>
                                                <span>Add to Wishlist</span>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Reviews Section */}
                    <div style={{ marginTop: "3rem", paddingTop: "3rem", borderTop: "2px solid #e2e8f0" }}>
                        <h2 style={{ fontSize: "2rem", fontWeight: 700, color: "#2d3748", marginBottom: "2rem" }}>
                            Customer Reviews
                        </h2>

                        {reviews.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "3rem", color: "#718096" }}>
                                <p style={{ fontSize: "1.1rem" }}>No reviews yet. Be the first to review this product!</p>
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                                {reviews.map((review, index) => {
                                    console.log("Review:", review, "Username:", review.username);
                                    return (
                                    <div
                                        key={review.reviewId || index}
                                        style={{
                                            padding: "1.5rem",
                                            background: "#f7fafc",
                                            borderRadius: "12px",
                                            border: "1px solid #e2e8f0",
                                        }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                                            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                                                {review.username ? (
                                                    <div style={{ fontSize: "1rem", fontWeight: 600, color: "#2d3748" }}>
                                                        {review.username}
                                                    </div>
                                                ) : (
                                                    <div style={{ fontSize: "0.9rem", color: "#718096", fontStyle: "italic" }}>
                                                        Anonymous
                                                    </div>
                                                )}
                                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                                    <span style={{ fontSize: "1.1rem", fontWeight: 600, color: "#d69e2e" }}>
                                                        {"⭐".repeat(review.rating || 0)}
                                                    </span>
                                                    <span style={{ fontSize: "0.9rem", color: "#718096" }}>
                                                        {review.rating}/10
                                                    </span>
                                                </div>
                                            </div>
                                            {review.createdAt && (
                                                <span style={{ fontSize: "0.9rem", color: "#718096" }}>
                                                    {new Date(review.createdAt).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                        {review.comment && (
                                            <p style={{ color: "#2d3748", lineHeight: "1.6", marginTop: "0.5rem" }}>
                                                {review.comment}
                                            </p>
                                        )}
                                    </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

