// SalesManagerDashboard.jsx
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useUserRole } from "../hooks/useUserRole";
import { useToast } from "../contexts/ToastContext";
import salesApi from "../api/salesApi";
import productApi from "../api/productApi";
import categoryApi from "../api/categoryApi";
import CustomSelect from "../components/CustomSelect";

export default function SalesManagerDashboard() {
  const [activeTab, setActiveTab] = useState("pricing");
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Search and filter states for pricing tab
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [priceSortBy, setPriceSortBy] = useState("name"); // name, price-low, price-high
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 10;

  // Form states
  const [priceForm, setPriceForm] = useState({ productId: "", price: "" });
  const [discountForm, setDiscountForm] = useState({ productIds: [], discountPercent: "" });

  // Discount tab states
  const [discountProductSearchQuery, setDiscountProductSearchQuery] = useState("");
  const [discountCategoryFilter, setDiscountCategoryFilter] = useState("");
  const [discountSortBy, setDiscountSortBy] = useState("name");
  const [categories, setCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);

  // Invoice states
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoiceDateRange, setInvoiceDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });

  // Revenue & Profit states
  const [metrics, setMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [metricsDateRange, setMetricsDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });

  // Refund Management states
  const [pendingRefunds, setPendingRefunds] = useState([]);
  const [loadingRefunds, setLoadingRefunds] = useState(false);
  const [decidingRefund, setDecidingRefund] = useState({});
  const [decisionNote, setDecisionNote] = useState({});

  const navigate = useNavigate();
  const userRole = useUserRole();
  const { success: showSuccess, error: showError } = useToast();

  // Redirect if not SALES_MANAGER
  useEffect(() => {
    if (userRole !== "SALES_MANAGER") {
      navigate("/");
    }
  }, [userRole, navigate]);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await categoryApi.getAllCategories();
      const categoriesData = response?.data?.data || response?.data || [];
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const response = await productApi.getAllProducts(0, 200);
      const productsData =
        response.data?.data?.content ||
        response.data?.content ||
        response.data?.data ||
        response.data ||
        [];
      const productsArray = Array.isArray(productsData) ? productsData : [];
      setProducts(productsArray);
      setFilteredProducts(productsArray);
    } catch (error) {
      console.error("Error loading products:", error);
      showError("Failed to load products.");
    } finally {
      setLoadingProducts(false);
      setLoading(false);
    }
  };

  // Filter and sort products
  useEffect(() => {
    let filtered = [...products];

    // Apply search filter
    if (productSearchQuery.trim()) {
      filtered = filtered.filter((product) =>
        product.productName?.toLowerCase().includes(productSearchQuery.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (priceSortBy) {
        case "price-low":
          return (a.price || 0) - (b.price || 0);
        case "price-high":
          return (b.price || 0) - (a.price || 0);
        case "name":
        default:
          return (a.productName || "").localeCompare(b.productName || "");
      }
    });

    setFilteredProducts(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [productSearchQuery, priceSortBy, products]);

  const handleSetPrice = async (e) => {
    e.preventDefault();
    try {
      await salesApi.setPrice(priceForm.productId, parseFloat(priceForm.price));
      showSuccess("Price updated successfully!");
      setPriceForm({ productId: "", price: "" });
      loadProducts();
    } catch (error) {
      console.error("Error setting price:", error);
      showError(error.response?.data?.message || "Failed to update price.");
    }
  };

  const handleSetDiscount = async (e) => {
    e.preventDefault();
    if (discountForm.productIds.length === 0) {
      showError("Please select at least one product.");
      return;
    }
    try {
      await salesApi.setDiscount(discountForm.productIds, parseFloat(discountForm.discountPercent));
      showSuccess("Discount applied successfully! Users with this product in their wishlist have been notified.");
      setDiscountForm({ productIds: [], discountPercent: "" });
      loadProducts();
    } catch (error) {
      console.error("Error setting discount:", error);
      showError(error.response?.data?.message || "Failed to apply discount.");
    }
  };

  const toggleProductSelection = (productId) => {
    setDiscountForm((prev) => {
      const isSelected = prev.productIds.includes(productId);
      return {
        ...prev,
        productIds: isSelected ? prev.productIds.filter((id) => id !== productId) : [...prev.productIds, productId],
      };
    });
  };

  // Filter products for discount tab (but keep selected products even if filtered out)
  const getFilteredProductsForDiscount = () => {
    let filtered = [...products];

    // Apply search filter
    if (discountProductSearchQuery.trim()) {
      filtered = filtered.filter((product) =>
        product.productName?.toLowerCase().includes(discountProductSearchQuery.toLowerCase())
      );
    }

    // Apply category filter
    if (discountCategoryFilter) {
      filtered = filtered.filter((product) => {
        const productCategories = product.categoryIds || [];
        return productCategories.includes(discountCategoryFilter);
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (discountSortBy) {
        case "price-low":
          return (a.price || 0) - (b.price || 0);
        case "price-high":
          return (b.price || 0) - (a.price || 0);
        case "name":
        default:
          return (a.productName || "").localeCompare(b.productName || "");
      }
    });

    return filtered;
  };

  // Get all products including selected ones that might be filtered out
  const getDisplayProductsForDiscount = () => {
    const filtered = getFilteredProductsForDiscount();
    const filteredIds = new Set(filtered.map(p => p.productId));
    
    // Add selected products that are not in filtered list
    const selectedProducts = products.filter(p => 
      discountForm.productIds.includes(p.productId) && !filteredIds.has(p.productId)
    );

    return [...filtered, ...selectedProducts];
  };

  const handleSelectAllFiltered = () => {
    const filtered = getFilteredProductsForDiscount();
    const filteredIds = filtered.map(p => p.productId);
    const allSelected = filteredIds.every(id => discountForm.productIds.includes(id));
    
    if (allSelected) {
      // Deselect all filtered products
      setDiscountForm(prev => ({
        ...prev,
        productIds: prev.productIds.filter(id => !filteredIds.includes(id))
      }));
    } else {
      // Select all filtered products (keep existing selections)
      setDiscountForm(prev => ({
        ...prev,
        productIds: [...new Set([...prev.productIds, ...filteredIds])]
      }));
    }
  };

  const handleApplyCategoryDiscount = () => {
    if (selectedCategoryIds.length === 0) {
      showError("Please select at least one category.");
      return;
    }

    // Get all products in selected categories
    const categoryProductIds = products
      .filter(product => {
        const productCategories = product.categoryIds || [];
        return selectedCategoryIds.some(catId => productCategories.includes(catId));
      })
      .map(product => product.productId);

    // Add to selected products
    setDiscountForm(prev => ({
      ...prev,
      productIds: [...new Set([...prev.productIds, ...categoryProductIds])]
    }));

    setShowCategoryModal(false);
    setSelectedCategoryIds([]);
    showSuccess(`Added ${categoryProductIds.length} products from selected categories.`);
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return "₺0.00";
    const num = Number(amount);
    if (!Number.isFinite(num)) return "₺0.00";
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(num);
  };

  const loadInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const fromDate = new Date(invoiceDateRange.from);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = new Date(invoiceDateRange.to);
      toDate.setHours(23, 59, 59, 999);

      const response = await salesApi.getInvoices(fromDate, toDate);
      const invoicesData = response.data?.data || response.data || [];
      setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
      if (invoicesData.length > 0) {
        showSuccess(`Loaded ${invoicesData.length} invoice(s).`);
      }
    } catch (error) {
      console.error("Error loading invoices:", error);
      showError(error.response?.data?.message || "Failed to load invoices.");
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleDownloadInvoicePdf = async (invoice) => {
    try {
      const invoiceId = invoice.invoiceId || invoice.id;
      const response = await salesApi.getInvoicePdf(invoiceId);

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice_${invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showSuccess("Invoice PDF downloaded successfully!");
    } catch (error) {
      console.error("Error downloading invoice PDF:", error);
      showError(error.response?.data?.message || "Failed to download invoice PDF.");
    }
  };

  const handlePrintInvoice = async (invoice) => {
    try {
      const invoiceId = invoice.invoiceId || invoice.id;
      const response = await salesApi.getInvoicePdf(invoiceId);

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url, "_blank");

      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }

      showSuccess("Invoice opened for printing!");
    } catch (error) {
      console.error("Error printing invoice:", error);
      showError(error.response?.data?.message || "Failed to print invoice.");
    }
  };

  const loadMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const fromDate = new Date(metricsDateRange.from);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = new Date(metricsDateRange.to);
      toDate.setHours(23, 59, 59, 999);

      const response = await salesApi.getMetrics(fromDate, toDate);
      const metricsData = response.data?.data || response.data;
      setMetrics(metricsData);
      showSuccess("Metrics loaded successfully!");
    } catch (error) {
      console.error("Error loading metrics:", error);
      showError(error.response?.data?.message || "Failed to load metrics.");
    } finally {
      setLoadingMetrics(false);
    }
  };

  // ✅ NEW: single place to refresh refunds
  const refreshPendingRefunds = async () => {
    const response = await salesApi.getPendingRefunds();
    const refundsData = response.data?.data || response.data || [];
    setPendingRefunds(Array.isArray(refundsData) ? refundsData : []);
  };
  
  useEffect(() => {
    if (activeTab !== "refunds") return;

    (async () => {
        if (loadingRefunds) return; // aynı anda 2 kere çağırmasın
        setLoadingRefunds(true);
        try {
        await refreshPendingRefunds();
        // İstersen burada toast gösterme, her tab'a girince spam olur.
        // showSuccess("Refund requests loaded!");
        } catch (error) {
        console.error("Error loading refunds:", error);
        showError(error.response?.data?.message || "Failed to load refund requests.");
        } finally {
        setLoadingRefunds(false);
        }
    })();
  }, [activeTab]); // tab değişince çalışır


  return (
    <div style={{ minHeight: "calc(100vh - 80px)", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .price-input::-webkit-outer-spin-button,
          .price-input::-webkit-inner-spin-button {
              -webkit-appearance: none;
              margin: 0;
          }
          .price-input[type=number] {
              -moz-appearance: textfield;
          }
          .price-input-wrapper {
              position: relative;
          }
          .price-input-spinner {
              position: absolute;
              right: 0.5rem;
              top: 50%;
              transform: translateY(-50%);
              display: flex;
              flex-direction: column;
              gap: 0.125rem;
              pointer-events: none;
          }
          .price-input-spinner button {
              width: 1.25rem;
              height: 1rem;
              border: 1px solid transparent;
              border-radius: 4px;
              background: #667eea;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 0;
              pointer-events: auto;
              color: #fff;
              font-size: 0.625rem;
              transition: all 0.2s;
          }
          .price-input-spinner button:hover {
              background: #fff;
              color: #667eea;
              border-color: #667eea;
          }
          .price-input-spinner button:active {
              background: #f7fafc;
              color: #667eea;
              border-color: #667eea;
          }
        `}
      </style>
      <div style={{ padding: "2rem" }}>
        <div
          style={{
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            borderRadius: "8px",
            padding: "2rem",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
            maxWidth: "1400px",
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
            Sales Manager Dashboard
          </h1>
          <p style={{ color: "#718096", fontSize: "0.95rem", marginBottom: "2rem" }}>
            Welcome! Set product prices and apply discounts.
          </p>

          {/* Tabs */}
          <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", borderBottom: "2px solid #e2e8f0" }}>
            {[
              { id: "pricing", label: "💰 Price Management" },
              { id: "discount", label: "🎯 Discount Management" },
              { id: "invoices", label: "📄 Invoice Management" },
              { id: "revenue", label: "📊 Revenue & Profit" },
              { id: "refunds", label: "💳 Refund Management" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "0.8rem 1.5rem",
                  border: activeTab === tab.id ? "2px solid #667eea" : "2px solid transparent",
                  background: activeTab === tab.id ? "#fff" : "transparent",
                  color: activeTab === tab.id ? "#667eea" : "#4a5568",
                  fontWeight: 600,
                  cursor: "pointer",
                  borderRadius: "4px",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.background = "#667eea";
                    e.currentTarget.style.color = "#fff";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#4a5568";
                  }
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Loading Spinner */}
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem", minHeight: "400px" }}>
              <div style={{ width: "50px", height: "50px", border: "4px solid rgba(102, 126, 234, 0.3)", borderTop: "4px solid #667eea", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
              <div style={{ marginTop: "1rem", color: "#718096", fontSize: "1rem" }}>Loading...</div>
            </div>
          ) : (
            <>
          {/* Pricing Tab */}
          {activeTab === "pricing" && (
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1.5rem", color: "#2d3748" }}>
                Product Price Management
              </h2>

              {/* Search and Filter Section */}
              <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
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
                  value={priceSortBy}
                  onChange={(e) => setPriceSortBy(e.target.value)}
                  options={[
                    { value: "name", label: "Sort by Name" },
                    { value: "price-low", label: "Price: Low to High" },
                    { value: "price-high", label: "Price: High to Low" }
                  ]}
                  placeholder="Sort by"
                  minWidth="180px"
                />
              </div>

              {/* Pagination Info */}
              {filteredProducts.length > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid #e2e8f0" }}>
                  <div style={{ color: "#2d3748", fontSize: "0.9rem", fontWeight: 500 }}>
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
              )}

              {/* Product List */}
              {loadingProducts ? (
                <div style={{ textAlign: "center", padding: "3rem", color: "#718096" }}>Loading products...</div>
              ) : filteredProducts.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem", color: "#718096" }}>
                  {productSearchQuery ? "No products found matching your search." : "No products available."}
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
                  {filteredProducts.slice((currentPage - 1) * productsPerPage, currentPage * productsPerPage).map((product) => (
                    <div
                      key={product.productId}
                      onClick={() => navigate(`/sales-manager/products/${product.productId}`)}
                      style={{
                        background: "#fff",
                        border: "2px solid #e2e8f0",
                        borderRadius: "8px",
                        padding: "1.5rem",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#667eea";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.15)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#e2e8f0";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <div style={{ marginBottom: "1rem" }}>
                        <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#2d3748", marginBottom: "0.5rem" }}>
                          {product.productName}
                        </h3>
                        {product.description && (
                          <p style={{ fontSize: "0.85rem", color: "#718096", lineHeight: "1.5", marginBottom: "0.5rem" }}>
                            {product.description.length > 100 ? `${product.description.substring(0, 100)}...` : product.description}
                          </p>
                        )}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #e2e8f0" }}>
                        <div>
                          <div style={{ fontSize: "0.85rem", color: "#718096", marginBottom: "0.25rem" }}>Current Price</div>
                          <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#667eea" }}>
                            {formatCurrency(product.price)}
                          </div>
                        </div>
                        {product.discount && product.discount > 0 && (
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "0.85rem", color: "#718096", marginBottom: "0.25rem" }}>Discount</div>
                            <div style={{ fontSize: "1rem", fontWeight: 600, color: "#c53030" }}>
                              {product.discount}%
                            </div>
                          </div>
                        )}
                      </div>
                      <div style={{ marginTop: "1rem", fontSize: "0.85rem", color: "#667eea", fontWeight: 500 }}>
                        Click to edit →
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Discount Tab */}
          {activeTab === "discount" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#2d3748" }}>
                  Apply Discount to Products
                </h2>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(true)}
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
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 4px 8px rgba(102, 126, 234, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  Choose by Category
                </button>
              </div>
              <div style={{ fontSize: "1rem", fontWeight: 600, color: "#667eea", marginBottom: "1.5rem" }}>
                {discountForm.productIds.length} product{discountForm.productIds.length !== 1 ? "s" : ""} selected
              </div>

              {/* Search and Filter Section */}
              <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={discountProductSearchQuery}
                  onChange={(e) => setDiscountProductSearchQuery(e.target.value)}
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
                  value={discountCategoryFilter}
                  onChange={(e) => setDiscountCategoryFilter(e.target.value)}
                  options={[
                    { value: "", label: "All Categories" },
                    ...categories.map((cat) => ({
                      value: cat.categoryId,
                      label: cat.categoryName,
                    })),
                  ]}
                  placeholder="Filter by Category"
                  minWidth="180px"
                />
                <CustomSelect
                  value={discountSortBy}
                  onChange={(e) => setDiscountSortBy(e.target.value)}
                  options={[
                    { value: "name", label: "Sort by Name" },
                    { value: "price-low", label: "Price: Low to High" },
                    { value: "price-high", label: "Price: High to Low" }
                  ]}
                  placeholder="Sort by"
                  minWidth="180px"
                />
              </div>

              <form
                onSubmit={handleSetDiscount}
                style={{ background: "#f7fafc", padding: "1.5rem", borderRadius: "4px", marginBottom: "2rem" }}
              >
                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, color: "#2d3748", fontSize: "0.85rem" }}>
                    Discount Rate (%)
                  </label>
                  <div className="price-input-wrapper" style={{ position: "relative", maxWidth: "300px" }}>
                    <input
                      type="number"
                      className="price-input"
                      step="0.01"
                      min="0"
                      max="100"
                      value={discountForm.discountPercent}
                      onChange={(e) => setDiscountForm({ ...discountForm, discountPercent: e.target.value })}
                      required
                      style={{
                        width: "100%",
                        padding: "0.75rem 2.5rem 0.75rem 0.75rem",
                        borderRadius: "8px",
                        border: "2px solid #e2e8f0",
                        fontSize: "0.85rem",
                        backgroundColor: "#fff",
                        color: "#2d3748",
                        boxSizing: "border-box",
                        transition: "border-color 0.2s",
                        outline: "none",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "#667eea";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "#e2e8f0";
                      }}
                    />
                    <div className="price-input-spinner">
                      <button
                        type="button"
                        onClick={() => {
                          const current = parseFloat(discountForm.discountPercent) || 0;
                          if (current < 100) {
                            setDiscountForm({ ...discountForm, discountPercent: Math.min(100, current + 0.01).toFixed(2) });
                          }
                        }}
                        aria-label="Increase"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const current = parseFloat(discountForm.discountPercent) || 0;
                          if (current > 0) {
                            setDiscountForm({ ...discountForm, discountPercent: Math.max(0, current - 0.01).toFixed(2) });
                          }
                        }}
                        aria-label="Decrease"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <label style={{ fontWeight: 500, color: "#2d3748", fontSize: "0.85rem" }}>
                      Products to Apply Discount ({discountForm.productIds.length} selected)
                    </label>
                    {(() => {
                      const filtered = getFilteredProductsForDiscount();
                      const filteredIds = filtered.map(p => p.productId);
                      const allSelected = filteredIds.length > 0 && filteredIds.every(id => discountForm.productIds.includes(id));
                      return (
                        <button
                          type="button"
                          onClick={handleSelectAllFiltered}
                          style={{
                            padding: "0.5rem 1rem",
                            background: allSelected ? "#e53e3e" : "#667eea",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontSize: "0.85rem",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = "0.9";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = "1";
                          }}
                        >
                          {allSelected ? "Deselect All Filtered" : "Select All Filtered"}
                        </button>
                      );
                    })()}
                  </div>
                  {loadingProducts ? (
                    <div style={{ textAlign: "center", padding: "3rem", color: "#718096" }}>Loading products...</div>
                  ) : (() => {
                    const displayProducts = getDisplayProductsForDiscount();
                    const filtered = getFilteredProductsForDiscount();
                    const filteredIds = new Set(filtered.map(p => p.productId));
                    
                    return displayProducts.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "3rem", color: "#718096" }}>
                        {discountProductSearchQuery || discountCategoryFilter ? "No products found matching your filters." : "No products available."}
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
                        {displayProducts.map((product) => {
                          const isSelected = discountForm.productIds.includes(product.productId);
                          const isFilteredOut = !filteredIds.has(product.productId);
                          return (
                            <div
                              key={product.productId}
                              onClick={() => toggleProductSelection(product.productId)}
                              style={{
                                background: isSelected ? "#667eea" : "#fff",
                                border: `2px solid ${isSelected ? "#667eea" : "#e2e8f0"}`,
                                borderRadius: "8px",
                                padding: "1.5rem",
                                cursor: "pointer",
                                transition: "all 0.2s",
                                opacity: isFilteredOut ? 0.6 : 1,
                              }}
                              onMouseEnter={(e) => {
                                if (!isFilteredOut) {
                                  e.currentTarget.style.borderColor = "#667eea";
                                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.15)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isFilteredOut) {
                                  e.currentTarget.style.borderColor = isSelected ? "#667eea" : "#e2e8f0";
                                  e.currentTarget.style.boxShadow = "none";
                                }
                              }}
                            >
                              <div style={{ marginBottom: "1rem" }}>
                                <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: isSelected ? "#fff" : "#2d3748", marginBottom: "0.5rem" }}>
                                  {product.productName}
                                </h3>
                                {product.description && (
                                  <p style={{ fontSize: "0.85rem", color: isSelected ? "rgba(255, 255, 255, 0.9)" : "#718096", lineHeight: "1.5", marginBottom: "0.5rem" }}>
                                    {product.description.length > 100 ? `${product.description.substring(0, 100)}...` : product.description}
                                  </p>
                                )}
                                {isFilteredOut && (
                                  <span style={{ fontSize: "0.75rem", color: isSelected ? "rgba(255, 255, 255, 0.8)" : "#718096", fontStyle: "italic" }}>
                                    (Not in current filter)
                                  </span>
                                )}
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", paddingTop: "1rem", borderTop: `1px solid ${isSelected ? "rgba(255, 255, 255, 0.3)" : "#e2e8f0"}` }}>
                                <div>
                                  <div style={{ fontSize: "0.85rem", color: isSelected ? "rgba(255, 255, 255, 0.9)" : "#718096", marginBottom: "0.25rem" }}>Current Price</div>
                                  <div style={{ fontSize: "1.25rem", fontWeight: 700, color: isSelected ? "#fff" : "#667eea" }}>
                                    {formatCurrency(product.price)}
                                  </div>
                                </div>
                                {product.discount && product.discount > 0 && (
                                  <div style={{ textAlign: "right" }}>
                                    <div style={{ fontSize: "0.85rem", color: isSelected ? "rgba(255, 255, 255, 0.9)" : "#718096", marginBottom: "0.25rem" }}>Discount</div>
                                    <div style={{ fontSize: "1rem", fontWeight: 600, color: isSelected ? "#fff" : "#c53030" }}>
                                      {product.discount}%
                                    </div>
                                  </div>
                                )}
                              </div>
                              {isSelected && (
                                <div style={{ marginTop: "1rem", fontSize: "0.85rem", color: "#fff", fontWeight: 500, textAlign: "center" }}>
                                  ✓ Selected
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                <button
                  type="submit"
                  disabled={discountForm.productIds.length === 0}
                  style={{
                    padding: "0.75rem 2rem",
                    background: discountForm.productIds.length === 0 ? "#cbd5e0" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    fontWeight: 600,
                    cursor: discountForm.productIds.length === 0 ? "not-allowed" : "pointer",
                    fontSize: "1rem",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (discountForm.productIds.length > 0) {
                      e.currentTarget.style.boxShadow = "0 4px 8px rgba(102, 126, 234, 0.4)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (discountForm.productIds.length > 0) {
                      e.currentTarget.style.boxShadow = "none";
                    }
                  }}
                >
                  Apply Discount to {discountForm.productIds.length} Product{discountForm.productIds.length !== 1 ? "s" : ""}
                </button>
              </form>

              {/* Category Selection Modal */}
              {showCategoryModal && (
                <>
                  <style>
                    {`
                      .category-checkbox {
                        width: 1.25rem;
                        height: 1.25rem;
                        cursor: pointer;
                        accentColor: #667eea;
                        background-color: #fff;
                        border: 2px solid #e2e8f0;
                        border-radius: 4px;
                      }
                      .category-checkbox:checked {
                        background-color: #667eea;
                        border-color: #667eea;
                      }
                    `}
                  </style>
                  <div
                    style={{
                      position: "fixed",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: "rgba(0, 0, 0, 0.5)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 1000,
                    }}
                    onClick={() => {
                      setShowCategoryModal(false);
                      setSelectedCategoryIds([]);
                    }}
                  >
                    <div
                      style={{
                        background: "#fff",
                        borderRadius: "8px",
                        padding: "2rem",
                        maxWidth: "600px",
                        width: "90%",
                        maxHeight: "80vh",
                        overflowY: "auto",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                    <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem", color: "#2d3748" }}>
                      Choose Categories to Apply Discount
                    </h3>
                    <div style={{ marginBottom: "1.5rem" }}>
                      {categories.length === 0 ? (
                        <div style={{ color: "#718096", padding: "1rem" }}>No categories available.</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "300px", overflowY: "auto" }}>
                          {categories.map((category) => {
                            const isSelected = selectedCategoryIds.includes(category.categoryId);
                            return (
                              <label
                                key={category.categoryId}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.75rem",
                                  padding: "0.75rem",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  background: isSelected ? "#f7fafc" : "#fff",
                                  border: `2px solid ${isSelected ? "#667eea" : "#e2e8f0"}`,
                                  transition: "all 0.2s",
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.borderColor = "#cbd5e0";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.borderColor = "#e2e8f0";
                                  }
                                }}
                              >
                                <input
                                  type="checkbox"
                                  className="category-checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedCategoryIds([...selectedCategoryIds, category.categoryId]);
                                    } else {
                                      setSelectedCategoryIds(selectedCategoryIds.filter(id => id !== category.categoryId));
                                    }
                                  }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 600, color: "#2d3748" }}>{category.categoryName}</div>
                                  {category.description && (
                                    <div style={{ fontSize: "0.85rem", color: "#718096" }}>{category.description}</div>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCategoryModal(false);
                          setSelectedCategoryIds([]);
                        }}
                        style={{
                          padding: "0.75rem 1.5rem",
                          background: "#e2e8f0",
                          color: "#2d3748",
                          border: "none",
                          borderRadius: "4px",
                          fontWeight: 600,
                          cursor: "pointer",
                          fontSize: "0.9rem",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyCategoryDiscount}
                        disabled={selectedCategoryIds.length === 0}
                        style={{
                          padding: "0.75rem 1.5rem",
                          background: selectedCategoryIds.length === 0 ? "#cbd5e0" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          color: "#fff",
                          border: "none",
                          borderRadius: "4px",
                          fontWeight: 600,
                          cursor: selectedCategoryIds.length === 0 ? "not-allowed" : "pointer",
                          fontSize: "0.9rem",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          if (selectedCategoryIds.length > 0) {
                            e.currentTarget.style.boxShadow = "0 4px 8px rgba(102, 126, 234, 0.4)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedCategoryIds.length > 0) {
                            e.currentTarget.style.boxShadow = "none";
                          }
                        }}
                      >
                        Apply to Categories
                      </button>
                    </div>
                  </div>
                </div>
                </>
              )}
            </div>
          )}

          {/* Invoice Management Tab */}
          {activeTab === "invoices" && (
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1.5rem", color: "#2d3748" }}>
                Invoice Management
              </h2>

              <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", alignItems: "end" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, color: "#2d3748", fontSize: "0.85rem" }}>
                    From Date
                  </label>
                  <input
                    type="date"
                    value={invoiceDateRange.from}
                    onChange={(e) => setInvoiceDateRange({ ...invoiceDateRange, from: e.target.value })}
                    style={{
                      padding: "0.75rem",
                      borderRadius: "4px",
                      border: "2px solid #e2e8f0",
                      fontSize: "0.85rem",
                      backgroundColor: "#fff",
                      color: "#2d3748",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, color: "#2d3748", fontSize: "0.85rem" }}>
                    To Date
                  </label>
                  <input
                    type="date"
                    value={invoiceDateRange.to}
                    onChange={(e) => setInvoiceDateRange({ ...invoiceDateRange, to: e.target.value })}
                    style={{
                      padding: "0.75rem",
                      borderRadius: "4px",
                      border: "2px solid #e2e8f0",
                      fontSize: "0.85rem",
                      backgroundColor: "#fff",
                      color: "#2d3748",
                    }}
                  />
                </div>
                <button
                  onClick={loadInvoices}
                  disabled={loadingInvoices}
                  style={{
                    padding: "0.75rem 2rem",
                    background: "#fff",
                    color: "#667eea",
                    border: "2px solid #667eea",
                    borderRadius: "4px",
                    fontWeight: 600,
                    cursor: loadingInvoices ? "not-allowed" : "pointer",
                    fontSize: "0.85rem",
                    transition: "all 0.2s",
                    opacity: loadingInvoices ? 0.6 : 1,
                  }}
                >
                  {loadingInvoices ? "Loading..." : "Load Invoices"}
                </button>
              </div>

              {loadingInvoices ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "#718096" }}>Loading invoices...</div>
              ) : invoices.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "#718096" }}>
                  No invoices found for the selected date range.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.invoiceId || invoice.id}
                      style={{
                        padding: "1.5rem",
                        background: "#f7fafc",
                        borderRadius: "8px",
                        border: "2px solid #e2e8f0",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#667eea";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.15)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#e2e8f0";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "#2d3748", marginBottom: "0.75rem" }}>
                          Invoice #{invoice.invoiceId || invoice.id}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "0.75rem" }}>
                          <div>
                            <div style={{ fontSize: "0.75rem", color: "#718096", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                              Customer
                            </div>
                            <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#2d3748" }}>
                              {invoice.customerName || "N/A"}
                            </div>
                            {invoice.customerEmail && (
                              <div style={{ fontSize: "0.85rem", color: "#718096", marginTop: "0.25rem" }}>
                                {invoice.customerEmail}
                              </div>
                            )}
                          </div>
                          <div>
                            <div style={{ fontSize: "0.75rem", color: "#718096", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                              Order Date
                            </div>
                            <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#2d3748" }}>
                              {invoice.orderDate ? new Date(invoice.orderDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "N/A"}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: "0.75rem", color: "#718096", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                              Invoice Date
                            </div>
                            <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#2d3748" }}>
                              {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "N/A"}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: "0.75rem", color: "#718096", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                              Order ID
                            </div>
                            <div style={{ fontSize: "0.85rem", color: "#4a5568", fontFamily: "monospace" }}>
                              {invoice.orderId ? invoice.orderId.substring(0, 8) + "..." : "N/A"}
                            </div>
                          </div>
                        </div>
                        {invoice.totalAmount && (
                          <div style={{ 
                            display: "inline-block",
                            padding: "0.5rem 1rem",
                            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            borderRadius: "6px",
                            marginTop: "0.5rem"
                          }}>
                            <div style={{ fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.9)", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                              Total Amount
                            </div>
                            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#fff" }}>
                              {formatCurrency(invoice.totalAmount)}
                            </div>
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem", marginLeft: "1rem" }}>
                        <button
                          onClick={() => handlePrintInvoice(invoice)}
                          style={{
                            padding: "0.5rem 1rem",
                            background: "#fff",
                            color: "#667eea",
                            border: "2px solid #667eea",
                            borderRadius: "6px",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontSize: "0.85rem",
                            transition: "all 0.2s",
                            whiteSpace: "nowrap",
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
                          🖨️ Print
                        </button>
                        <button
                          onClick={() => handleDownloadInvoicePdf(invoice)}
                          style={{
                            padding: "0.5rem 1rem",
                            background: "#fff",
                            color: "#667eea",
                            border: "2px solid #667eea",
                            borderRadius: "6px",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontSize: "0.85rem",
                            transition: "all 0.2s",
                            whiteSpace: "nowrap",
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
                          📥 Download PDF
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Revenue & Profit Tab */}
          {activeTab === "revenue" && (
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1.5rem", color: "#2d3748" }}>
                Revenue & Profit Analysis
              </h2>

              <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", alignItems: "end" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, color: "#2d3748", fontSize: "0.85rem" }}>
                    From Date
                  </label>
                  <input
                    type="date"
                    value={metricsDateRange.from}
                    onChange={(e) => setMetricsDateRange({ ...metricsDateRange, from: e.target.value })}
                    style={{
                      padding: "0.75rem",
                      borderRadius: "4px",
                      border: "2px solid #e2e8f0",
                      fontSize: "0.85rem",
                      backgroundColor: "#fff",
                      color: "#2d3748",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, color: "#2d3748", fontSize: "0.85rem" }}>
                    To Date
                  </label>
                  <input
                    type="date"
                    value={metricsDateRange.to}
                    onChange={(e) => setMetricsDateRange({ ...metricsDateRange, to: e.target.value })}
                    style={{
                      padding: "0.75rem",
                      borderRadius: "4px",
                      border: "2px solid #e2e8f0",
                      fontSize: "0.85rem",
                      backgroundColor: "#fff",
                      color: "#2d3748",
                    }}
                  />
                </div>
                <button
                  onClick={loadMetrics}
                  disabled={loadingMetrics}
                  style={{
                    padding: "0.75rem 2rem",
                    background: "#fff",
                    color: "#667eea",
                    border: "2px solid #667eea",
                    borderRadius: "4px",
                    fontWeight: 600,
                    cursor: loadingMetrics ? "not-allowed" : "pointer",
                    fontSize: "0.85rem",
                    transition: "all 0.2s",
                    opacity: loadingMetrics ? 0.6 : 1,
                  }}
                >
                  {loadingMetrics ? "Loading..." : "Load Metrics"}
                </button>
              </div>

              {loadingMetrics ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "#718096" }}>Loading metrics...</div>
              ) : metrics ? (
                <div>
                  {/* Summary Cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
                    <div style={{ padding: "1.5rem", background: "#f0f4ff", borderRadius: "4px", border: "2px solid #667eea" }}>
                      <div style={{ fontSize: "0.85rem", color: "#667eea", fontWeight: 600, marginBottom: "0.5rem" }}>Total Revenue</div>
                      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#2d3748" }}>
                        {formatCurrency(metrics.totalRevenue || 0)}
                      </div>
                    </div>
                    <div style={{ padding: "1.5rem", background: "#fff5f5", borderRadius: "4px", border: "2px solid #e53e3e" }}>
                      <div style={{ fontSize: "0.85rem", color: "#e53e3e", fontWeight: 600, marginBottom: "0.5rem" }}>Total Cost</div>
                      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#2d3748" }}>
                        {formatCurrency(metrics.totalCost || 0)}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "1.5rem",
                        background: (metrics.totalProfit || 0) >= 0 ? "#f0fff4" : "#fff5f5",
                        borderRadius: "4px",
                        border: `2px solid ${(metrics.totalProfit || 0) >= 0 ? "#2f855a" : "#e53e3e"}`,
                      }}
                    >
                      <div style={{ fontSize: "0.85rem", color: (metrics.totalProfit || 0) >= 0 ? "#2f855a" : "#e53e3e", fontWeight: 600, marginBottom: "0.5rem" }}>
                        Total Profit
                      </div>
                      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#2d3748" }}>
                        {formatCurrency(metrics.totalProfit || 0)}
                      </div>
                    </div>
                  </div>

                  {/* ✅ FIXED CHART: Revenue + Profit + Loss(Cost) */}
                  {metrics.points && metrics.points.length > 0 ? (
                    <div style={{ padding: "1.5rem", background: "#fff", borderRadius: "4px", border: "2px solid #e2e8f0" }}>
                      <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1.5rem", color: "#2d3748" }}>
                        Daily Revenue / Profit / Loss (Cost) Chart
                      </h3>

                      {(() => {
                        const BAR_AREA_HEIGHT = 320; // critical fix for % heights

                        const num = (v) => {
                          const n = Number(v);
                          return Number.isFinite(n) ? n : 0;
                        };

                        const points = (metrics.points || [])
                          .map((p) => {
                            const revenue = num(p.revenue);
                            const cost = num(p.cost);
                            const profit = num(p.profit);
                            const d = p.date ? new Date(p.date) : null;
                            const dateLabel = d ? d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" }) : "N/A";
                            return { ...p, revenue, cost, profit, dateLabel };
                          })
                          .sort((a, b) => {
                            const da = a.date ? new Date(a.date).getTime() : 0;
                            const db = b.date ? new Date(b.date).getTime() : 0;
                            return da - db;
                          });

                        const maxValue = Math.max(0, ...points.map((p) => Math.max(p.revenue, p.cost, Math.abs(p.profit))));
                        const steps = 5;
                        const stepValue = maxValue / steps;

                        return (
                          <div style={{ position: "relative", height: `${BAR_AREA_HEIGHT + 110}px`, paddingLeft: "80px", paddingRight: "20px", paddingTop: "20px" }}>
                            {/* Y Axis */}
                            <div
                              style={{
                                position: "absolute",
                                left: 0,
                                top: "20px",
                                height: `${BAR_AREA_HEIGHT}px`,
                                width: "70px",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                                alignItems: "flex-end",
                                paddingRight: "10px",
                              }}
                            >
                              {Array.from({ length: steps + 1 }, (_, i) => {
                                const value = maxValue - stepValue * i;
                                return (
                                  <div key={i} style={{ fontSize: "0.75rem", color: "#718096", fontWeight: 500 }}>
                                    {formatCurrency(value)}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Grid + Bars */}
                            <div style={{ position: "relative", height: `${BAR_AREA_HEIGHT}px` }}>
                              <div
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  display: "flex",
                                  flexDirection: "column",
                                  justifyContent: "space-between",
                                  pointerEvents: "none",
                                }}
                              >
                                {Array.from({ length: steps + 1 }, (_, i) => (
                                  <div key={i} style={{ borderTop: "1px solid #e2e8f0", width: "100%" }} />
                                ))}
                              </div>

                              <div
                                style={{
                                  position: "relative",
                                  height: `${BAR_AREA_HEIGHT}px`,
                                  display: "flex",
                                  alignItems: "flex-end",
                                  justifyContent: "center",
                                  gap: "14px",
                                  paddingBottom: "8px",
                                  overflowX: "auto",
                                }}
                              >
                                {points.map((p, idx) => {
                                  const revenueH = maxValue > 0 ? (p.revenue / maxValue) * 100 : 0;
                                  const profitH = maxValue > 0 ? (Math.abs(p.profit) / maxValue) * 100 : 0;
                                  const costH = maxValue > 0 ? (p.cost / maxValue) * 100 : 0;

                                  const profitColor = p.profit >= 0 ? "#2f855a" : "#e53e3e";

                                  return (
                                    <div key={idx} style={{ width: "170px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                                      <div style={{ height: `${BAR_AREA_HEIGHT}px`, display: "flex", alignItems: "flex-end", gap: "6px", width: "100%" }}>
                                        {/* Revenue */}
                                        <div
                                          style={{
                                            width: "50%",
                                            height: `${revenueH}%`,
                                            background: "#667eea",
                                            borderRadius: "4px 4px 0 0",
                                            minHeight: p.revenue > 0 ? "4px" : "0",
                                            boxShadow: "0 2px 4px rgba(102, 126, 234, 0.2)",
                                          }}
                                          title={`Revenue: ${formatCurrency(p.revenue)}`}
                                        />
                                        {/* Profit */}
                                        <div
                                          style={{
                                            width: "50%",
                                            height: `${profitH}%`,
                                            background: profitColor,
                                            borderRadius: "4px 4px 0 0",
                                            minHeight: p.profit !== 0 ? "4px" : "0",
                                            boxShadow: p.profit >= 0 ? "0 2px 4px rgba(47, 133, 90, 0.2)" : "0 2px 4px rgba(229, 62, 62, 0.2)",
                                          }}
                                          title={`Profit: ${formatCurrency(p.profit)}`}
                                        />
                                        {/* Loss (Cost) */}
                                        <div
                                          style={{
                                            width: "50%",
                                            height: `${costH}%`,
                                            background: "#e53e3e",
                                            borderRadius: "4px 4px 0 0",
                                            minHeight: p.cost > 0 ? "4px" : "0",
                                            boxShadow: "0 2px 4px rgba(229, 62, 62, 0.2)",
                                          }}
                                          title={`Loss (Cost): ${formatCurrency(p.cost)}`}
                                        />
                                      </div>

                                      <div style={{ marginTop: "10px", fontSize: "0.8rem", color: "#718096", fontWeight: 500 }}>
                                        {p.dateLabel}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Legend */}
                            <div style={{ display: "flex", gap: "2rem", justifyContent: "center", marginTop: "1.2rem", paddingTop: "1rem", borderTop: "1px solid #e2e8f0" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <div style={{ width: "16px", height: "16px", background: "#667eea", borderRadius: "4px" }} />
                                <span style={{ fontSize: "0.85rem", color: "#2d3748", fontWeight: 500 }}>Revenue</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <div style={{ width: "16px", height: "16px", background: "#2f855a", borderRadius: "4px" }} />
                                <span style={{ fontSize: "0.85rem", color: "#2d3748", fontWeight: 500 }}>Profit</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <div style={{ width: "16px", height: "16px", background: "#e53e3e", borderRadius: "4px" }} />
                                <span style={{ fontSize: "0.85rem", color: "#2d3748", fontWeight: 500 }}>Loss (Cost)</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "2rem", color: "#718096" }}>
                      No data available for the selected date range.
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "2rem", color: "#718096" }}>
                  Select a date range and click "Load Metrics" to view revenue and profit analysis.
                </div>
              )}
            </div>
          )}

          {/* Refund Management Tab */}
          {activeTab === "refunds" && (
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1.5rem", color: "#2d3748" }}>
                Pending Refund Requests
              </h2>

              <button
                onClick={async () => {
                  if (loadingRefunds) return;
                  setLoadingRefunds(true);
                  try {
                    await refreshPendingRefunds();
                    showSuccess("Refund requests refreshed!");
                  } catch (error) {
                    console.error("Error loading refunds:", error);
                    showError(error.response?.data?.message || "Failed to load refund requests.");
                  } finally {
                    setLoadingRefunds(false);
                  }
                }}
                disabled={loadingRefunds}
                style={{
                  padding: "1rem 1.5rem",
                  background: loadingRefunds ? "#cbd5e0" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "1rem",
                  fontWeight: 600,
                  cursor: loadingRefunds ? "not-allowed" : "pointer",
                  marginBottom: "1.5rem",
                  transition: "all 0.3s",
                  opacity: loadingRefunds ? 0.6 : 1,
                  boxShadow: loadingRefunds ? "none" : "0 2px 4px rgba(102, 126, 234, 0.3)",
                }}
              >
                {loadingRefunds ? "Loading..." : "Refresh Refund Requests"}
              </button>

              {pendingRefunds.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem", color: "#718096", background: "#f7fafc", borderRadius: "4px" }}>
                  No pending refund requests.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {pendingRefunds.map((refund) => (
                    <div
                      key={refund.refundId}
                      style={{
                        background: "#f7fafc",
                        padding: "1.5rem",
                        borderRadius: "4px",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem" }}>
                        <div>
                          <div style={{ fontSize: "1rem", fontWeight: 600, color: "#2d3748", marginBottom: "0.5rem" }}>
                            Refund Request #{refund.refundId}
                          </div>
                          <div style={{ fontSize: "0.85rem", color: "#718096", marginBottom: "0.25rem" }}>
                            Order ID: {refund.orderId}
                          </div>
                          <div style={{ fontSize: "0.85rem", color: "#718096", marginBottom: "0.25rem" }}>
                            Product ID: {refund.productId}
                          </div>
                          <div style={{ fontSize: "0.85rem", color: "#718096", marginBottom: "0.25rem" }}>
                            Quantity: {refund.quantity}
                          </div>
                          {refund.reason && (
                            <div style={{ fontSize: "0.85rem", color: "#718096", marginTop: "0.5rem", padding: "0.75rem", background: "#fff", borderRadius: "4px" }}>
                              <strong>Reason:</strong> {refund.reason}
                            </div>
                          )}
                          <div style={{ fontSize: "0.9rem", color: "#2d3748", marginTop: "0.75rem", fontWeight: 600 }}>
                            Refund Amount:{" "}
                            <span style={{ color: "#667eea" }}>${refund.refundAmount?.toFixed(2) || "0.00"}</span>
                          </div>
                          <div style={{ fontSize: "0.85rem", color: "#718096", marginTop: "0.25rem" }}>
                            Request Date: {refund.requestDate ? new Date(refund.requestDate).toLocaleString() : "N/A"}
                          </div>
                        </div>
                        <div
                          style={{
                            padding: "0.5rem 1rem",
                            background: "#fed7d7",
                            color: "#742a2a",
                            borderRadius: "4px",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                          }}
                        >
                          {refund.status}
                        </div>
                      </div>

                      <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #e2e8f0" }}>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#4a5568", fontSize: "0.85rem" }}>
                          Decision Note (Optional)
                        </label>
                        <textarea
                          value={decisionNote[refund.refundId] || ""}
                          onChange={(e) => setDecisionNote({ ...decisionNote, [refund.refundId]: e.target.value })}
                          placeholder="Add a note about your decision..."
                          rows={3}
                          style={{
                            width: "100%",
                            padding: "0.75rem",
                            border: "1px solid #cbd5e0",
                            borderRadius: "4px",
                            fontSize: "0.85rem",
                            marginBottom: "1rem",
                            boxSizing: "border-box",
                            resize: "vertical",
                          }}
                        />

                        <div style={{ display: "flex", gap: "1rem" }}>
                          {/* ✅ Approve */}
                          <button
                            onClick={async () => {
                              if (decidingRefund[refund.refundId]) return;
                              setDecidingRefund({ ...decidingRefund, [refund.refundId]: true });
                              try {
                                await salesApi.decideRefund(refund.refundId, true, decisionNote[refund.refundId] || null);
                                showSuccess("Refund approved successfully!");
                                setDecisionNote({ ...decisionNote, [refund.refundId]: "" });

                                await refreshPendingRefunds();

                                // ✅ refresh metrics if already loaded
                                if (metrics) {
                                  await loadMetrics();
                                }
                              } catch (error) {
                                console.error("Error approving refund:", error);
                                const errorMessage =
                                  error.response?.data?.message ||
                                  error.response?.data?.error ||
                                  error.message ||
                                  "Failed to approve refund.";
                                showError(errorMessage);
                              } finally {
                                setDecidingRefund((prev) => ({ ...prev, [refund.refundId]: false }));
                              }
                            }}
                            disabled={decidingRefund[refund.refundId]}
                            style={{
                              flex: 1,
                              padding: "1rem 1.5rem",
                              background: decidingRefund[refund.refundId]
                                ? "#cbd5e0"
                                : "linear-gradient(135deg, #2f855a 0%, #22543d 100%)",
                              color: "#fff",
                              border: "none",
                              borderRadius: "10px",
                              fontSize: "1rem",
                              fontWeight: 600,
                              cursor: decidingRefund[refund.refundId] ? "not-allowed" : "pointer",
                              transition: "all 0.3s",
                              opacity: decidingRefund[refund.refundId] ? 0.6 : 1,
                            }}
                          >
                            {decidingRefund[refund.refundId] ? "Approving..." : "Approve Refund"}
                          </button>

                          {/* ✅ Reject */}
                          <button
                            onClick={async () => {
                              if (decidingRefund[refund.refundId]) return;
                              setDecidingRefund({ ...decidingRefund, [refund.refundId]: true });
                              try {
                                await salesApi.decideRefund(refund.refundId, false, decisionNote[refund.refundId] || null);
                                showSuccess("Refund rejected.");
                                setDecisionNote({ ...decisionNote, [refund.refundId]: "" });

                                await refreshPendingRefunds();

                                // ✅ refresh metrics if already loaded
                                if (metrics) {
                                  await loadMetrics();
                                }
                              } catch (error) {
                                console.error("Error rejecting refund:", error);
                                const errorMessage =
                                  error.response?.data?.message ||
                                  error.response?.data?.error ||
                                  error.message ||
                                  "Failed to reject refund.";
                                showError(errorMessage);
                              } finally {
                                setDecidingRefund((prev) => ({ ...prev, [refund.refundId]: false }));
                              }
                            }}
                            disabled={decidingRefund[refund.refundId]}
                            style={{
                              flex: 1,
                              padding: "1rem 1.5rem",
                              background: decidingRefund[refund.refundId]
                                ? "#cbd5e0"
                                : "linear-gradient(135deg, #e53e3e 0%, #c53030 100%)",
                              color: "#fff",
                              border: "none",
                              borderRadius: "10px",
                              fontSize: "1rem",
                              fontWeight: 600,
                              cursor: decidingRefund[refund.refundId] ? "not-allowed" : "pointer",
                              transition: "all 0.3s",
                              opacity: decidingRefund[refund.refundId] ? 0.6 : 1,
                            }}
                          >
                            {decidingRefund[refund.refundId] ? "Rejecting..." : "Reject Refund"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}