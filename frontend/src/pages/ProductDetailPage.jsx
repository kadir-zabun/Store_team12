import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import productApi from "../api/productApi";
import cartApi from "../api/cartApi";
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
    const [quantity, setQuantity] = useState(1);
    const { cartCount, refreshCartCount } = useCartCount();
    const { success: showSuccess, error: showError } = useToast();
    const userRole = useUserRole();

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
                setReviews(Array.isArray(reviewsData) ? reviewsData : []);
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
    }, [productId, navigate, showError]);

    const handleAddToCart = async () => {
        if (!product) return;

        const stock = product.quantity || 0;
        if (stock < quantity) {
            showError(`Only ${stock} items available in stock.`);
            return;
        }

        setAddingToCart(true);
        try {
            const token = localStorage.getItem("access_token");
            if (token) {
                await cartApi.addToCart(productId, quantity);
            } else {
                // Guest cart
                const { cartStorage } = await import("../utils/cartStorage");
                cartStorage.addToCart({
                    productId: product.productId,
                    productName: product.productName,
                    price: product.price,
                    quantity: quantity,
                });
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
    const discountPrice = product.discount && product.discount > 0
        ? (product.price - product.discount).toFixed(2)
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
                                            {((product.discount / product.price) * 100).toFixed(0)}% OFF
                                        </span>
                                    </div>
                                ) : (
                                    <span style={{ fontSize: "2rem", fontWeight: 700, color: "#667eea" }}>
                                        ${product.price?.toFixed(2)}
                                    </span>
                                )}
                            </div>

                            {/* Stock Status */}
                            <div style={{
                                marginBottom: "1.5rem",
                                padding: "0.75rem 1rem",
                                background: stockStatus.color === "#e53e3e" ? "#fed7d7" : stockStatus.color === "#d69e2e" ? "#feebc8" : "#c6f6d5",
                                borderRadius: "8px",
                                display: "inline-block",
                            }}>
                                <span style={{ color: stockStatus.color, fontWeight: 600 }}>
                                    {stockStatus.text}
                                </span>
                            </div>

                            {/* Description */}
                            {product.description && (
                                <div style={{ marginBottom: "2rem" }}>
                                    <h3 style={{ fontSize: "1.2rem", fontWeight: 600, color: "#2d3748", marginBottom: "0.5rem" }}>
                                        Description
                                    </h3>
                                    <p style={{ color: "#4a5568", lineHeight: "1.6" }}>
                                        {product.description}
                                    </p>
                                </div>
                            )}

                            {/* Product Details */}
                            <div style={{ marginBottom: "2rem", padding: "1rem", background: "#f7fafc", borderRadius: "12px" }}>
                                <h3 style={{ fontSize: "1.2rem", fontWeight: 600, color: "#2d3748", marginBottom: "1rem" }}>
                                    Product Details
                                </h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    {product.model && (
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <span style={{ color: "#718096", fontWeight: 500 }}>Model:</span>
                                            <span style={{ color: "#2d3748", fontWeight: 600 }}>{product.model}</span>
                                        </div>
                                    )}
                                    {product.serialNumber && (
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <span style={{ color: "#718096", fontWeight: 500 }}>Serial Number:</span>
                                            <span style={{ color: "#2d3748", fontWeight: 600 }}>{product.serialNumber}</span>
                                        </div>
                                    )}
                                    {product.warrantyStatus && (
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <span style={{ color: "#718096", fontWeight: 500 }}>Warranty:</span>
                                            <span style={{ color: "#2d3748", fontWeight: 600 }}>{product.warrantyStatus}</span>
                                        </div>
                                    )}
                                    {product.distributionInfo && (
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <span style={{ color: "#718096", fontWeight: 500 }}>Distribution:</span>
                                            <span style={{ color: "#2d3748", fontWeight: 600 }}>{product.distributionInfo}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Add to Cart */}
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
                                        border: "none",
                                        borderRadius: "12px",
                                        fontSize: "1.1rem",
                                        fontWeight: 600,
                                        cursor: (product.quantity || 0) === 0 ? "not-allowed" : "pointer",
                                        transition: "all 0.3s",
                                    }}
                                >
                                    {addingToCart ? "Adding..." : (product.quantity || 0) === 0 ? "Out of Stock" : "Add to Cart"}
                                </button>
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
                                {reviews.map((review, index) => (
                                    <div
                                        key={review.reviewId || index}
                                        style={{
                                            padding: "1.5rem",
                                            background: "#f7fafc",
                                            borderRadius: "12px",
                                            border: "1px solid #e2e8f0",
                                        }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                                <span style={{ fontSize: "1.1rem", fontWeight: 600, color: "#d69e2e" }}>
                                                    {"⭐".repeat(review.rating || 0)}
                                                </span>
                                                <span style={{ fontSize: "0.9rem", color: "#718096" }}>
                                                    {review.rating}/10
                                                </span>
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
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

