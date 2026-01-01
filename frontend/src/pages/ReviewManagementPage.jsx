import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import productApi from "../api/productApi";
import { useToast } from "../contexts/ToastContext";
import { useUserRole } from "../hooks/useUserRole";
import CustomSelect from "../components/CustomSelect";

export default function ReviewManagementPage() {
    // Load filters from localStorage on mount
    const loadFiltersFromStorage = () => {
        try {
            const savedSearchQuery = localStorage.getItem("reviewManagement_searchQuery") || "";
            const savedReviewFilter = localStorage.getItem("reviewManagement_reviewFilter") || "";
            const savedAppliedFilter = localStorage.getItem("reviewManagement_appliedFilter") || "";
            return {
                searchQuery: savedSearchQuery,
                reviewFilter: savedReviewFilter,
                appliedFilter: savedAppliedFilter
            };
        } catch (error) {
            console.error("Error loading filters from storage:", error);
            return { searchQuery: "", reviewFilter: "", appliedFilter: "" };
        }
    };

    const savedFilters = loadFiltersFromStorage();
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [productSearchQuery, setProductSearchQuery] = useState(savedFilters.searchQuery);
    const [reviewFilter, setReviewFilter] = useState(savedFilters.reviewFilter);
    const [appliedReviewFilter, setAppliedReviewFilter] = useState(savedFilters.appliedFilter);
    const [loading, setLoading] = useState(true);
    const [productsWithReviewInfo, setProductsWithReviewInfo] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const productsPerPage = 10;
    const navigate = useNavigate();
    const { error: showError } = useToast();
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

        loadData();
    }, [navigate, userRole]);

    const loadData = async () => {
        try {
            setLoading(true);
            // Load products
            const productsRes = await productApi.getMyProducts();
            // Backend returns {success: true, data: [...], meta: {...}} or direct array
            const productsData = productsRes.data?.data || productsRes.data || productsRes || [];
            const productsArray = Array.isArray(productsData) ? productsData : [];
            setProducts(productsArray);

            // Load review info for each product
            const reviewInfoMap = {};
            for (const product of productsArray) {
                try {
                    const reviewsRes = await productApi.getProductReviews(product.productId);
                    const reviewsData = reviewsRes.data?.data || reviewsRes.data || [];
                    const reviewsArray = Array.isArray(reviewsData) ? reviewsData : [];
                    
                    const pendingCount = reviewsArray.filter(r => 
                        r.approved === false && r.comment && r.comment.trim() !== ""
                    ).length;
                    const approvedCount = reviewsArray.filter(r => r.approved === true).length;
                    const rejectedCount = reviewsArray.filter(r => 
                        r.approved === false && (!r.comment || r.comment.trim() === "")
                    ).length;
                    const totalCount = reviewsArray.length;

                    reviewInfoMap[product.productId] = {
                        pending: pendingCount,
                        approved: approvedCount,
                        rejected: rejectedCount,
                        total: totalCount,
                        hasPending: pendingCount > 0
                    };
                } catch (error) {
                    console.error(`Error loading reviews for product ${product.productId}:`, error);
                    reviewInfoMap[product.productId] = {
                        pending: 0,
                        approved: 0,
                        rejected: 0,
                        total: 0,
                        hasPending: false
                    };
                }
            }
            setProductsWithReviewInfo(reviewInfoMap);
        } catch (error) {
            console.error("Error loading data:", error);
            showError(error.response?.data?.message || "Failed to load data. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Save filters to localStorage whenever they change
    useEffect(() => {
        try {
            localStorage.setItem("reviewManagement_searchQuery", productSearchQuery);
        } catch (error) {
            console.error("Error saving search query to storage:", error);
        }
    }, [productSearchQuery]);

    useEffect(() => {
        try {
            localStorage.setItem("reviewManagement_reviewFilter", reviewFilter);
        } catch (error) {
            console.error("Error saving review filter to storage:", error);
        }
    }, [reviewFilter]);

    useEffect(() => {
        try {
            localStorage.setItem("reviewManagement_appliedFilter", appliedReviewFilter);
        } catch (error) {
            console.error("Error saving applied filter to storage:", error);
        }
    }, [appliedReviewFilter]);

    // Filter products by search query and review filter
    useEffect(() => {
        let filtered = [...products];

        // Apply search filter
        if (productSearchQuery.trim()) {
            filtered = filtered.filter((product) =>
                product.productName?.toLowerCase().includes(productSearchQuery.toLowerCase())
            );
        }

        // Apply review filter
        if (appliedReviewFilter) {
            filtered = filtered.filter((product) => {
                const reviewInfo = productsWithReviewInfo[product.productId] || {
                    pending: 0,
                    approved: 0,
                    rejected: 0,
                    total: 0,
                    hasPending: false
                };

                if (appliedReviewFilter === "HAS_PENDING") {
                    return reviewInfo.hasPending;
                } else if (appliedReviewFilter === "HAS_REVIEWS") {
                    return reviewInfo.total > 0;
                } else if (appliedReviewFilter === "NO_REVIEWS") {
                    return reviewInfo.total === 0;
                }
                return true;
            });
        }

        setFilteredProducts(filtered);
        // Reset to first page when filters change
        setCurrentPage(1);
    }, [productSearchQuery, appliedReviewFilter, products, productsWithReviewInfo]);

    const handleApplyFilters = () => {
        setAppliedReviewFilter(reviewFilter);
        setCurrentPage(1);
    };

    const handleProductClick = (productId) => {
        navigate(`/owner/reviews/${productId}`);
    };

    // Check role from localStorage directly if hook hasn't loaded yet
    const storedRole = localStorage.getItem("user_role");
    const currentRole = userRole || storedRole;

    // If not PRODUCT_MANAGER, show message (will redirect in useEffect)
    if (currentRole !== "PRODUCT_MANAGER" && currentRole !== null && currentRole !== undefined) {
        return (
            <div style={{ minHeight: "calc(100vh - 80px)", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ background: "rgba(255, 255, 255, 0.95)", padding: "2rem", borderRadius: "20px", textAlign: "center" }}>
                    <h2 style={{ color: "#2d3748" }}>Access Denied</h2>
                    <p style={{ color: "#718096" }}>This page is only accessible to Product Managers.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: "calc(100vh - 80px)", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
            <style>
                {`
                    .product-scrollable::-webkit-scrollbar {
                        width: 8px;
                    }
                    .product-scrollable::-webkit-scrollbar-track {
                        background: #f7fafc;
                        border-radius: 4px;
                    }
                    .product-scrollable::-webkit-scrollbar-thumb {
                        background: #cbd5e0;
                        border-radius: 4px;
                    }
                    .product-scrollable::-webkit-scrollbar-thumb:hover {
                        background: #667eea;
                    }
                    .product-scrollable {
                        scrollbar-width: thin;
                        scrollbar-color: #cbd5e0 #f7fafc;
                    }
                    .product-scrollable:hover {
                        scrollbar-color: #667eea #f7fafc;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}
            </style>
            <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
                <div style={{ background: "rgba(255, 255, 255, 0.95)", padding: "2rem", borderRadius: "20px", boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)" }}>
                    <h1 style={{ fontSize: "2.5rem", fontWeight: 700, color: "#2d3748", marginBottom: "2rem" }}>Review Management</h1>

                    {/* Search and Filter Section */}
                    <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" }}>
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={productSearchQuery}
                            onChange={(e) => setProductSearchQuery(e.target.value)}
                            style={{
                                flex: 1,
                                minWidth: "250px",
                                padding: "0.75rem",
                                border: "2px solid #e2e8f0",
                                borderRadius: "8px",
                                fontSize: "0.9rem",
                                boxSizing: "border-box",
                                background: "#fff",
                                color: "#2d3748",
                            }}
                        />
                        <CustomSelect
                            value={reviewFilter}
                            onChange={(e) => setReviewFilter(e.target.value)}
                            options={[
                                { value: "", label: "All Products" },
                                { value: "HAS_PENDING", label: "Has Pending Reviews" },
                                { value: "HAS_REVIEWS", label: "Has Reviews" },
                                { value: "NO_REVIEWS", label: "No Reviews" }
                            ]}
                            placeholder="Filter by Reviews"
                            minWidth="200px"
                        />
                        <button
                            onClick={handleApplyFilters}
                            style={{
                                padding: "0.75rem 1.5rem",
                                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                color: "#fff",
                                border: "none",
                                borderRadius: "8px",
                                fontWeight: 600,
                                cursor: "pointer",
                                fontSize: "0.9rem",
                                transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = "0 4px 8px rgba(102, 126, 234, 0.4)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = "none";
                            }}
                        >
                            Apply Filter
                        </button>
                    </div>

                    {/* Product List */}
                    {loading || (currentRole === null || currentRole === undefined) ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem", minHeight: "400px" }}>
                            <div style={{ width: "50px", height: "50px", border: "4px solid rgba(102, 126, 234, 0.3)", borderTop: "4px solid #667eea", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
                            <div style={{ marginTop: "1rem", color: "#718096", fontSize: "1rem" }}>Loading products...</div>
                        </div>
                    ) : !Array.isArray(filteredProducts) || filteredProducts.length === 0 ? (
                        <div style={{ padding: "2rem", textAlign: "center", color: "#718096" }}>
                            {productSearchQuery || appliedReviewFilter ? "No products found matching the filters." : "No products yet. Create products first."}
                        </div>
                    ) : (
                        <>
                            {/* Pagination Info */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid #e2e8f0" }}>
                                <div style={{ color: "#4a5568", fontSize: "0.9rem" }}>
                                    {(() => {
                                        const startIndex = (currentPage - 1) * productsPerPage + 1;
                                        const endIndex = Math.min(currentPage * productsPerPage, filteredProducts.length);
                                        return `${startIndex}–${endIndex} of ${filteredProducts.length}`;
                                    })()}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        style={{
                                            padding: "0.5rem",
                                            background: currentPage === 1 ? "#e2e8f0" : "#fff",
                                            color: currentPage === 1 ? "#a0aec0" : "#4a5568",
                                            border: "1px solid #e2e8f0",
                                            borderRadius: "4px",
                                            cursor: currentPage === 1 ? "not-allowed" : "pointer",
                                            fontSize: "1rem",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            transition: "all 0.2s",
                                        }}
                                        onMouseEnter={(e) => {
                                            if (currentPage !== 1) {
                                                e.currentTarget.style.background = "#f7fafc";
                                                e.currentTarget.style.borderColor = "#cbd5e0";
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (currentPage !== 1) {
                                                e.currentTarget.style.background = "#fff";
                                                e.currentTarget.style.borderColor = "#e2e8f0";
                                            }
                                        }}
                                    >
                                        ‹
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredProducts.length / productsPerPage), prev + 1))}
                                        disabled={currentPage >= Math.ceil(filteredProducts.length / productsPerPage)}
                                        style={{
                                            padding: "0.5rem",
                                            background: currentPage >= Math.ceil(filteredProducts.length / productsPerPage) ? "#e2e8f0" : "#fff",
                                            color: currentPage >= Math.ceil(filteredProducts.length / productsPerPage) ? "#a0aec0" : "#4a5568",
                                            border: "1px solid #e2e8f0",
                                            borderRadius: "4px",
                                            cursor: currentPage >= Math.ceil(filteredProducts.length / productsPerPage) ? "not-allowed" : "pointer",
                                            fontSize: "1rem",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            transition: "all 0.2s",
                                        }}
                                        onMouseEnter={(e) => {
                                            if (currentPage < Math.ceil(filteredProducts.length / productsPerPage)) {
                                                e.currentTarget.style.background = "#f7fafc";
                                                e.currentTarget.style.borderColor = "#cbd5e0";
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (currentPage < Math.ceil(filteredProducts.length / productsPerPage)) {
                                                e.currentTarget.style.background = "#fff";
                                                e.currentTarget.style.borderColor = "#e2e8f0";
                                            }
                                        }}
                                    >
                                        ›
                                    </button>
                                </div>
                            </div>

                            <div className="product-scrollable" style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "600px", overflowY: "auto" }}>
                                {filteredProducts.slice((currentPage - 1) * productsPerPage, currentPage * productsPerPage).map((product) => {
                                const reviewInfo = productsWithReviewInfo[product.productId] || {
                                    pending: 0,
                                    approved: 0,
                                    rejected: 0,
                                    total: 0,
                                    hasPending: false
                                };

                                return (
                                    <div
                                        key={product.productId}
                                        onClick={() => handleProductClick(product.productId)}
                                        style={{
                                            padding: "1.5rem",
                                            background: "#f7fafc",
                                            borderRadius: "12px",
                                            border: "2px solid #e2e8f0",
                                            cursor: "pointer",
                                            transition: "all 0.2s",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = "#edf2f7";
                                            e.currentTarget.style.borderColor = "#667eea";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = "#f7fafc";
                                            e.currentTarget.style.borderColor = "#e2e8f0";
                                        }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                                            <div style={{ flex: 1 }}>
                                                <h3 style={{ fontSize: "1.2rem", fontWeight: 600, color: "#2d3748", marginBottom: "0.5rem" }}>
                                                    {product.productName}
                                                </h3>
                                                <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
                                                    <div style={{ fontSize: "0.9rem", color: "#4a5568" }}>
                                                        <span style={{ fontWeight: 600 }}>Total Reviews:</span> {reviewInfo.total}
                                                    </div>
                                                    {reviewInfo.pending > 0 && (
                                                        <div style={{ fontSize: "0.9rem", color: "#c53030", fontWeight: 600 }}>
                                                            ⏳ Pending: {reviewInfo.pending}
                                                        </div>
                                                    )}
                                                    {reviewInfo.approved > 0 && (
                                                        <div style={{ fontSize: "0.9rem", color: "#22543d" }}>
                                                            ✓ Approved: {reviewInfo.approved}
                                                        </div>
                                                    )}
                                                    {reviewInfo.rejected > 0 && (
                                                        <div style={{ fontSize: "0.9rem", color: "#718096" }}>
                                                            ✗ Rejected: {reviewInfo.rejected}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ fontSize: "1.5rem", color: "#667eea", marginLeft: "1rem" }}>
                                                →
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
