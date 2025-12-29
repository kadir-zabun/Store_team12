import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import productApi from "../api/productApi";
import categoryApi from "../api/categoryApi";
import { useToast } from "../contexts/ToastContext";
import { useUserRole } from "../hooks/useUserRole";
import CustomSelect from "../components/CustomSelect";

export default function ProductManagementPage() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showCreateCategoryForm, setShowCreateCategoryForm] = useState(false);
    const [deleting, setDeleting] = useState({});
    const [deletingCategory, setDeletingCategory] = useState({});
    const [categoryForm, setCategoryForm] = useState({
        categoryName: "",
        description: "",
    });
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

        if (currentRole !== "PRODUCT_MANAGER") {
            navigate("/");
            return;
        }

        const loadData = async () => {
            try {
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

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        try {
            const categoryData = {
                categoryName: categoryForm.categoryName,
                description: categoryForm.description || null,
            };

            await categoryApi.createCategory(categoryData);
            showSuccess("Category created successfully!");
            
            // Reload categories
            const categoriesRes = await categoryApi.getAllCategories();
            const categoriesData = categoriesRes?.data?.data || categoriesRes?.data || categoriesRes || [];
            setCategories(Array.isArray(categoriesData) ? categoriesData : []);
            
            setCategoryForm({ categoryName: "", description: "" });
            setShowCreateCategoryForm(false);
        } catch (error) {
            console.error("Error creating category:", error);
            showError(error.response?.data?.message || "Failed to create category. Please try again.");
        }
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

    // If not PRODUCT_MANAGER, show message (will redirect in useEffect)
    if (currentRole !== "PRODUCT_MANAGER") {
        return (
            <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ background: "rgba(255, 255, 255, 0.95)", padding: "2rem", borderRadius: "8px", textAlign: "center" }}>
                    <h2 style={{ color: "#2d3748" }}>Access Denied</h2>
                    <p style={{ color: "#718096" }}>This page is only accessible to Product Managers.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: "calc(100vh - 80px)", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
            <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
                <div style={{ background: "rgba(255, 255, 255, 0.95)", padding: "2rem", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                        <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#2d3748" }}>Product Management</h1>
                        <div style={{ display: "flex", gap: "1rem" }}>
                            <button
                                onClick={() => {
                                    setShowCreateCategoryForm(!showCreateCategoryForm);
                                    setShowCreateForm(false);
                                }}
                                style={{
                                    padding: "0.75rem 1.5rem",
                                    background: showCreateCategoryForm ? "#667eea" : "#fff",
                                    color: showCreateCategoryForm ? "#fff" : "#667eea",
                                    border: "2px solid #667eea",
                                    borderRadius: "4px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                }}
                                onMouseEnter={(e) => {
                                    if (!showCreateCategoryForm) {
                                        e.currentTarget.style.background = "#667eea";
                                        e.currentTarget.style.color = "#fff";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!showCreateCategoryForm) {
                                        e.currentTarget.style.background = "#fff";
                                        e.currentTarget.style.color = "#667eea";
                                    }
                                }}
                            >
                                {showCreateCategoryForm ? "Cancel" : "+ Create Category"}
                            </button>
                            <button
                                onClick={() => {
                                    setShowCreateForm(!showCreateForm);
                                    setShowCreateCategoryForm(false);
                                }}
                                style={{
                                    padding: "0.75rem 1.5rem",
                                    background: showCreateForm ? "#667eea" : "#fff",
                                    color: showCreateForm ? "#fff" : "#667eea",
                                    border: "2px solid #667eea",
                                    borderRadius: "4px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                }}
                                onMouseEnter={(e) => {
                                    if (!showCreateForm) {
                                        e.currentTarget.style.background = "#667eea";
                                        e.currentTarget.style.color = "#fff";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!showCreateForm) {
                                        e.currentTarget.style.background = "#fff";
                                        e.currentTarget.style.color = "#667eea";
                                    }
                                }}
                            >
                                {showCreateForm ? "Cancel" : "+ Create Product"}
                            </button>
                        </div>
                    </div>

                    {/* Create Category Form */}
                    {showCreateCategoryForm && (
                        <div style={{ marginBottom: "2rem", padding: "2rem", background: "#f7fafc", borderRadius: "4px", border: "2px solid #e2e8f0" }}>
                            <h2 style={{ marginBottom: "1.5rem", color: "#2d3748", fontSize: "1.25rem" }}>Create New Category</h2>
                            <form onSubmit={handleCreateCategory}>
                                <div style={{ marginBottom: "1rem", width: "100%" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#4a5568", fontSize: "0.85rem" }}>Category Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={categoryForm.categoryName}
                                        onChange={(e) => setCategoryForm({ ...categoryForm, categoryName: e.target.value })}
                                        placeholder="Enter category name"
                                        style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", border: "2px solid #e2e8f0", fontSize: "1rem", background: "#fff", color: "#2d3748", boxSizing: "border-box" }}
                                    />
                                </div>
                                <div style={{ marginBottom: "1rem", width: "100%" }}>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#4a5568", fontSize: "0.85rem" }}>Description</label>
                                    <textarea
                                        value={categoryForm.description}
                                        onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                                        placeholder="Enter category description (optional)"
                                        rows={4}
                                        style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "2px solid #e2e8f0", fontSize: "1rem", background: "#fff", color: "#2d3748", boxSizing: "border-box", resize: "vertical" }}
                                    />
                                </div>
                                <div style={{ display: "flex", gap: "1rem" }}>
                                    <button
                                        type="submit"
                                        style={{
                                            padding: "0.75rem 2rem",
                                            background: "#fff",
                                            color: "#667eea",
                                            border: "2px solid #667eea",
                                            borderRadius: "4px",
                                            fontWeight: 600,
                                            cursor: "pointer",
                                            fontSize: "0.85rem",
                                            transition: "all 0.2s",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = "#667eea";
                                            e.currentTarget.style.color = "#fff";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = "#fff";
                                            e.currentTarget.style.color = "#667eea";
                                        }}
                                    >
                                        Create Category
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowCreateCategoryForm(false);
                                            setCategoryForm({ categoryName: "", description: "" });
                                        }}
                                        style={{
                                            padding: "0.75rem 2rem",
                                            background: "#e2e8f0",
                                            color: "#4a5568",
                                            border: "none",
                                            borderRadius: "4px",
                                            fontWeight: 600,
                                            cursor: "pointer",
                                            fontSize: "0.85rem",
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Categories List */}
                    <div style={{ marginBottom: "2rem", padding: "2rem", background: "#f7fafc", borderRadius: "4px", border: "2px solid #e2e8f0" }}>
                        <h2 style={{ marginBottom: "1.5rem", color: "#2d3748", fontSize: "1.25rem" }}>Categories</h2>
                        {categories.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "2rem", color: "#718096" }}>No categories found.</div>
                        ) : (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1rem" }}>
                                {categories.map((category) => (
                                    <div
                                        key={category.categoryId}
                                        style={{
                                            padding: "1rem",
                                            background: "#fff",
                                            borderRadius: "4px",
                                            border: "1px solid #e2e8f0",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontWeight: 600, color: "#2d3748", fontSize: "0.9rem", marginBottom: "0.25rem" }}>
                                                {category.categoryName}
                                            </div>
                                            {category.description && (
                                                <div style={{ fontSize: "0.85rem", color: "#718096" }}>
                                                    {category.description}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleDeleteCategory(category.categoryId)}
                                            disabled={deletingCategory[category.categoryId]}
                                            style={{
                                                padding: "0.5rem 1rem",
                                                background: "#e53e3e",
                                                color: "#fff",
                                                border: "none",
                                                borderRadius: "4px",
                                                fontSize: "0.85rem",
                                                cursor: deletingCategory[category.categoryId] ? "not-allowed" : "pointer",
                                                transition: "all 0.2s",
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!deletingCategory[category.categoryId]) {
                                                    e.currentTarget.style.background = "#c53030";
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!deletingCategory[category.categoryId]) {
                                                    e.currentTarget.style.background = "#e53e3e";
                                                }
                                            }}
                                        >
                                            {deletingCategory[category.categoryId] ? "Deleting..." : "Delete"}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Create Product Form */}
                    {showCreateForm && (
                        <div style={{ marginBottom: "2rem", padding: "2rem", background: "#f7fafc", borderRadius: "4px", border: "2px solid #e2e8f0" }}>
                            <h2 style={{ marginBottom: "1.5rem", color: "#2d3748", fontSize: "1.25rem" }}>Create New Product</h2>
                            <form onSubmit={handleCreateProduct}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem", width: "100%" }}>
                                    <div style={{ width: "100%" }}>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#4a5568", fontSize: "0.85rem" }}>Product Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={productForm.productName}
                                            onChange={(e) => setProductForm({ ...productForm, productName: e.target.value })}
                                            style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", border: "2px solid #e2e8f0", fontSize: "1rem", background: "#fff", color: "#2d3748", boxSizing: "border-box" }}
                                        />
                                    </div>
                                    <div style={{ width: "100%" }}>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#4a5568", fontSize: "0.85rem" }}>Price *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            value={productForm.price}
                                            onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                                            style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", border: "2px solid #e2e8f0", fontSize: "1rem", background: "#fff", color: "#2d3748", boxSizing: "border-box" }}
                                        />
                                    </div>
                                </div>

                                <div style={{ marginBottom: "1rem", width: "100%" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#4a5568", fontSize: "0.85rem" }}>Description *</label>
                                    <textarea
                                        required
                                        value={productForm.description}
                                        onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                                        rows="3"
                                        placeholder="Enter product description"
                                        style={{ 
                                            width: "100%", 
                                            padding: "0.75rem", 
                                            borderRadius: "8px", 
                                            border: "2px solid #e2e8f0", 
                                            fontSize: "0.85rem", 
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
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#4a5568", fontSize: "0.85rem" }}>Quantity *</label>
                                        <input
                                            type="number"
                                            required
                                            value={productForm.quantity}
                                            onChange={(e) => setProductForm({ ...productForm, quantity: e.target.value })}
                                            style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", border: "2px solid #e2e8f0", fontSize: "1rem", background: "#fff", color: "#2d3748", boxSizing: "border-box" }}
                                        />
                                    </div>
                                    <div style={{ width: "100%" }}>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#4a5568", fontSize: "0.85rem" }}>Discount</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={productForm.discount}
                                            onChange={(e) => setProductForm({ ...productForm, discount: e.target.value })}
                                            style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", border: "2px solid #e2e8f0", fontSize: "1rem", background: "#fff", color: "#2d3748", boxSizing: "border-box" }}
                                        />
                                    </div>
                                    <div style={{ width: "100%" }}>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#4a5568", fontSize: "0.85rem" }}>Category</label>
                                        <CustomSelect
                                            value={productForm.categoryIds[0] || ""}
                                            onChange={(e) => setProductForm({ ...productForm, categoryIds: e.target.value ? [e.target.value] : [] })}
                                            options={[
                                                { value: "", label: "Select Category" },
                                                ...(Array.isArray(categories) && categories.length > 0
                                                    ? categories.map(cat => ({ value: cat.categoryId, label: cat.categoryName }))
                                                    : [{ value: "", label: "No categories available", disabled: true }])
                                            ]}
                                            placeholder="Select Category"
                                        />
                                    </div>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem", width: "100%" }}>
                                    <div style={{ width: "100%" }}>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#4a5568", fontSize: "0.85rem" }}>Model *</label>
                                        <input
                                            type="text"
                                            required
                                            value={productForm.model}
                                            onChange={(e) => setProductForm({ ...productForm, model: e.target.value })}
                                            placeholder="Enter product model"
                                            style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", border: "2px solid #e2e8f0", fontSize: "1rem", background: "#fff", color: "#2d3748", boxSizing: "border-box" }}
                                        />
                                    </div>
                                    <div style={{ width: "100%" }}>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#4a5568", fontSize: "0.85rem" }}>Serial Number *</label>
                                        <input
                                            type="text"
                                            required
                                            value={productForm.serialNumber}
                                            onChange={(e) => setProductForm({ ...productForm, serialNumber: e.target.value })}
                                            placeholder="Enter serial number"
                                            style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", border: "2px solid #e2e8f0", fontSize: "1rem", background: "#fff", color: "#2d3748", boxSizing: "border-box" }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem", width: "100%" }}>
                                    <div style={{ width: "100%" }}>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#4a5568", fontSize: "0.85rem" }}>Warranty Status *</label>
                                        <input
                                            type="text"
                                            required
                                            value={productForm.warrantyStatus}
                                            onChange={(e) => setProductForm({ ...productForm, warrantyStatus: e.target.value })}
                                            placeholder="Enter warranty status"
                                            style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", border: "2px solid #e2e8f0", fontSize: "1rem", background: "#fff", color: "#2d3748", boxSizing: "border-box" }}
                                        />
                                    </div>
                                    <div style={{ width: "100%" }}>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#4a5568", fontSize: "0.85rem" }}>Distributor Information *</label>
                                        <input
                                            type="text"
                                            required
                                            value={productForm.distributionInfo}
                                            onChange={(e) => setProductForm({ ...productForm, distributionInfo: e.target.value })}
                                            placeholder="Enter distributor information"
                                            style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", border: "2px solid #e2e8f0", fontSize: "1rem", background: "#fff", color: "#2d3748", boxSizing: "border-box" }}
                                        />
                                    </div>
                                </div>

                                <div style={{ marginBottom: "1rem", width: "100%" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#4a5568", fontSize: "0.85rem" }}>Image URL</label>
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
                                            fontSize: "0.85rem", 
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
                                        background: "#fff",
                                        color: "#667eea",
                                        border: "2px solid #667eea",
                                        borderRadius: "4px",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        fontSize: "1rem",
                                        transition: "all 0.2s",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = "#667eea";
                                        e.currentTarget.style.color = "#fff";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = "#fff";
                                        e.currentTarget.style.color = "#667eea";
                                    }}
                                >
                                    Create Product
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Products List */}
                    <div>
                        <h2 style={{ marginBottom: "1.5rem", color: "#2d3748", fontSize: "1.25rem" }}>My Products ({Array.isArray(products) ? products.length : 0})</h2>
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

