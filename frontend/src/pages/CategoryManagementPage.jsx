import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import productApi from "../api/productApi";
import categoryApi from "../api/categoryApi";
import { useToast } from "../contexts/ToastContext";
import { useUserRole } from "../hooks/useUserRole";
import { formatProductForDisplay } from "../utils/productAdapter";

export default function CategoryManagementPage() {
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedProductIds, setSelectedProductIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [deletingCategory, setDeletingCategory] = useState({});
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryForm, setCategoryForm] = useState({
        categoryName: "",
        description: "",
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

        const loadData = async () => {
            try {
                setLoading(true);
                const [categoriesRes, productsRes] = await Promise.all([
                    categoryApi.getAllCategories(),
                    productApi.getMyProducts(),
                ]);

                const categoriesData = categoriesRes?.data?.data || categoriesRes?.data || categoriesRes || [];
                setCategories(Array.isArray(categoriesData) ? categoriesData : []);

                const productsData = productsRes?.data?.data || productsRes?.data || productsRes || [];
                const formattedProducts = Array.isArray(productsData) 
                    ? productsData.map(formatProductForDisplay)
                    : [];
                setProducts(formattedProducts);
                setFilteredProducts(formattedProducts);
            } catch (error) {
                console.error("Error loading data:", error);
                showError("Failed to load data. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [navigate, userRole, showError]);

    useEffect(() => {
        if (searchQuery.trim() === "") {
            setFilteredProducts(products);
        } else {
            const query = searchQuery.toLowerCase();
            const filtered = products.filter(product => 
                product.productName?.toLowerCase().includes(query) ||
                product.description?.toLowerCase().includes(query) ||
                product.model?.toLowerCase().includes(query)
            );
            setFilteredProducts(filtered);
        }
    }, [searchQuery, products]);

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        if (!categoryForm.categoryName.trim()) {
            showError("Category name is required");
            return;
        }

        setSubmitting(true);
        try {
            // Create category
            const categoryData = {
                categoryName: categoryForm.categoryName,
                description: categoryForm.description || null,
            };

            const categoryRes = await categoryApi.createCategory(categoryData);
            const createdCategory = categoryRes?.data?.data || categoryRes?.data || categoryRes;
            const categoryId = createdCategory?.categoryId;

            if (!categoryId) {
                throw new Error("Failed to get category ID after creation");
            }

            // Add selected products to category
            if (selectedProductIds.length > 0) {
                const updateResults = [];
                for (const productId of selectedProductIds) {
                    const product = products.find(p => p.productId === productId);
                    if (!product) {
                        console.warn(`Product ${productId} not found`);
                        continue;
                    }

                    // Get current categories and add new one
                    const currentCategoryIds = product.categoryIds || [];
                    if (!currentCategoryIds.includes(categoryId)) {
                        const updatedCategoryIds = [...currentCategoryIds, categoryId];
                        
                        // Update product with new categories
                        // Ensure proper data types for backend
                        const productUpdateData = {
                            productName: product.productName,
                            description: product.description,
                            price: typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0,
                            discount: typeof product.discount === 'number' ? product.discount : parseFloat(product.discount) || 0,
                            quantity: typeof product.quantity === 'number' ? product.quantity : parseInt(product.quantity) || 0,
                            model: product.model || null,
                            serialNumber: product.serialNumber || null,
                            warrantyStatus: product.warrantyStatus || null,
                            distributionInfo: product.distributionInfo || null,
                            categoryIds: updatedCategoryIds,
                            images: product.images || [],
                            inStock: (product.quantity || 0) > 0,
                            popularity: product.popularity || 0,
                        };

                        try {
                            console.log(`Updating product ${productId} with categories:`, updatedCategoryIds);
                            const response = await productApi.updateProduct(productId, productUpdateData);
                            console.log(`Successfully updated product ${productId}:`, response.data);
                            updateResults.push({ productId, success: true });
                        } catch (err) {
                            console.error(`Failed to update product ${productId}:`, err);
                            console.error(`Error details:`, err.response?.data || err.message);
                            updateResults.push({ productId, success: false, error: err.response?.data || err.message });
                        }
                    } else {
                        console.log(`Product ${productId} already has category ${categoryId}`);
                        updateResults.push({ productId, success: true, skipped: true });
                    }
                }

                const failedUpdates = updateResults.filter(r => !r.success);
                const addedCount = updateResults.filter(r => r.success && !r.skipped).length;
                
                if (failedUpdates.length > 0) {
                    console.error(`Failed to update ${failedUpdates.length} products:`, failedUpdates);
                    showError(`Category created but failed to add ${failedUpdates.length} product(s) to category. Please check console for details.`);
                } else if (addedCount > 0) {
                    showSuccess(`Category created and ${addedCount} product(s) added successfully!`);
                } else {
                    showSuccess("Category created successfully!");
                }
            } else {
                showSuccess("Category created successfully!");
            }

            // Reload categories
            const categoriesRes = await categoryApi.getAllCategories();
            const categoriesData = categoriesRes?.data?.data || categoriesRes?.data || categoriesRes || [];
            setCategories(Array.isArray(categoriesData) ? categoriesData : []);
            
            // Reset form
            setCategoryForm({ categoryName: "", description: "" });
            setSelectedProductIds([]);
            setShowCreateForm(false);
        } catch (error) {
            console.error("Error creating category:", error);
            showError(error.response?.data?.message || "Failed to create category. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteCategory = async (categoryId) => {
        if (!window.confirm("Are you sure you want to delete this category?")) {
            return;
        }

        setDeletingCategory({ ...deletingCategory, [categoryId]: true });
        try {
            await categoryApi.deleteCategory(categoryId);
            showSuccess("Category deleted successfully!");
            setCategories(categories.filter(c => c.categoryId !== categoryId));
        } catch (error) {
            console.error("Error deleting category:", error);
            showError(error.response?.data?.message || "Failed to delete category. Please try again.");
        } finally {
            setDeletingCategory({ ...deletingCategory, [categoryId]: false });
        }
    };

    const toggleProductSelection = (productId) => {
        if (selectedProductIds.includes(productId)) {
            setSelectedProductIds(selectedProductIds.filter(id => id !== productId));
        } else {
            setSelectedProductIds([...selectedProductIds, productId]);
        }
    };

    const storedRole = localStorage.getItem("user_role");
    const currentRole = userRole || storedRole;

    if (currentRole === null || currentRole === undefined) {
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
            <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
                <div style={{ background: "rgba(255, 255, 255, 0.95)", padding: "2rem", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                        <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#2d3748" }}>Category Management</h1>
                        <div style={{ display: "flex", gap: "1rem" }}>
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
                            <button
                                onClick={() => {
                                    setShowCreateForm(!showCreateForm);
                                    if (showCreateForm) {
                                        setCategoryForm({ categoryName: "", description: "" });
                                        setSelectedProductIds([]);
                                    }
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
                                {showCreateForm ? "Cancel" : "+ Create Category"}
                            </button>
                        </div>
                    </div>

                    {/* Create Category Form */}
                    {showCreateForm && (
                        <div style={{ marginBottom: "2rem", padding: "2rem", background: "#f7fafc", borderRadius: "4px", border: "2px solid #e2e8f0" }}>
                            <h2 style={{ marginBottom: "1.5rem", color: "#2d3748", fontSize: "1.25rem" }}>Create New Category</h2>
                            
                            <form onSubmit={handleCreateCategory}>
                                <div style={{ marginBottom: "2rem" }}>
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
                                </div>

                                <div style={{ marginBottom: "2rem" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                                        <h3 style={{ color: "#2d3748", fontSize: "1.1rem", fontWeight: 600 }}>Add Products to Category (Optional)</h3>
                                        {selectedProductIds.length > 0 && (
                                            <div style={{ fontSize: "0.9rem", color: "#667eea", fontWeight: 600 }}>
                                                {selectedProductIds.length} product{selectedProductIds.length === 1 ? "" : "s"} selected
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ marginBottom: "1rem" }}>
                                        <input
                                            type="text"
                                            placeholder="Search products by name, description, or model..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            style={{
                                                width: "100%",
                                                padding: "0.75rem",
                                                borderRadius: "8px",
                                                border: "2px solid #e2e8f0",
                                                fontSize: "0.9rem",
                                                background: "#fff",
                                                color: "#2d3748",
                                                boxSizing: "border-box",
                                            }}
                                            onFocus={(e) => {
                                                e.currentTarget.style.borderColor = "#667eea";
                                            }}
                                            onBlur={(e) => {
                                                e.currentTarget.style.borderColor = "#e2e8f0";
                                            }}
                                        />
                                    </div>

                                    {loading ? (
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem", minHeight: "400px" }}>
                                            <div style={{ width: "50px", height: "50px", border: "4px solid rgba(102, 126, 234, 0.3)", borderTop: "4px solid #667eea", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
                                            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                                            <div style={{ marginTop: "1rem", color: "#718096", fontSize: "1rem" }}>Loading products...</div>
                                        </div>
                                    ) : (
                                        <div style={{
                                            maxHeight: "500px",
                                            overflowY: "auto",
                                            border: "2px solid #e2e8f0",
                                            borderRadius: "8px",
                                            padding: "1rem",
                                            background: "#fff",
                                        }}
                                        className="custom-select-dropdown"
                                        >
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
                                                    .product-checkbox {
                                                        width: 1.25rem;
                                                        height: 1.25rem;
                                                        cursor: pointer;
                                                        accent-color: #667eea;
                                                        -webkit-appearance: none;
                                                        -moz-appearance: none;
                                                        appearance: none;
                                                        border: 2px solid #cbd5e0;
                                                        border-radius: 4px;
                                                        background: #fff;
                                                        position: relative;
                                                        transition: all 0.2s;
                                                    }
                                                    .product-checkbox:checked {
                                                        background: #667eea;
                                                        border-color: #667eea;
                                                    }
                                                    .product-checkbox:checked::after {
                                                        content: '✓';
                                                        position: absolute;
                                                        top: 50%;
                                                        left: 50%;
                                                        transform: translate(-50%, -50%);
                                                        color: #fff;
                                                        font-size: 0.875rem;
                                                        font-weight: 700;
                                                    }
                                                    .product-checkbox:hover {
                                                        border-color: #667eea;
                                                    }
                                                `}
                                            </style>
                                            {filteredProducts.length === 0 ? (
                                                <div style={{ textAlign: "center", padding: "3rem", color: "#718096" }}>
                                                    {searchQuery ? "No products found matching your search." : "No products available."}
                                                </div>
                                            ) : (
                                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
                                                    {filteredProducts.map((product) => (
                                                        <div
                                                            key={product.productId}
                                                            onClick={() => toggleProductSelection(product.productId)}
                                                            style={{
                                                                padding: "1rem",
                                                                background: selectedProductIds.includes(product.productId) ? "#f0f4ff" : "#fff",
                                                                border: selectedProductIds.includes(product.productId) ? "2px solid #667eea" : "1px solid #e2e8f0",
                                                                borderRadius: "8px",
                                                                cursor: "pointer",
                                                                transition: "all 0.2s",
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                if (!selectedProductIds.includes(product.productId)) {
                                                                    e.currentTarget.style.background = "#f7fafc";
                                                                    e.currentTarget.style.borderColor = "#cbd5e0";
                                                                }
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                if (!selectedProductIds.includes(product.productId)) {
                                                                    e.currentTarget.style.background = "#fff";
                                                                    e.currentTarget.style.borderColor = "#e2e8f0";
                                                                }
                                                            }}
                                                        >
                                                            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                                                                <input
                                                                    type="checkbox"
                                                                    className="product-checkbox"
                                                                    checked={selectedProductIds.includes(product.productId)}
                                                                    onChange={() => toggleProductSelection(product.productId)}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    style={{
                                                                        marginTop: "0.25rem",
                                                                    }}
                                                                />
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <h3 style={{ 
                                                                        fontSize: "0.95rem", 
                                                                        fontWeight: 600, 
                                                                        color: "#2d3748", 
                                                                        marginBottom: "0.25rem",
                                                                        overflow: "hidden",
                                                                        textOverflow: "ellipsis",
                                                                        whiteSpace: "nowrap"
                                                                    }}>
                                                                        {product.productName}
                                                                    </h3>
                                                                    <div style={{ fontSize: "0.85rem", color: "#667eea", fontWeight: 600, marginBottom: "0.25rem" }}>
                                                                        ${product.finalPrice?.toFixed(2) || product.price?.toFixed(2)}
                                                                    </div>
                                                                    <div style={{ fontSize: "0.75rem", color: "#718096" }}>
                                                                        Stock: {product.quantity || 0}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowCreateForm(false);
                                            setCategoryForm({ categoryName: "", description: "" });
                                            setSelectedProductIds([]);
                                        }}
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
                                            "Create Category"
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Categories List */}
                    {loading ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem", minHeight: "400px" }}>
                            <div style={{ width: "50px", height: "50px", border: "4px solid rgba(102, 126, 234, 0.3)", borderTop: "4px solid #667eea", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
                            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                            <div style={{ marginTop: "1rem", color: "#718096", fontSize: "1rem" }}>Loading categories...</div>
                        </div>
                    ) : (
                        <div style={{ padding: "2rem", background: "#f7fafc", borderRadius: "4px", border: "2px solid #e2e8f0" }}>
                            <h2 style={{ marginBottom: "1.5rem", color: "#2d3748", fontSize: "1.25rem" }}>Categories ({categories.length})</h2>
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
                                                gap: "1rem",
                                                minWidth: 0,
                                            }}
                                        >
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ 
                                                    fontWeight: 600, 
                                                    color: "#2d3748", 
                                                    fontSize: "0.9rem", 
                                                    marginBottom: "0.25rem",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap"
                                                }}>
                                                    {category.categoryName}
                                                </div>
                                                {category.description && (
                                                    <div style={{ 
                                                        fontSize: "0.85rem", 
                                                        color: "#718096",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        whiteSpace: "nowrap"
                                                    }}>
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
                                                    flexShrink: 0,
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
                    )}
                </div>
            </div>
        </div>
    );
}

