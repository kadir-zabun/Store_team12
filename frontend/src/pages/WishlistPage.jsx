import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import wishlistApi from "../api/wishlistApi";
import productApi from "../api/productApi";
import cartApi from "../api/cartApi";
import { cartStorage } from "../utils/cartStorage";
import { useToast } from "../contexts/ToastContext";
import { useUserRole } from "../hooks/useUserRole";
import { useCartCount } from "../hooks/useCartCount";

export default function WishlistPage() {
    const [wishlist, setWishlist] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [removing, setRemoving] = useState({});
    const [addingToCart, setAddingToCart] = useState({});
    const navigate = useNavigate();
    const { success: showSuccess, error: showError } = useToast();
    const userRole = useUserRole();
    const { refreshCartCount } = useCartCount();

    // Redirect if not CUSTOMER
    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            navigate("/login");
            return;
        }
        if (userRole !== "CUSTOMER") {
            navigate("/");
        }
    }, [userRole, navigate]);

    useEffect(() => {
        loadWishlist();
    }, []);

    const loadWishlist = async () => {
        setLoading(true);
        try {
            const response = await wishlistApi.getWishlist();
            const wishlistData = response.data?.data || response.data;
            setWishlist(wishlistData);

            // Load product details for each product in wishlist
            if (wishlistData && wishlistData.productIds && wishlistData.productIds.length > 0) {
                const productPromises = wishlistData.productIds.map((productId) =>
                    productApi.getProductById(productId).catch(() => null)
                );
                const productResponses = await Promise.all(productPromises);
                const productsData = productResponses
                    .map((res) => {
                        if (!res) return null;
                        return res.data?.data || res.data;
                    })
                    .filter((product) => product !== null);
                setProducts(productsData);
            } else {
                setProducts([]);
            }
        } catch (error) {
            console.error("Error loading wishlist:", error);
            if (error.response?.status === 401) {
                navigate("/login");
            } else {
                showError("Failed to load wishlist. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveFromWishlist = async (productId) => {
        setRemoving({ ...removing, [productId]: true });
        try {
            await wishlistApi.removeFromWishlist(productId);
            showSuccess("Product removed from wishlist!");
            // Reload wishlist
            await loadWishlist();
        } catch (error) {
            console.error("Error removing from wishlist:", error);
            showError(error.response?.data?.message || "Failed to remove product from wishlist.");
        } finally {
            setRemoving({ ...removing, [productId]: false });
        }
    };

    const handleAddToCart = async (product) => {
        const productId = product.productId;
        const token = localStorage.getItem("access_token");
        
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
            showError(err.response?.data?.message || "Failed to add product to cart. Please try again.");
        } finally {
            setAddingToCart({ ...addingToCart, [productId]: false });
        }
    };

    const formatCurrency = (amount) => {
        if (!amount) return "₺0.00";
        return new Intl.NumberFormat("tr-TR", {
            style: "currency",
            currency: "TRY",
        }).format(amount);
    };

    const calculateDiscountedPrice = (price, discount) => {
        if (!discount || discount <= 0) return price;
        const discountAmount = price * (discount / 100);
        return price - discountAmount;
    };

    if (loading) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div>Loading...</div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: "calc(100vh - 80px)", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
            <div
                style={{
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
                        maxWidth: "1200px",
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
                        My Wishlist
                    </h1>
                    <p style={{ color: "#718096", fontSize: "1.1rem", marginBottom: "2rem" }}>
                        {products.length === 0
                            ? "Your wishlist is empty. Start adding products you love!"
                            : `You have ${products.length} item${products.length > 1 ? "s" : ""} in your wishlist.`}
                    </p>

                    {products.length === 0 ? (
                        <div
                            style={{
                                textAlign: "center",
                                padding: "4rem 2rem",
                                color: "#718096",
                            }}
                        >
                            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>❤️</div>
                            <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                                Your wishlist is empty
                            </h2>
                            <p style={{ marginBottom: "2rem" }}>Start adding products you love to your wishlist!</p>
                            <Link
                                to="/products"
                                style={{
                                    display: "inline-block",
                                    padding: "0.75rem 2rem",
                                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                    color: "#fff",
                                    textDecoration: "none",
                                    borderRadius: "8px",
                                    fontWeight: 600,
                                    transition: "all 0.3s",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = "translateY(-2px)";
                                    e.currentTarget.style.boxShadow = "0 4px 8px rgba(102, 126, 234, 0.4)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "translateY(0)";
                                    e.currentTarget.style.boxShadow = "none";
                                }}
                            >
                                Browse Products
                            </Link>
                        </div>
                    ) : (
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                                gap: "1.5rem",
                            }}
                        >
                            {products.map((product) => {
                                const discountedPrice = calculateDiscountedPrice(
                                    product.price || 0,
                                    product.discount || 0
                                );
                                const hasDiscount = product.discount && product.discount > 0;

                                return (
                                    <div
                                        key={product.productId}
                                        style={{
                                            background: "#fff",
                                            borderRadius: "12px",
                                            overflow: "hidden",
                                            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                                            transition: "all 0.3s",
                                            border: "1px solid #e2e8f0",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = "translateY(-4px)";
                                            e.currentTarget.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.15)";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = "translateY(0)";
                                            e.currentTarget.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
                                        }}
                                    >
                                        <Link
                                            to={`/products/${product.productId}`}
                                            style={{ textDecoration: "none", color: "inherit" }}
                                        >
                                            <div
                                                style={{
                                                    width: "100%",
                                                    height: "200px",
                                                    background: "#f7fafc",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    overflow: "hidden",
                                                }}
                                            >
                                                {product.images && product.images.length > 0 && product.images[0] ? (
                                                    <img
                                                        src={product.images[0]}
                                                        alt={product.productName}
                                                        style={{
                                                            width: "100%",
                                                            height: "100%",
                                                            objectFit: "cover",
                                                        }}
                                                        onError={(e) => {
                                                            e.target.style.display = "none";
                                                            e.target.nextSibling.style.display = "flex";
                                                        }}
                                                    />
                                                ) : null}
                                                <div
                                                    style={{
                                                        display: product.images && product.images.length > 0 ? "none" : "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        fontSize: "3rem",
                                                        color: "#cbd5e0",
                                                    }}
                                                >
                                                    📦
                                                </div>
                                            </div>
                                        </Link>
                                        <div style={{ padding: "1rem" }}>
                                            <Link
                                                to={`/products/${product.productId}`}
                                                style={{ textDecoration: "none", color: "inherit" }}
                                            >
                                                <h3
                                                    style={{
                                                        fontSize: "1.1rem",
                                                        fontWeight: 600,
                                                        color: "#2d3748",
                                                        marginBottom: "0.5rem",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    {product.productName}
                                                </h3>
                                            </Link>
                                            <div style={{ marginBottom: "1rem" }}>
                                                {hasDiscount ? (
                                                    <div>
                                                        <div
                                                            style={{
                                                                fontSize: "1.25rem",
                                                                fontWeight: 700,
                                                                color: "#667eea",
                                                            }}
                                                        >
                                                            {formatCurrency(discountedPrice)}
                                                        </div>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                                            <span
                                                                style={{
                                                                    fontSize: "0.9rem",
                                                                    color: "#718096",
                                                                    textDecoration: "line-through",
                                                                }}
                                                            >
                                                                {formatCurrency(product.price)}
                                                            </span>
                                                            <span
                                                                style={{
                                                                    fontSize: "0.85rem",
                                                                    background: "#e53e3e",
                                                                    color: "#fff",
                                                                    padding: "0.2rem 0.5rem",
                                                                    borderRadius: "4px",
                                                                    fontWeight: 600,
                                                                }}
                                                            >
                                                                -{product.discount}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div
                                                        style={{
                                                            fontSize: "1.25rem",
                                                            fontWeight: 700,
                                                            color: "#667eea",
                                                        }}
                                                    >
                                                        {formatCurrency(product.price)}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        handleAddToCart(product);
                                                    }}
                                                    disabled={addingToCart[product.productId]}
                                                    style={{
                                                        flex: 1,
                                                        padding: "0.75rem",
                                                        background: addingToCart[product.productId]
                                                            ? "#cbd5e0"
                                                            : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                                        color: "#fff",
                                                        border: addingToCart[product.productId] ? "none" : "2px solid transparent",
                                                        borderRadius: "4px",
                                                        fontWeight: 600,
                                                        cursor: addingToCart[product.productId] ? "not-allowed" : "pointer",
                                                        fontSize: "0.85rem",
                                                        transition: "all 0.2s",
                                                        opacity: addingToCart[product.productId] ? 0.6 : 1,
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!addingToCart[product.productId]) {
                                                            e.currentTarget.style.background = "#fff";
                                                            e.currentTarget.style.color = "#667eea";
                                                            e.currentTarget.style.borderColor = "#667eea";
                                                            e.currentTarget.style.transform = "scale(1.02)";
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!addingToCart[product.productId]) {
                                                            e.currentTarget.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
                                                            e.currentTarget.style.color = "#fff";
                                                            e.currentTarget.style.borderColor = "transparent";
                                                            e.currentTarget.style.transform = "scale(1)";
                                                        }
                                                    }}
                                                >
                                                    {addingToCart[product.productId] ? "Adding..." : "Add to Cart"}
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        handleRemoveFromWishlist(product.productId);
                                                    }}
                                                    disabled={removing[product.productId]}
                                                    style={{
                                                        flex: 1,
                                                        padding: "0.75rem",
                                                        background: removing[product.productId]
                                                            ? "#cbd5e0"
                                                            : "#e53e3e",
                                                        color: "#fff",
                                                        border: removing[product.productId] ? "none" : "2px solid transparent",
                                                        borderRadius: "4px",
                                                        fontWeight: 600,
                                                        cursor: removing[product.productId] ? "not-allowed" : "pointer",
                                                        fontSize: "0.85rem",
                                                        transition: "all 0.2s",
                                                        opacity: removing[product.productId] ? 0.6 : 1,
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!removing[product.productId]) {
                                                            e.currentTarget.style.background = "#fff";
                                                            e.currentTarget.style.color = "#e53e3e";
                                                            e.currentTarget.style.borderColor = "#e53e3e";
                                                            e.currentTarget.style.transform = "scale(1.02)";
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!removing[product.productId]) {
                                                            e.currentTarget.style.background = "#e53e3e";
                                                            e.currentTarget.style.color = "#fff";
                                                            e.currentTarget.style.borderColor = "transparent";
                                                            e.currentTarget.style.transform = "scale(1)";
                                                        }
                                                    }}
                                                >
                                                    {removing[product.productId] ? "Removing..." : "Remove"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

