import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useUserRole } from "../hooks/useUserRole";
import { useToast } from "../contexts/ToastContext";
import salesApi from "../api/salesApi";
import productApi from "../api/productApi";
import CustomSelect from "../components/CustomSelect";

export default function SalesManagerDashboard() {
    const [activeTab, setActiveTab] = useState("pricing");
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingProducts, setLoadingProducts] = useState(false);

    // Form states
    const [priceForm, setPriceForm] = useState({ productId: "", price: "" });
    const [discountForm, setDiscountForm] = useState({ productIds: [], discountPercent: "" });
    
    // Invoice states
    const [invoices, setInvoices] = useState([]);
    const [loadingInvoices, setLoadingInvoices] = useState(false);
    const [invoiceDateRange, setInvoiceDateRange] = useState({
        from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0],
    });
    
    // Revenue & Profit states
    const [metrics, setMetrics] = useState(null);
    const [loadingMetrics, setLoadingMetrics] = useState(false);
    const [metricsDateRange, setMetricsDateRange] = useState({
        from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0],
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
    }, []);

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
            setProducts(Array.isArray(productsData) ? productsData : []);
        } catch (error) {
            console.error("Error loading products:", error);
            showError("Failed to load products.");
        } finally {
            setLoadingProducts(false);
            setLoading(false);
        }
    };

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
            await salesApi.setDiscount(
                discountForm.productIds,
                parseFloat(discountForm.discountPercent)
            );
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
                productIds: isSelected
                    ? prev.productIds.filter((id) => id !== productId)
                    : [...prev.productIds, productId],
            };
        });
    };

    const formatCurrency = (amount) => {
        if (!amount) return "₺0.00";
        return new Intl.NumberFormat("tr-TR", {
            style: "currency",
            currency: "TRY",
        }).format(amount);
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
            
            // Create blob and download
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
            
            // Create blob and open in new window for printing
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
                    <div
                        style={{
                            display: "flex",
                            gap: "1rem",
                            marginBottom: "2rem",
                            borderBottom: "2px solid #e2e8f0",
                        }}
                    >
                        {[
                            { id: "pricing", label: "💰 Price Management", icon: "💰" },
                            { id: "discount", label: "🎯 Discount Management", icon: "🎯" },
                            { id: "invoices", label: "📄 Invoice Management", icon: "📄" },
                            { id: "revenue", label: "📊 Revenue & Profit", icon: "📊" },
                            { id: "refunds", label: "💳 Refund Management", icon: "💳" },
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

                    {/* Pricing Tab */}
                    {activeTab === "pricing" && (
                        <div>
                            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1.5rem", color: "#2d3748" }}>
                                Set Product Price
                            </h2>
                            <form
                                onSubmit={handleSetPrice}
                                style={{
                                    background: "#f7fafc",
                                    padding: "1.5rem",
                                    borderRadius: "4px",
                                    marginBottom: "2rem",
                                }}
                            >
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "1rem", alignItems: "end" }}>
                                    <div>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, color: "#2d3748", fontSize: "0.85rem" }}>
                                            Select Product
                                        </label>
                                        <CustomSelect
                                            value={priceForm.productId}
                                            onChange={(e) => setPriceForm({ ...priceForm, productId: e.target.value })}
                                            options={[
                                                { value: "", label: "Select a product..." },
                                                ...products.map((product) => ({
                                                    value: product.productId,
                                                    label: `${product.productName} - ${formatCurrency(product.price)}`
                                                }))
                                            ]}
                                            placeholder="Select a product..."
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, color: "#2d3748" }}>
                                            New Price (₺)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={priceForm.price}
                                            onChange={(e) => setPriceForm({ ...priceForm, price: e.target.value })}
                                            required
                                            style={{
                                                width: "100%",
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
                                        Update Price
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Discount Tab */}
                    {activeTab === "discount" && (
                        <div>
                            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1.5rem", color: "#2d3748" }}>
                                Apply Discount to Products
                            </h2>
                            <form
                                onSubmit={handleSetDiscount}
                                style={{
                                    background: "#f7fafc",
                                    padding: "1.5rem",
                                    borderRadius: "4px",
                                    marginBottom: "2rem",
                                }}
                            >
                                <div style={{ marginBottom: "1.5rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, color: "#2d3748", fontSize: "0.85rem" }}>
                                        Discount Rate (%)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        value={discountForm.discountPercent}
                                        onChange={(e) =>
                                            setDiscountForm({ ...discountForm, discountPercent: e.target.value })
                                        }
                                        required
                                        style={{
                                            width: "100%",
                                            maxWidth: "300px",
                                            padding: "0.75rem",
                                            borderRadius: "4px",
                                            border: "2px solid #e2e8f0",
                                            fontSize: "0.85rem",
                                            backgroundColor: "#fff",
                                            color: "#2d3748",
                                        }}
                                    />
                                </div>
                                <div style={{ marginBottom: "1.5rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, color: "#2d3748", fontSize: "0.85rem" }}>
                                        Products to Apply Discount ({discountForm.productIds.length} selected)
                                    </label>
                                    <div
                                        style={{
                                            maxHeight: "300px",
                                            overflowY: "auto",
                                            border: "1px solid #e2e8f0",
                                            borderRadius: "4px",
                                            padding: "1rem",
                                            background: "#fff",
                                        }}
                                    >
                                        {loadingProducts ? (
                                            <div style={{ color: "#2d3748" }}>Loading...</div>
                                        ) : products.length === 0 ? (
                                            <div style={{ color: "#2d3748" }}>No products found.</div>
                                        ) : (
                                            products.map((product) => {
                                                const isSelected = discountForm.productIds.includes(product.productId);
                                                return (
                                                    <div
                                                        key={product.productId}
                                                        onClick={() => toggleProductSelection(product.productId)}
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: "1rem",
                                                            padding: "0.75rem",
                                                            marginBottom: "0.5rem",
                                                            borderRadius: "4px",
                                                            cursor: "pointer",
                                                            background: isSelected ? "#667eea" : "#fff",
                                                            border: `2px solid ${isSelected ? "#667eea" : "#e2e8f0"}`,
                                                            transition: "all 0.2s",
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (!isSelected) {
                                                                e.currentTarget.style.background = "#667eea";
                                                                e.currentTarget.style.borderColor = "#667eea";
                                                                const textElements = e.currentTarget.querySelectorAll("div");
                                                                textElements.forEach(el => {
                                                                    if (el.style.color !== "#e53e3e") {
                                                                        el.style.color = "#fff";
                                                                    }
                                                                });
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (!isSelected) {
                                                                e.currentTarget.style.background = "#fff";
                                                                e.currentTarget.style.borderColor = "#e2e8f0";
                                                                const textElements = e.currentTarget.querySelectorAll("div");
                                                                textElements.forEach(el => {
                                                                    if (el.style.color !== "#e53e3e") {
                                                                        el.style.color = "#2d3748";
                                                                    }
                                                                });
                                                            }
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleProductSelection(product.productId)}
                                                            style={{ cursor: "pointer" }}
                                                        />
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontWeight: 600, color: "#2d3748" }}>{product.productName}</div>
                                                            <div style={{ color: "#718096", fontSize: "0.85rem" }}>
                                                                {formatCurrency(product.price)}
                                                                {product.discount > 0 && (
                                                                    <span style={{ marginLeft: "0.5rem", color: "#e53e3e" }}>
                                                                        (%{product.discount} discount)
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
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
                                    Apply Discount
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Invoice Management Tab */}
                    {activeTab === "invoices" && (
                        <div>
                            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1.5rem", color: "#2d3748" }}>
                                Invoice Management
                            </h2>
                            
                            {/* Date Range Selector */}
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
                                    onMouseEnter={(e) => {
                                        if (!loadingInvoices) {
                                            e.currentTarget.style.background = "#667eea";
                                            e.currentTarget.style.color = "#fff";
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!loadingInvoices) {
                                            e.currentTarget.style.background = "#fff";
                                            e.currentTarget.style.color = "#667eea";
                                        }
                                    }}
                                >
                                    {loadingInvoices ? "Loading..." : "Load Invoices"}
                                </button>
                            </div>

                            {/* Invoice List */}
                            {loadingInvoices ? (
                                <div style={{ textAlign: "center", padding: "2rem", color: "#718096" }}>Loading invoices...</div>
                            ) : invoices.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "2rem", color: "#718096" }}>No invoices found for the selected date range.</div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                    {invoices.map((invoice) => (
                                        <div
                                            key={invoice.invoiceId || invoice.id}
                                            style={{
                                                padding: "1.5rem",
                                                background: "#f7fafc",
                                                borderRadius: "4px",
                                                border: "2px solid #e2e8f0",
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontSize: "1rem", fontWeight: 600, color: "#2d3748", marginBottom: "0.25rem" }}>
                                                    Invoice #{invoice.invoiceId || invoice.id}
                                                </div>
                                                <div style={{ fontSize: "0.85rem", color: "#718096" }}>
                                                    Order ID: {invoice.orderId} | Date: {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : "N/A"}
                                                </div>
                                                {invoice.totalAmount && (
                                                    <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#667eea", marginTop: "0.5rem" }}>
                                                        Total: {formatCurrency(invoice.totalAmount)}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                                <button
                                                    onClick={() => handlePrintInvoice(invoice)}
                                                    style={{
                                                        padding: "0.5rem 1rem",
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
                                                    🖨️ Print
                                                </button>
                                                <button
                                                    onClick={() => handleDownloadInvoicePdf(invoice)}
                                                    style={{
                                                        padding: "0.5rem 1rem",
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
                            
                            {/* Date Range Selector */}
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
                                    onMouseEnter={(e) => {
                                        if (!loadingMetrics) {
                                            e.currentTarget.style.background = "#667eea";
                                            e.currentTarget.style.color = "#fff";
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!loadingMetrics) {
                                            e.currentTarget.style.background = "#fff";
                                            e.currentTarget.style.color = "#667eea";
                                        }
                                    }}
                                >
                                    {loadingMetrics ? "Loading..." : "Load Metrics"}
                                </button>
                            </div>

                            {/* Metrics Summary */}
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
                                        <div style={{ padding: "1.5rem", background: metrics.totalProfit >= 0 ? "#f0fff4" : "#fff5f5", borderRadius: "4px", border: `2px solid ${metrics.totalProfit >= 0 ? "#2f855a" : "#e53e3e"}` }}>
                                            <div style={{ fontSize: "0.85rem", color: metrics.totalProfit >= 0 ? "#2f855a" : "#e53e3e", fontWeight: 600, marginBottom: "0.5rem" }}>Total Profit</div>
                                            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#2d3748" }}>
                                                {formatCurrency(metrics.totalProfit || 0)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Chart */}
                                    {metrics.points && metrics.points.length > 0 ? (
                                        <div style={{ padding: "1.5rem", background: "#fff", borderRadius: "4px", border: "2px solid #e2e8f0" }}>
                                            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1.5rem", color: "#2d3748" }}>Daily Revenue & Profit Chart</h3>
                                            
                                            {/* Chart Container */}
                                            <div style={{ position: "relative", height: "450px", paddingLeft: "80px", paddingBottom: "50px", paddingRight: "20px", paddingTop: "20px" }}>
                                                {/* Y-Axis Labels */}
                                                <div style={{ position: "absolute", left: 0, top: "20px", bottom: "50px", width: "70px", display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "flex-end", paddingRight: "10px" }}>
                                                    {(() => {
                                                        const maxValue = Math.max(
                                                            ...metrics.points.map(p => Math.max(parseFloat(p.revenue || 0), parseFloat(p.cost || 0)))
                                                        );
                                                        const steps = 5;
                                                        const stepValue = maxValue / steps;
                                                        return Array.from({ length: steps + 1 }, (_, i) => {
                                                            const value = maxValue - (stepValue * i);
                                                            return (
                                                                <div key={i} style={{ fontSize: "0.75rem", color: "#718096", fontWeight: 500 }}>
                                                                    {formatCurrency(value)}
                                                                </div>
                                                            );
                                                        });
                                                    })()}
                                                </div>

                                                {/* Chart Area */}
                                                <div style={{ height: "100%", position: "relative", marginTop: "20px" }}>
                                                    {/* Grid Lines */}
                                                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", pointerEvents: "none" }}>
                                                        {Array.from({ length: 6 }, (_, i) => (
                                                            <div key={i} style={{ borderTop: "1px solid #e2e8f0", width: "100%" }}></div>
                                                        ))}
                                                    </div>

                                                    {/* Bars Container */}
                                                    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", height: "100%", gap: "12px", paddingBottom: "50px" }}>
                                                        {metrics.points.map((point, index) => {
                                                            const date = new Date(point.date);
                                                            const dateStr = date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
                                                            const revenue = parseFloat(point.revenue || 0);
                                                            const profit = parseFloat(point.profit || 0);
                                                            const cost = parseFloat(point.cost || 0);
                                                            
                                                            const maxValue = Math.max(
                                                                ...metrics.points.map(p => Math.max(parseFloat(p.revenue || 0), parseFloat(p.cost || 0)))
                                                            );
                                                            
                                                            const revenueHeight = maxValue > 0 ? (revenue / maxValue) * 100 : 0;
                                                            const profitHeight = maxValue > 0 ? (Math.abs(profit) / maxValue) * 100 : 0;
                                                            
                                                            return (
                                                                <div key={index} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", width: "100px" }}>
                                                                    {/* Bar Group */}
                                                                    <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", width: "100%", height: "100%", justifyContent: "center" }}>
                                                                        {/* Revenue Bar */}
                                                                        {revenue > 0 && (
                                                                            <div
                                                                                style={{
                                                                                    width: "48%",
                                                                                    height: `${revenueHeight}%`,
                                                                                    background: "#667eea",
                                                                                    borderRadius: "4px 4px 0 0",
                                                                                    minHeight: revenueHeight > 0 ? "12px" : "0",
                                                                                    cursor: "pointer",
                                                                                    transition: "all 0.2s",
                                                                                    position: "relative",
                                                                                    boxShadow: "0 2px 4px rgba(102, 126, 234, 0.2)",
                                                                                }}
                                                                                title={`Revenue: ${formatCurrency(revenue)}`}
                                                                                onMouseEnter={(e) => {
                                                                                    e.currentTarget.style.opacity = "0.85";
                                                                                    e.currentTarget.style.transform = "translateY(-4px)";
                                                                                    e.currentTarget.style.boxShadow = "0 4px 8px rgba(102, 126, 234, 0.3)";
                                                                                }}
                                                                                onMouseLeave={(e) => {
                                                                                    e.currentTarget.style.opacity = "1";
                                                                                    e.currentTarget.style.transform = "translateY(0)";
                                                                                    e.currentTarget.style.boxShadow = "0 2px 4px rgba(102, 126, 234, 0.2)";
                                                                                }}
                                                                            />
                                                                        )}
                                                                        
                                                                        {/* Profit/Loss Bar */}
                                                                        {profit !== 0 && (
                                                                            <div
                                                                                style={{
                                                                                    width: "48%",
                                                                                    height: `${profitHeight}%`,
                                                                                    background: profit >= 0 ? "#2f855a" : "#e53e3e",
                                                                                    borderRadius: profit >= 0 ? "4px 4px 0 0" : "4px 4px 0 0",
                                                                                    minHeight: profitHeight > 0 ? "12px" : "0",
                                                                                    cursor: "pointer",
                                                                                    transition: "all 0.2s",
                                                                                    boxShadow: profit >= 0 ? "0 2px 4px rgba(47, 133, 90, 0.2)" : "0 2px 4px rgba(229, 62, 62, 0.2)",
                                                                                }}
                                                                                title={`Profit: ${formatCurrency(profit)}`}
                                                                                onMouseEnter={(e) => {
                                                                                    e.currentTarget.style.opacity = "0.85";
                                                                                    e.currentTarget.style.transform = "translateY(-4px)";
                                                                                    e.currentTarget.style.boxShadow = profit >= 0 
                                                                                        ? "0 4px 8px rgba(47, 133, 90, 0.3)" 
                                                                                        : "0 4px 8px rgba(229, 62, 62, 0.3)";
                                                                                }}
                                                                                onMouseLeave={(e) => {
                                                                                    e.currentTarget.style.opacity = "1";
                                                                                    e.currentTarget.style.transform = "translateY(0)";
                                                                                    e.currentTarget.style.boxShadow = profit >= 0 
                                                                                        ? "0 2px 4px rgba(47, 133, 90, 0.2)" 
                                                                                        : "0 2px 4px rgba(229, 62, 62, 0.2)";
                                                                                }}
                                                                            />
                                                                        )}
                                                                    </div>
                                                                    
                                                                    {/* Date Label */}
                                                                    <div style={{ fontSize: "0.8rem", color: "#718096", textAlign: "center", fontWeight: 500, marginTop: "4px" }}>
                                                                        {dateStr}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Legend */}
                                            <div style={{ display: "flex", gap: "2rem", justifyContent: "center", marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid #e2e8f0" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                                    <div style={{ width: "16px", height: "16px", background: "#667eea", borderRadius: "4px" }}></div>
                                                    <span style={{ fontSize: "0.85rem", color: "#2d3748", fontWeight: 500 }}>Revenue</span>
                                                </div>
                                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                                    <div style={{ width: "16px", height: "16px", background: "#2f855a", borderRadius: "4px" }}></div>
                                                    <span style={{ fontSize: "0.85rem", color: "#2d3748", fontWeight: 500 }}>Profit</span>
                                                </div>
                                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                                    <div style={{ width: "16px", height: "16px", background: "#e53e3e", borderRadius: "4px" }}></div>
                                                    <span style={{ fontSize: "0.85rem", color: "#2d3748", fontWeight: 500 }}>Loss</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: "center", padding: "2rem", color: "#718096" }}>No data available for the selected date range.</div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ textAlign: "center", padding: "2rem", color: "#718096" }}>Select a date range and click "Load Metrics" to view revenue and profit analysis.</div>
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
                                    setLoadingRefunds(true);
                                    try {
                                        const response = await salesApi.getPendingRefunds();
                                        const refundsData = response.data?.data || response.data || [];
                                        setPendingRefunds(Array.isArray(refundsData) ? refundsData : []);
                                    } catch (error) {
                                        console.error("Error loading refunds:", error);
                                        showError(error.response?.data?.message || "Failed to load refund requests.");
                                    } finally {
                                        setLoadingRefunds(false);
                                    }
                                }}
                                disabled={loadingRefunds}
                                style={{
                                    padding: "0.75rem 1.5rem",
                                    background: "#667eea",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "4px",
                                    fontSize: "0.85rem",
                                    fontWeight: 600,
                                    cursor: loadingRefunds ? "not-allowed" : "pointer",
                                    marginBottom: "1.5rem",
                                    transition: "all 0.2s",
                                }}
                                onMouseEnter={(e) => {
                                    if (!loadingRefunds) {
                                        e.currentTarget.style.background = "#764ba2";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!loadingRefunds) {
                                        e.currentTarget.style.background = "#667eea";
                                    }
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
                                                        Refund Amount: <span style={{ color: "#667eea" }}>${refund.refundAmount?.toFixed(2) || "0.00"}</span>
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
                                                    <button
                                                        onClick={async () => {
                                                            setDecidingRefund({ ...decidingRefund, [refund.refundId]: true });
                                                            try {
                                                                await salesApi.decideRefund(
                                                                    refund.refundId,
                                                                    true,
                                                                    decisionNote[refund.refundId] || null
                                                                );
                                                                showSuccess("Refund approved successfully!");
                                                                setDecisionNote({ ...decisionNote, [refund.refundId]: "" });
                                                                // Reload refunds
                                                                const response = await salesApi.getPendingRefunds();
                                                                const refundsData = response.data?.data || response.data || [];
                                                                setPendingRefunds(Array.isArray(refundsData) ? refundsData : []);
                                                            } catch (error) {
                                                                console.error("Error approving refund:", error);
                                                                showError(error.response?.data?.message || "Failed to approve refund.");
                                                            } finally {
                                                                setDecidingRefund({ ...decidingRefund, [refund.refundId]: false });
                                                            }
                                                        }}
                                                        disabled={decidingRefund[refund.refundId]}
                                                        style={{
                                                            flex: 1,
                                                            padding: "0.75rem 1.5rem",
                                                            background: "#2f855a",
                                                            color: "#fff",
                                                            border: "none",
                                                            borderRadius: "4px",
                                                            fontSize: "0.85rem",
                                                            fontWeight: 600,
                                                            cursor: decidingRefund[refund.refundId] ? "not-allowed" : "pointer",
                                                            transition: "all 0.2s",
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (!decidingRefund[refund.refundId]) {
                                                                e.currentTarget.style.background = "#22543d";
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (!decidingRefund[refund.refundId]) {
                                                                e.currentTarget.style.background = "#2f855a";
                                                            }
                                                        }}
                                                    >
                                                        {decidingRefund[refund.refundId] ? "Approving..." : "Approve Refund"}
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            setDecidingRefund({ ...decidingRefund, [refund.refundId]: true });
                                                            try {
                                                                await salesApi.decideRefund(
                                                                    refund.refundId,
                                                                    false,
                                                                    decisionNote[refund.refundId] || null
                                                                );
                                                                showSuccess("Refund rejected.");
                                                                setDecisionNote({ ...decisionNote, [refund.refundId]: "" });
                                                                // Reload refunds
                                                                const response = await salesApi.getPendingRefunds();
                                                                const refundsData = response.data?.data || response.data || [];
                                                                setPendingRefunds(Array.isArray(refundsData) ? refundsData : []);
                                                            } catch (error) {
                                                                console.error("Error rejecting refund:", error);
                                                                showError(error.response?.data?.message || "Failed to reject refund.");
                                                            } finally {
                                                                setDecidingRefund({ ...decidingRefund, [refund.refundId]: false });
                                                            }
                                                        }}
                                                        disabled={decidingRefund[refund.refundId]}
                                                        style={{
                                                            flex: 1,
                                                            padding: "0.75rem 1.5rem",
                                                            background: "#e53e3e",
                                                            color: "#fff",
                                                            border: "none",
                                                            borderRadius: "4px",
                                                            fontSize: "0.85rem",
                                                            fontWeight: 600,
                                                            cursor: decidingRefund[refund.refundId] ? "not-allowed" : "pointer",
                                                            transition: "all 0.2s",
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (!decidingRefund[refund.refundId]) {
                                                                e.currentTarget.style.background = "#c53030";
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (!decidingRefund[refund.refundId]) {
                                                                e.currentTarget.style.background = "#e53e3e";
                                                            }
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
                </div>
            </div>
        </div>
    );
}

