import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import productApi from "../api/productApi";
import categoryApi from "../api/categoryApi";
import { useToast } from "../contexts/ToastContext";
import { useUserRole } from "../hooks/useUserRole";

export default function CreateProductPage() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
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

        const storedRole = localStorage.getItem("user_role");
        const currentRole = userRole || storedRole;

        if (currentRole === null || currentRole === undefined) {
            return;
        }

        if (currentRole !== "PRODUCT_MANAGER") {
            navigate("/owner/products");
            return;
        }

        const loadCategories = async () => {
            try {
                const categoriesRes = await categoryApi.getAllCategories();
                const categoriesData = categoriesRes?.data?.data || categoriesRes?.data || categoriesRes || [];
                setCategories(Array.isArray(categoriesData) ? categoriesData : []);
            } catch (error) {
                console.error("Error loading categories:", error);
                showError("Failed to load categories. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        loadCategories();
    }, [navigate, userRole, showError]);

    const handleCreateProduct = async (e) => {
        e.preventDefault();
        setSubmitting(true);
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

            await productApi.createProduct(productData);
            showSuccess("Product created successfully!");
            navigate("/owner/products");
        } catch (error) {
            console.error("Error creating product:", error);
            showError(error.response?.data?.message || "Failed to create product. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const storedRole = localStorage.getItem("user_role");
    const currentRole = userRole || storedRole;

    if (loading || (currentRole === null || currentRole === undefined)) {
        return (
            <div style={{ minHeight: "calc(100vh - 80px)", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                    <div style={{ width: "50px", height: "50px", border: "4px solid rgba(255, 255, 255, 0.3)", borderTop: "4px solid #fff", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                    <div style={{ color: "#fff", fontSize: "1rem" }}>Loading...</div>
                </div>
            </div>
        );
    }

    if (currentRole !== "PRODUCT_MANAGER") {
        return null;
    }

    return (
        <div style={{ minHeight: "calc(100vh - 80px)", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
            <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
                <div style={{ background: "rgba(255, 255, 255, 0.95)", padding: "2rem", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                        <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#2d3748" }}>Create New Product</h1>
                        <button
                            onClick={() => navigate("/owner/products")}
                            style={{
                                padding: "0.75rem 1.5rem",
                                background: "#fff",
                                color: "#667eea",
                                border: "2px solid #667eea",
                                borderRadius: "4px",
                                fontWeight: 600,
                                cursor: "pointer",
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
                            ← Back to Products
                        </button>
                    </div>

                    <style>
                        {`
                            .custom-select-dropdown::-webkit-scrollbar {
                                width: 8px;
                            }
                            .custom-select-dropdown::-webkit-scrollbar-track {
                                background: #f7fafc;
                                border-radius: 4px;
                            }
                            .custom-select-dropdown::-webkit-scrollbar-thumb {
                                background: #cbd5e0;
                                border-radius: 4px;
                            }
                            .custom-select-dropdown::-webkit-scrollbar-thumb:hover {
                                background: #667eea;
                            }
                            .custom-select-dropdown {
                                scrollbar-width: thin;
                                scrollbar-color: #cbd5e0 #f7fafc;
                            }
                            .custom-select-dropdown:hover {
                                scrollbar-color: #667eea #f7fafc;
                            }
                        `}
                    </style>

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
                                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#4a5568", fontSize: "0.85rem" }}>Categories</label>
                                <div style={{
                                    maxHeight: "150px",
                                    overflowY: "auto",
                                    border: "2px solid #e2e8f0",
                                    borderRadius: "8px",
                                    padding: "0.75rem",
                                    background: "#fff",
                                }}
                                className="custom-select-dropdown"
                                >
                                    {categories.length === 0 ? (
                                        <div style={{ color: "#718096", fontSize: "0.85rem", padding: "0.5rem" }}>
                                            No categories available
                                        </div>
                                    ) : (
                                        categories.map((category) => (
                                            <label
                                                key={category.categoryId}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "0.5rem",
                                                    padding: "0.5rem",
                                                    cursor: "pointer",
                                                    borderRadius: "4px",
                                                    transition: "background 0.2s",
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = "#f7fafc";
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = "transparent";
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={productForm.categoryIds.includes(category.categoryId)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setProductForm({
                                                                ...productForm,
                                                                categoryIds: [...productForm.categoryIds, category.categoryId]
                                                            });
                                                        } else {
                                                            setProductForm({
                                                                ...productForm,
                                                                categoryIds: productForm.categoryIds.filter(id => id !== category.categoryId)
                                                            });
                                                        }
                                                    }}
                                                    style={{
                                                        width: "1rem",
                                                        height: "1rem",
                                                        cursor: "pointer",
                                                        accentColor: "#667eea",
                                                    }}
                                                />
                                                <span style={{ fontSize: "0.85rem", color: "#2d3748" }}>
                                                    {category.categoryName}
                                                </span>
                                            </label>
                                        ))
                                    )}
                                </div>
                                {productForm.categoryIds.length > 0 && (
                                    <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#667eea" }}>
                                        {productForm.categoryIds.length} categor{productForm.categoryIds.length === 1 ? "y" : "ies"} selected
                                    </div>
                                )}
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

                        <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                            <button
                                type="button"
                                onClick={() => navigate("/owner/products")}
                                disabled={submitting}
                                style={{
                                    padding: "0.75rem 2rem",
                                    background: "#fff",
                                    color: "#667eea",
                                    border: "2px solid #667eea",
                                    borderRadius: "4px",
                                    fontWeight: 600,
                                    cursor: submitting ? "not-allowed" : "pointer",
                                    fontSize: "1rem",
                                    transition: "all 0.2s",
                                    opacity: submitting ? 0.6 : 1,
                                }}
                                onMouseEnter={(e) => {
                                    if (!submitting) {
                                        e.currentTarget.style.background = "#f7fafc";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!submitting) {
                                        e.currentTarget.style.background = "#fff";
                                    }
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                style={{
                                    padding: "0.75rem 2rem",
                                    background: submitting ? "#cbd5e0" : "#667eea",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "4px",
                                    fontWeight: 600,
                                    cursor: submitting ? "not-allowed" : "pointer",
                                    fontSize: "1rem",
                                    transition: "all 0.2s",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                }}
                                onMouseEnter={(e) => {
                                    if (!submitting) {
                                        e.currentTarget.style.background = "#764ba2";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!submitting) {
                                        e.currentTarget.style.background = "#667eea";
                                    }
                                }}
                            >
                                {submitting ? (
                                    <>
                                        <div style={{ width: "16px", height: "16px", border: "2px solid rgba(255, 255, 255, 0.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}></div>
                                        Creating...
                                    </>
                                ) : (
                                    "Create Product"
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

