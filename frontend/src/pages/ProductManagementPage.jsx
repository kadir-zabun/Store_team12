import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import productApi from "../api/productApi";
import categoryApi from "../api/categoryApi";
import { useToast } from "../contexts/ToastContext";
import { useUserRole } from "../hooks/useUserRole";

export default function ProductManagementPage() {
    const [userName, setUserName] = useState(null);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [deleting, setDeleting] = useState({});
    const [productForm, setProductForm] = useState({
        productName: "",
        description: "",
        price: "",
        discount: "",
        quantity: "",
        model: "",
        serialNumber: "",
        warrantyStatus: "",
        distributionInfo: "",
        categoryIds: [],
        images: [""],
    });
    const navigate = useNavigate();
    const { success: showSuccess, error: showError } = useToast();
    const userRole = useUserRole();
    const dropdownRef = useRef(null);
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            navigate("/login");
            return;
        }

        // Check role from localStorage directly if hook hasn't loaded yet
        const storedRole = localStorage.getItem("user_role");
        const currentRole = userRole || storedRole;

        // Wait for userRole to load
        if (currentRole === null || currentRole === undefined) {
            return; // Still loading
        }

        if (currentRole !== "PRODUCT_OWNER") {
            navigate("/");
            return;
        }

        const loadData = async () => {
            try {
                // Get username
                const payloadBase64 = token.split(".")[1];
                const normalized = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
                const payloadJson = atob(normalized);
                const payload = JSON.parse(payloadJson);
                const username = payload.sub || payload.name || payload.username;
                setUserName(username);

                // Load products and categories
                const [productsRes, categoriesRes] = await Promise.all([
                    productApi.getMyProducts(),
                    categoryApi.getAllCategories(),
                ]);

                // Backend returns {success: true, data: [...], meta: {...}}
                // Axios wraps it in response.data, so we need response.data.data
                const productsData = productsRes?.data?.data || productsRes?.data || productsRes || [];
                const categoriesData = categoriesRes?.data?.data || categoriesRes?.data || categoriesRes || [];
                
                setProducts(Array.isArray(productsData) ? productsData : []);
                setCategories(Array.isArray(categoriesData) ? categoriesData : []);
            } catch (error) {
                console.error("Error loading data:", error);
                showError(error.response?.data?.message || "Failed to load data. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [navigate, userRole, showError]);

    const handleCreateProduct = async (e) => {
        e.preventDefault();
        try {
            const productData = {
                productName: productForm.productName,
                description: productForm.description,
                price: parseFloat(productForm.price) || 0,
                discount: parseFloat(productForm.discount) || 0,
                quantity: parseInt(productForm.quantity) || 0,
                model: productForm.model || null,
                serialNumber: productForm.serialNumber || null,
                warrantyStatus: productForm.warrantyStatus || null,
                distributionInfo: productForm.distributionInfo || null,
                categoryIds: productForm.categoryIds.filter(id => id),
                images: productForm.images.filter(img => img),
                inStock: (parseInt(productForm.quantity) || 0) > 0,
                popularity: 0,
            };

            const response = await productApi.createProduct(productData);
            showSuccess("Product created successfully!");
            setShowCreateForm(false);
            setProductForm({
                productName: "",
                description: "",
                price: "",
                discount: "",
                quantity: "",
                model: "",
                serialNumber: "",
                warrantyStatus: "",
                distributionInfo: "",
                categoryIds: [],
                images: [""],
            });

            // Reload products
            const productsRes = await productApi.getMyProducts();
            setProducts(productsRes.data || []);
        } catch (error) {
            console.error("Error creating product:", error);
            showError(error.response?.data?.message || "Failed to create product. Please try again.");
        }
    };

    const handleDeleteProduct = async (productId) => {
        if (!window.confirm("Are you sure you want to delete this product?")) {
            return;
        }

        setDeleting({ ...deleting, [productId]: true });
        try {
            await productApi.deleteProduct(productId);
            showSuccess("Product deleted successfully!");
            setProducts(products.filter(p => p.productId !== productId));
        } catch (error) {
            console.error("Error deleting product:", error);
            showError(error.response?.data?.message || "Failed to delete product. Please try again.");
        } finally {
            setDeleting({ ...deleting, [productId]: false });
        }
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

    // Check role from localStorage directly if hook hasn't loaded yet
    const storedRole = localStorage.getItem("user_role");
    const currentRole = userRole || storedRole;

    // Show loading while checking role or loading data
    if (loading || (currentRole === null || currentRole === undefined)) {
        return (
            <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ color: "#fff", fontSize: "1.5rem" }}>Loading...</div>
            </div>
        );
    }

    // If not PRODUCT_OWNER, show message (will redirect in useEffect)
    if (currentRole !== "PRODUCT_OWNER") {
        return (
            <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ background: "rgba(255, 255, 255, 0.95)", padding: "2rem", borderRadius: "20px", textAlign: "center" }}>
                    <h2 style={{ color: "#2d3748" }}>Access Denied</h2>
                    <p style={{ color: "#718096" }}>This page is only accessible to Product Owners.</p>
                </div>
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
                        <Link to="/owner-dashboard" style={{ color: "#4a5568", textDecoration: "none", padding: "0.5rem 1rem", borderRadius: "8px", fontWeight: 500 }}>
                            Dashboard
                        </Link>
                        <Link to="/owner/products" style={{ color: "#667eea", textDecoration: "none", padding: "0.5rem 1rem", borderRadius: "8px", fontWeight: 600, background: "#f7fafc" }}>
                            Products
                        </Link>
                        <Link to="/owner/orders" style={{ color: "#4a5568", textDecoration: "none", padding: "0.5rem 1rem", borderRadius: "8px", fontWeight: 500 }}>
                            Orders
                        </Link>
                        <Link to="/owner/reviews" style={{ color: "#4a5568", textDecoration: "none", padding: "0.5rem 1rem", borderRadius: "8px", fontWeight: 500 }}>
                            Reviews
                        </Link>
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "1rem", position: "relative" }}>
                    {userName && (
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
                                }}
                            >
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
                    )}
                </div>
            </nav>

            <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
                <div style={{ background: "rgba(255, 255, 255, 0.95)", padding: "2rem", borderRadius: "20px", boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                        <h1 style={{ fontSize: "2.5rem", fontWeight: 700, color: "#2d3748" }}>Product Management</h1>
                        <button
                            onClick={() => setShowCreateForm(!showCreateForm)}
                            style={{
                                padding: "0.75rem 1.5rem",
                                background: showCreateForm ? "#e2e8f0" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                color: showCreateForm ? "#4a5568" : "#fff",
                                border: "none",
                                borderRadius: "10px",
                                fontWeight: 600,
                                cursor: "pointer",
                            }}
                        >
                            {showCreateForm ? "Cancel" : "+ Create Product"}
                        </button>
                    </div>

                    {/* Create Product Form */}
                    {showCreateForm && (
                        <div style={{ marginBottom: "2rem", padding: "2rem", background: "#f7fafc", borderRadius: "12px", border: "2px solid #e2e8f0" }}>
                            <h2 style={{ marginBottom: "1.5rem", color: "#2d3748" }}>Create New Product</h2>
                            <form onSubmit={handleCreateProduct}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem", width: "100%" }}>
                                    <div style={{ width: "100%" }}>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#4a5568" }}>Product Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={productForm.productName}
                                            onChange={(e) => setProductForm({ ...productForm, productName: e.target.value })}
                                            style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "2px solid #e2e8f0", fontSize: "1rem", background: "#fff", color: "#2d3748", boxSizing: "border-box" }}
                                        />
                                    </div>
                                    <div style={{ width: "100%" }}>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#4a5568" }}>Price *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            value={productForm.price}
                                            onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                                            style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "2px solid #e2e8f0", fontSize: "1rem", background: "#fff", color: "#2d3748", boxSizing: "border-box" }}
                                        />
                                    </div>
                                </div>

                                <div style={{ marginBottom: "1rem", width: "100%" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#4a5568" }}>Description</label>
                                    <textarea
                                        value={productForm.description}
                                        onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                                        rows="3"
                                        style={{ 
                                            width: "100%", 
                                            padding: "0.75rem", 
                                            borderRadius: "8px", 
                                            border: "2px solid #e2e8f0", 
                                            fontSize: "1rem", 
                                            fontFamily: "inherit", 
                                            background: "#fff", 
                                            color: "#2d3748",
                                            boxSizing: "border-box",
                                            resize: "vertical",
                                            minHeight: "80px"
                                        }}
                                    />
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem", width: "100%" }}>
                                    <div style={{ width: "100%" }}>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#4a5568" }}>Quantity *</label>
                                        <input
                                            type="number"
                                            required
                                            value={productForm.quantity}
                                            onChange={(e) => setProductForm({ ...productForm, quantity: e.target.value })}
                                            style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "2px solid #e2e8f0", fontSize: "1rem", background: "#fff", color: "#2d3748", boxSizing: "border-box" }}
                                        />
                                    </div>
                                    <div style={{ width: "100%" }}>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#4a5568" }}>Discount</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={productForm.discount}
                                            onChange={(e) => setProductForm({ ...productForm, discount: e.target.value })}
                                            style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "2px solid #e2e8f0", fontSize: "1rem", background: "#fff", color: "#2d3748", boxSizing: "border-box" }}
                                        />
                                    </div>
                                    <div style={{ width: "100%" }}>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#4a5568" }}>Category</label>
                                        <select
                                            value={productForm.categoryIds[0] || ""}
                                            onChange={(e) => setProductForm({ ...productForm, categoryIds: e.target.value ? [e.target.value] : [] })}
                                            style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "2px solid #e2e8f0", fontSize: "1rem", background: "#fff", color: "#2d3748", boxSizing: "border-box" }}
                                        >
                                            <option value="">Select Category</option>
                                            {Array.isArray(categories) && categories.length > 0 ? (
                                                categories.map(cat => (
                                                    <option key={cat.categoryId} value={cat.categoryId}>{cat.categoryName}</option>
                                                ))
                                            ) : (
                                                <option value="" disabled>No categories available</option>
                                            )}
                                        </select>
                                    </div>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem", width: "100%" }}>
                                    <div style={{ width: "100%" }}>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#4a5568" }}>Model</label>
                                        <input
                                            type="text"
                                            value={productForm.model}
                                            onChange={(e) => setProductForm({ ...productForm, model: e.target.value })}
                                            style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "2px solid #e2e8f0", fontSize: "1rem", background: "#fff", color: "#2d3748", boxSizing: "border-box" }}
                                        />
                                    </div>
                                    <div style={{ width: "100%" }}>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#4a5568" }}>Warranty Status</label>
                                        <input
                                            type="text"
                                            value={productForm.warrantyStatus}
                                            onChange={(e) => setProductForm({ ...productForm, warrantyStatus: e.target.value })}
                                            style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "2px solid #e2e8f0", fontSize: "1rem", background: "#fff", color: "#2d3748", boxSizing: "border-box" }}
                                        />
                                    </div>
                                </div>

                                <div style={{ marginBottom: "1rem", width: "100%" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#4a5568" }}>Image URL</label>
                                    <input
                                        type="url"
                                        value={productForm.images[0] || ""}
                                        onChange={(e) => setProductForm({ ...productForm, images: [e.target.value] })}
                                        placeholder="https://example.com/image.jpg"
                                        style={{ 
                                            width: "100%", 
                                            padding: "0.75rem", 
                                            borderRadius: "8px", 
                                            border: "2px solid #e2e8f0", 
                                            fontSize: "1rem", 
                                            background: "#fff", 
                                            color: "#2d3748",
                                            boxSizing: "border-box"
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
                                        borderRadius: "10px",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        fontSize: "1rem",
                                    }}
                                >
                                    Create Product
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Products List */}
                    <div>
                        <h2 style={{ marginBottom: "1.5rem", color: "#2d3748" }}>My Products ({Array.isArray(products) ? products.length : 0})</h2>
                        {!Array.isArray(products) || products.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "3rem", color: "#718096" }}>
                                No products yet. Create your first product!
                            </div>
                        ) : (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
                                {products.map((product) => (
                                    <div
                                        key={product.productId}
                                        style={{
                                            background: "#fff",
                                            padding: "1.5rem",
                                            borderRadius: "12px",
                                            border: "1px solid #e2e8f0",
                                            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                                        }}
                                    >
                                        <div style={{ marginBottom: "1rem" }}>
                                            {product.images && product.images.length > 0 && product.images[0] ? (
                                                <img
                                                    src={product.images[0]}
                                                    alt={product.productName}
                                                    style={{ width: "100%", height: "200px", objectFit: "cover", borderRadius: "8px" }}
                                                    onError={(e) => {
                                                        e.target.src = "https://via.placeholder.com/300x200?text=No+Image";
                                                    }}
                                                />
                                            ) : (
                                                <div style={{ width: "100%", height: "200px", background: "#f7fafc", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "#a0aec0" }}>
                                                    No Image
                                                </div>
                                            )}
                                        </div>
                                        <h3 style={{ fontSize: "1.2rem", fontWeight: 600, color: "#2d3748", marginBottom: "0.5rem" }}>
                                            {product.productName}
                                        </h3>
                                        <div style={{ marginBottom: "0.5rem", fontSize: "1.1rem", fontWeight: 700, color: "#667eea" }}>
                                            ${product.price?.toFixed(2)}
                                        </div>
                                        <div style={{ fontSize: "0.9rem", color: "#718096", marginBottom: "1rem" }}>
                                            Stock: {product.quantity || 0} | Popularity: {product.popularity || 0}
                                        </div>
                                        <button
                                            onClick={() => handleDeleteProduct(product.productId)}
                                            disabled={deleting[product.productId]}
                                            style={{
                                                width: "100%",
                                                padding: "0.75rem",
                                                background: deleting[product.productId] ? "#cbd5e0" : "#fed7d7",
                                                color: deleting[product.productId] ? "#718096" : "#c53030",
                                                border: "none",
                                                borderRadius: "8px",
                                                fontWeight: 600,
                                                cursor: deleting[product.productId] ? "not-allowed" : "pointer",
                                            }}
                                        >
                                            {deleting[product.productId] ? "Deleting..." : "Delete Product"}
                                        </button>
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

