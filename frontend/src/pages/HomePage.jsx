import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import categoryApi from "../api/categoryApi";
import productApi from "../api/productApi";

export default function HomePage() {
    const [activeTab, setActiveTab] = useState("products"); // "products" or "categories"
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
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
    }, []);

    return (
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
                            <span style={{ display: "block", marginTop: "0.5rem" }}>
                                Start your shopping journey today.
                            </span>
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
                                    <div style={{ color: "#718096", fontSize: "1.1rem" }}>Loading products...</div>
                                </div>
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
                                    <div style={{ color: "#718096", fontSize: "1.1rem" }}>Loading categories...</div>
                                </div>
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
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
    );
}
