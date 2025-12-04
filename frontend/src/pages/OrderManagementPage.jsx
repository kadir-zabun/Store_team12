import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import orderApi from "../api/orderApi";
import { useToast } from "../contexts/ToastContext";
import { useUserRole } from "../hooks/useUserRole";

export default function OrderManagementPage() {
    const [userName, setUserName] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("");
    const [updatingStatus, setUpdatingStatus] = useState({});
    const [selectedStatus, setSelectedStatus] = useState({});
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

                // Load orders
                await loadOrders();
            } catch (error) {
                console.error("Error loading data:", error);
                showError("Failed to load data. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [navigate, userRole, showError, statusFilter]);

    const loadOrders = async () => {
        try {
            // Backend endpoint /api/orders returns orders for the authenticated product owner
            // It uses JWT to get username and filters orders by owner's products
            console.log("Fetching orders with status filter:", statusFilter || null);
            const response = await orderApi.getAllOrders(statusFilter || null);
            console.log("Orders response:", response);
            console.log("Orders response.data:", response.data);
            
            // Handle both wrapped and direct response formats
            // Backend uses RestResponseAdvice which wraps responses in ApiResponse
            let ordersData = [];
            if (response.data) {
                // Check if response is wrapped (has success/data structure)
                if (response.data.success !== undefined && response.data.data !== undefined) {
                    ordersData = response.data.data || [];
                } else if (Array.isArray(response.data)) {
                    // Direct array response
                    ordersData = response.data;
                } else {
                    ordersData = [];
                }
            }
            
            console.log("Orders data (parsed):", ordersData);
            console.log("Orders count:", ordersData.length);
            setOrders(Array.isArray(ordersData) ? ordersData : []);
        } catch (error) {
            console.error("Error loading orders:", error);
            console.error("Error response:", error.response);
            showError(error.response?.data?.message || error.message || "Failed to load orders. Please try again.");
        }
    };

    const handleUpdateStatus = async (orderId) => {
        const newStatus = selectedStatus[orderId];
        if (!newStatus) {
            showError("Please select a status.");
            return;
        }

        setUpdatingStatus({ ...updatingStatus, [orderId]: true });
        try {
            await orderApi.updateOrderStatus(orderId, newStatus);
            showSuccess("Order status updated successfully!");
            setSelectedStatus({ ...selectedStatus, [orderId]: "" });
            await loadOrders();
        } catch (error) {
            console.error("Error updating order status:", error);
            showError(error.response?.data?.message || "Failed to update order status. Please try again.");
        } finally {
            setUpdatingStatus({ ...updatingStatus, [orderId]: false });
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

    const getStatusColor = (status) => {
        switch (status) {
            case "DELIVERED":
                return "#2f855a";
            case "PROCESSING":
                return "#3182ce";
            case "IN_TRANSIT":
                return "#d69e2e";
            case "CANCELLED":
                return "#e53e3e";
            default:
                return "#718096";
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
                        <Link to="/owner/products" style={{ color: "#4a5568", textDecoration: "none", padding: "0.5rem 1rem", borderRadius: "8px", fontWeight: 500 }}>
                            Products
                        </Link>
                        <Link to="/owner/orders" style={{ color: "#667eea", textDecoration: "none", padding: "0.5rem 1rem", borderRadius: "8px", fontWeight: 600, background: "#f7fafc" }}>
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
                        <h1 style={{ fontSize: "2.5rem", fontWeight: 700, color: "#2d3748" }}>Order Management</h1>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                            <label style={{ fontWeight: 600, color: "#4a5568" }}>Filter by Status:</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                style={{
                                    padding: "0.5rem 1rem",
                                    borderRadius: "8px",
                                    border: "2px solid #e2e8f0",
                                    fontSize: "1rem",
                                    background: "#fff",
                                    cursor: "pointer",
                                }}
                            >
                                <option value="">All Orders</option>
                                <option value="PROCESSING">Processing</option>
                                <option value="IN_TRANSIT">In Transit</option>
                                <option value="DELIVERED">Delivered</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>
                    </div>

                    {!Array.isArray(orders) || orders.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "3rem", color: "#718096" }}>
                            No orders found.
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                            {orders.map((order) => (
                                <div
                                    key={order.orderId || order.id}
                                    style={{
                                        padding: "1.5rem",
                                        background: "#f7fafc",
                                        borderRadius: "12px",
                                        border: "1px solid #e2e8f0",
                                    }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                                        <div>
                                            <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "#2d3748", marginBottom: "0.25rem" }}>
                                                Order #{order.orderId || order.id}
                                            </div>
                                            <div style={{ fontSize: "0.9rem", color: "#718096" }}>
                                                Customer ID: {order.customerId} | Date: {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : "N/A"}
                                            </div>
                                        </div>
                                        <div
                                            style={{
                                                padding: "0.5rem 1rem",
                                                background: getStatusColor(order.status),
                                                color: "#fff",
                                                borderRadius: "8px",
                                                fontWeight: 600,
                                                fontSize: "0.9rem",
                                            }}
                                        >
                                            {order.status || "PROCESSING"}
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: "1rem" }}>
                                        <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "#4a5568", marginBottom: "0.5rem" }}>Items:</h3>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                            {order.items && order.items.map((item, index) => (
                                                <div
                                                    key={index}
                                                    style={{
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        padding: "0.5rem",
                                                        background: "#fff",
                                                        borderRadius: "6px",
                                                    }}
                                                >
                                                    <div style={{ fontSize: "0.9rem" }}>
                                                        {item.productName || `Product ${item.productId}`} (Qty: {item.quantity})
                                                    </div>
                                                    <div style={{ fontWeight: 600, color: "#667eea" }}>
                                                        ${((item.priceAtPurchase || item.price || 0) * item.quantity).toFixed(2)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "1rem", borderTop: "2px solid #e2e8f0" }}>
                                        <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#2d3748" }}>
                                            Total: <span style={{ color: "#667eea" }}>${(order.totalPrice || 0).toFixed(2)}</span>
                                        </div>
                                        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                                            <select
                                                value={selectedStatus[order.orderId || order.id] || order.status}
                                                onChange={(e) => setSelectedStatus({ ...selectedStatus, [order.orderId || order.id]: e.target.value })}
                                                style={{
                                                    padding: "0.5rem 1rem",
                                                    borderRadius: "8px",
                                                    border: "2px solid #e2e8f0",
                                                    fontSize: "0.9rem",
                                                    background: "#fff",
                                                    cursor: "pointer",
                                                }}
                                            >
                                                <option value="PROCESSING">Processing</option>
                                                <option value="IN_TRANSIT">In Transit</option>
                                                <option value="DELIVERED">Delivered</option>
                                                <option value="CANCELLED">Cancelled</option>
                                            </select>
                                            <button
                                                onClick={() => handleUpdateStatus(order.orderId || order.id)}
                                                disabled={updatingStatus[order.orderId || order.id] || (selectedStatus[order.orderId || order.id] || order.status) === order.status}
                                                style={{
                                                    padding: "0.5rem 1rem",
                                                    background: updatingStatus[order.orderId || order.id] || (selectedStatus[order.orderId || order.id] || order.status) === order.status
                                                        ? "#cbd5e0"
                                                        : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                                    color: "#fff",
                                                    border: "none",
                                                    borderRadius: "8px",
                                                    fontWeight: 600,
                                                    cursor: updatingStatus[order.orderId || order.id] || (selectedStatus[order.orderId || order.id] || order.status) === order.status
                                                        ? "not-allowed"
                                                        : "pointer",
                                                    fontSize: "0.9rem",
                                                }}
                                            >
                                                {updatingStatus[order.orderId || order.id] ? "Updating..." : "Update Status"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

