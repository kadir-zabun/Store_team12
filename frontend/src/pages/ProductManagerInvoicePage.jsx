import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import productManagerApi from "../api/productManagerApi";
import { useToast } from "../contexts/ToastContext";
import { useUserRole } from "../hooks/useUserRole";

export default function ProductManagerInvoicePage() {
    const [userName, setUserName] = useState(null);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingInvoices, setLoadingInvoices] = useState(false);
    const [dateRange, setDateRange] = useState({
        from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0],
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

        const storedRole = localStorage.getItem("user_role");
        const currentRole = userRole || storedRole;

        if (currentRole === null || currentRole === undefined) {
            return;
        }

        if (currentRole !== "PRODUCT_MANAGER") {
            navigate("/");
            return;
        }

        const loadData = async () => {
            try {
                const payloadBase64 = token.split(".")[1];
                const normalized = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
                const payloadJson = atob(normalized);
                const payload = JSON.parse(payloadJson);
                const username = payload.sub || payload.name || payload.username;
                setUserName(username);

                await loadInvoices();
            } catch (error) {
                console.error("Error loading data:", error);
                showError("Failed to load data. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [navigate, userRole, showError]);

    const loadInvoices = async () => {
        setLoadingInvoices(true);
        try {
            const fromDate = new Date(dateRange.from);
            fromDate.setHours(0, 0, 0, 0);
            const toDate = new Date(dateRange.to);
            toDate.setHours(23, 59, 59, 999);
            
            const response = await productManagerApi.getInvoices(fromDate, toDate);
            const invoicesData = response.data?.data || response.data || [];
            setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
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
            const response = await productManagerApi.getInvoicePdf(invoiceId);
            
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
            const response = await productManagerApi.getInvoicePdf(invoiceId);
            
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

    const handleLogout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user_role");
        setUserName(null);
        setShowDropdown(false);
        navigate("/login");
    };

    const storedRole = localStorage.getItem("user_role");
    const currentRole = userRole || storedRole;

    if (loading || (currentRole === null || currentRole === undefined)) {
        return (
            <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ color: "#fff", fontSize: "1.5rem" }}>Loading...</div>
            </div>
        );
    }

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
                        <Link 
                            to="/owner-dashboard" 
                            style={{ color: "#4a5568", textDecoration: "none", padding: "0.5rem 1rem", borderRadius: "4px", fontWeight: 500, transition: "all 0.2s" }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#667eea";
                                e.currentTarget.style.color = "#fff";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.color = "#4a5568";
                            }}
                        >
                            Dashboard
                        </Link>
                        <Link 
                            to="/owner/products" 
                            style={{ color: "#4a5568", textDecoration: "none", padding: "0.5rem 1rem", borderRadius: "4px", fontWeight: 500, transition: "all 0.2s" }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#667eea";
                                e.currentTarget.style.color = "#fff";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.color = "#4a5568";
                            }}
                        >
                            Products
                        </Link>
                        <Link 
                            to="/owner/orders" 
                            style={{ color: "#4a5568", textDecoration: "none", padding: "0.5rem 1rem", borderRadius: "4px", fontWeight: 500, transition: "all 0.2s" }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#667eea";
                                e.currentTarget.style.color = "#fff";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.color = "#4a5568";
                            }}
                        >
                            Orders
                        </Link>
                        <Link 
                            to="/owner/deliveries" 
                            style={{ color: "#4a5568", textDecoration: "none", padding: "0.5rem 1rem", borderRadius: "4px", fontWeight: 500, transition: "all 0.2s" }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#667eea";
                                e.currentTarget.style.color = "#fff";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.color = "#4a5568";
                            }}
                        >
                            Deliveries
                        </Link>
                        <Link 
                            to="/owner/invoices" 
                            style={{ color: "#667eea", textDecoration: "underline", padding: "0.5rem 1rem", borderRadius: "4px", fontWeight: 600, transition: "all 0.2s" }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = "#764ba2";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = "#667eea";
                            }}
                        >
                            Invoices
                        </Link>
                        <Link 
                            to="/owner/reviews" 
                            style={{ color: "#4a5568", textDecoration: "none", padding: "0.5rem 1rem", borderRadius: "4px", fontWeight: 500, transition: "all 0.2s" }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#667eea";
                                e.currentTarget.style.color = "#fff";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.color = "#4a5568";
                            }}
                        >
                            Reviews
                        </Link>
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "1rem", position: "relative" }}>
                    {userName && (
                        <div ref={dropdownRef} style={{ position: "relative" }}
                            onMouseEnter={() => setShowDropdown(true)}
                            onMouseLeave={() => setShowDropdown(false)}
                        >
                            <button
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.6rem",
                                    padding: "0.6rem 1.2rem",
                                    borderRadius: "4px",
                                    border: "none",
                                    background: showDropdown ? "#f7fafc" : "transparent",
                                    color: showDropdown ? "#667eea" : "#4a5568",
                                    transition: "all 0.2s",
                                    fontSize: "0.95rem",
                                    fontWeight: 500,
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
                                        marginTop: "0.25rem",
                                        background: "#fff",
                                        border: "1px solid #e2e8f0",
                                        borderRadius: "4px",
                                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                                        minWidth: "200px",
                                        zIndex: 1000,
                                    }}
                                >
                                    <Link
                                        to="/owner-dashboard"
                                        style={{
                                            display: "block",
                                            padding: "0.75rem 1rem",
                                            color: "#4a5568",
                                            textDecoration: "none",
                                            fontSize: "0.9rem",
                                            transition: "all 0.2s",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = "#667eea";
                                            e.currentTarget.style.color = "#fff";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = "transparent";
                                            e.currentTarget.style.color = "#4a5568";
                                        }}
                                    >
                                        Dashboard
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        style={{
                                            width: "100%",
                                            textAlign: "left",
                                            padding: "0.75rem 1rem",
                                            background: "transparent",
                                            border: "none",
                                            color: "#e53e3e",
                                            fontSize: "0.9rem",
                                            cursor: "pointer",
                                            transition: "all 0.2s",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = "#fee";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = "transparent";
                                        }}
                                    >
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </nav>

            <div
                style={{
                    minHeight: "calc(100vh - 80px)",
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
                            fontSize: "1.75rem",
                            fontWeight: 700,
                            color: "#2d3748",
                            marginBottom: "1rem",
                        }}
                    >
                        Invoice Management
                    </h1>
                    <p style={{ color: "#718096", fontSize: "0.95rem", marginBottom: "2rem" }}>
                        View and manage invoices within a date range.
                    </p>

                    {/* Date Range Filter */}
                    <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", alignItems: "flex-end" }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#4a5568", fontSize: "0.85rem" }}>
                                From Date
                            </label>
                            <input
                                type="date"
                                value={dateRange.from}
                                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                                style={{
                                    width: "100%",
                                    padding: "0.75rem",
                                    border: "1px solid #cbd5e0",
                                    borderRadius: "4px",
                                    fontSize: "0.85rem",
                                    color: "#2d3748",
                                }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#4a5568", fontSize: "0.85rem" }}>
                                To Date
                            </label>
                            <input
                                type="date"
                                value={dateRange.to}
                                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                                style={{
                                    width: "100%",
                                    padding: "0.75rem",
                                    border: "1px solid #cbd5e0",
                                    borderRadius: "4px",
                                    fontSize: "0.85rem",
                                    color: "#2d3748",
                                }}
                            />
                        </div>
                        <button
                            onClick={loadInvoices}
                            disabled={loadingInvoices}
                            style={{
                                padding: "0.75rem 1.5rem",
                                background: "#667eea",
                                color: "#fff",
                                border: "none",
                                borderRadius: "4px",
                                fontSize: "0.85rem",
                                fontWeight: 600,
                                cursor: loadingInvoices ? "not-allowed" : "pointer",
                                transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => {
                                if (!loadingInvoices) {
                                    e.currentTarget.style.background = "#764ba2";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!loadingInvoices) {
                                    e.currentTarget.style.background = "#667eea";
                                }
                            }}
                        >
                            {loadingInvoices ? "Loading..." : "Load Invoices"}
                        </button>
                    </div>

                    {/* Invoices Table */}
                    {loadingInvoices ? (
                        <div style={{ textAlign: "center", padding: "3rem", color: "#718096" }}>
                            Loading invoices...
                        </div>
                    ) : invoices.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "3rem", color: "#718096" }}>
                            No invoices found for the selected date range.
                        </div>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                                        <th style={{ padding: "0.75rem", textAlign: "left", color: "#4a5568", fontWeight: 600, fontSize: "0.85rem" }}>Invoice ID</th>
                                        <th style={{ padding: "0.75rem", textAlign: "left", color: "#4a5568", fontWeight: 600, fontSize: "0.85rem" }}>Order ID</th>
                                        <th style={{ padding: "0.75rem", textAlign: "left", color: "#4a5568", fontWeight: 600, fontSize: "0.85rem" }}>Date</th>
                                        <th style={{ padding: "0.75rem", textAlign: "left", color: "#4a5568", fontWeight: 600, fontSize: "0.85rem" }}>Total</th>
                                        <th style={{ padding: "0.75rem", textAlign: "left", color: "#4a5568", fontWeight: 600, fontSize: "0.85rem" }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.map((invoice) => (
                                        <tr key={invoice.invoiceId || invoice.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                            <td style={{ padding: "0.75rem", color: "#2d3748", fontSize: "0.85rem" }}>{invoice.invoiceId || invoice.id}</td>
                                            <td style={{ padding: "0.75rem", color: "#2d3748", fontSize: "0.85rem" }}>{invoice.orderId}</td>
                                            <td style={{ padding: "0.75rem", color: "#2d3748", fontSize: "0.85rem" }}>
                                                {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : "N/A"}
                                            </td>
                                            <td style={{ padding: "0.75rem", color: "#2d3748", fontSize: "0.85rem" }}>
                                                ${invoice.totalAmount?.toFixed(2) || "0.00"}
                                            </td>
                                            <td style={{ padding: "0.75rem" }}>
                                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                                    <button
                                                        onClick={() => handleDownloadInvoicePdf(invoice)}
                                                        style={{
                                                            padding: "0.5rem 1rem",
                                                            background: "#667eea",
                                                            color: "#fff",
                                                            border: "none",
                                                            borderRadius: "4px",
                                                            fontSize: "0.85rem",
                                                            cursor: "pointer",
                                                            transition: "all 0.2s",
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = "#764ba2";
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = "#667eea";
                                                        }}
                                                    >
                                                        Download PDF
                                                    </button>
                                                    <button
                                                        onClick={() => handlePrintInvoice(invoice)}
                                                        style={{
                                                            padding: "0.5rem 1rem",
                                                            background: "#e2e8f0",
                                                            color: "#4a5568",
                                                            border: "none",
                                                            borderRadius: "4px",
                                                            fontSize: "0.85rem",
                                                            cursor: "pointer",
                                                            transition: "all 0.2s",
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = "#cbd5e0";
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = "#e2e8f0";
                                                        }}
                                                    >
                                                        Print
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

