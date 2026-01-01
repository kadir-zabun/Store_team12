import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import orderApi from "../api/orderApi";
import { useToast } from "../contexts/ToastContext";
import { useUserRole } from "../hooks/useUserRole";
import CustomSelect from "../components/CustomSelect";

export default function OrderManagementPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("");
    const [updatingStatus, setUpdatingStatus] = useState({});
    const [selectedStatus, setSelectedStatus] = useState({});
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
            // Backend endpoint /api/orders returns orders for the authenticated product manager
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
            
            // Sort orders by date (newest first) - add to top
            const sortedOrders = Array.isArray(ordersData) ? [...ordersData].sort((a, b) => {
                const dateA = a.orderDate ? new Date(a.orderDate).getTime() : 0;
                const dateB = b.orderDate ? new Date(b.orderDate).getTime() : 0;
                return dateB - dateA; // Descending order (newest first)
            }) : [];
            
            setOrders(sortedOrders);
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

    // If not PRODUCT_MANAGER, show message (will redirect in useEffect)
    if (currentRole !== "PRODUCT_MANAGER") {
        return (
            <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ background: "rgba(255, 255, 255, 0.95)", padding: "2rem", borderRadius: "20px", textAlign: "center" }}>
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
                        <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#2d3748" }}>Order Management</h1>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                            <label style={{ fontWeight: 600, color: "#4a5568", fontSize: "0.85rem" }}>Filter by Status:</label>
                            <CustomSelect
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                options={[
                                    { value: "", label: "All Orders" },
                                    { value: "PROCESSING", label: "Processing" },
                                    { value: "IN_TRANSIT", label: "In Transit" },
                                    { value: "DELIVERED", label: "Delivered" },
                                    { value: "CANCELLED", label: "Cancelled" }
                                ]}
                                placeholder="All Orders"
                                minWidth="150px"
                            />
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
                                        borderRadius: "4px",
                                        border: "2px solid #e2e8f0",
                                    }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                                        <div>
                                            <div style={{ fontSize: "1rem", fontWeight: 600, color: "#2d3748", marginBottom: "0.25rem" }}>
                                                Order #{order.orderId || order.id}
                                            </div>
                                            <div style={{ fontSize: "0.85rem", color: "#718096" }}>
                                                Customer ID: {order.customerId} | Date: {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : "N/A"}
                                            </div>
                                        </div>
                                        <div
                                            style={{
                                                padding: "0.5rem 1rem",
                                                background: getStatusColor(order.status),
                                                color: "#fff",
                                                borderRadius: "4px",
                                                fontWeight: 600,
                                                fontSize: "0.85rem",
                                            }}
                                        >
                                            {order.status || "PROCESSING"}
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: "1rem" }}>
                                        <h3 style={{ fontSize: "0.85rem", fontWeight: 600, color: "#4a5568", marginBottom: "0.5rem" }}>Items:</h3>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                            {order.items && Array.isArray(order.items) && order.items.length > 0 ? (
                                                order.items.map((item, index) => {
                                                    const productName = item.productName || `Product ${item.productId || "Unknown"}`;
                                                    const productId = item.productId || "N/A";
                                                    const quantity = item.quantity || 0;
                                                    const price = item.priceAtPurchase || item.price || 0;
                                                    const subtotal = price * quantity;
                                                    
                                                    return (
                                                        <div
                                                            key={index}
                                                            style={{
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: "1rem",
                                                                padding: "0.75rem",
                                                                background: "#fff",
                                                                borderRadius: "4px",
                                                                border: "2px solid #e2e8f0",
                                                            }}
                                                        >
                                                            {/* Product Image */}
                                                            <div style={{ flexShrink: 0 }}>
                                                                {item.imageUrl ? (
                                                                    <img
                                                                        src={item.imageUrl}
                                                                        alt={productName}
                                                                        style={{
                                                                            width: "60px",
                                                                            height: "60px",
                                                                            objectFit: "cover",
                                                                            borderRadius: "4px",
                                                                            border: "1px solid #e2e8f0",
                                                                        }}
                                                                        onError={(e) => {
                                                                            e.target.style.display = "none";
                                                                            if (e.target.nextSibling) {
                                                                                e.target.nextSibling.style.display = "flex";
                                                                            }
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <div
                                                                        style={{
                                                                            width: "60px",
                                                                            height: "60px",
                                                                            background: "#f7fafc",
                                                                            borderRadius: "4px",
                                                                            border: "1px solid #e2e8f0",
                                                                            display: "flex",
                                                                            alignItems: "center",
                                                                            justifyContent: "center",
                                                                            fontSize: "1.5rem",
                                                                            color: "#cbd5e0",
                                                                        }}
                                                                    >
                                                                        📦
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {/* Product Info */}
                                                            <div style={{ flex: 1, fontSize: "0.85rem", color: "#2d3748" }}>
                                                                <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
                                                                    {productName}
                                                                </div>
                                                                <div style={{ fontSize: "0.8rem", color: "#718096" }}>
                                                                    Product ID: {productId} | Quantity: {quantity}
                                                                </div>
                                                            </div>
                                                            {/* Price */}
                                                            <div style={{ fontWeight: 600, color: "#667eea", fontSize: "0.9rem", marginLeft: "1rem", whiteSpace: "nowrap" }}>
                                                                ${subtotal.toFixed(2)}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div style={{ padding: "0.75rem", background: "#fff", borderRadius: "4px", color: "#718096", fontSize: "0.85rem" }}>
                                                    No items in this order
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "1rem", borderTop: "2px solid #e2e8f0" }}>
                                        <div style={{ fontSize: "1rem", fontWeight: 700, color: "#2d3748" }}>
                                            Total: <span style={{ color: "#667eea" }}>${(order.totalPrice || 0).toFixed(2)}</span>
                                        </div>
                                        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                                            <CustomSelect
                                                value={selectedStatus[order.orderId || order.id] || order.status}
                                                onChange={(e) => setSelectedStatus({ ...selectedStatus, [order.orderId || order.id]: e.target.value })}
                                                options={[
                                                    { value: "PROCESSING", label: "Processing" },
                                                    { value: "IN_TRANSIT", label: "In Transit" },
                                                    { value: "DELIVERED", label: "Delivered" },
                                                    { value: "CANCELLED", label: "Cancelled" }
                                                ]}
                                                minWidth="140px"
                                            />
                                            <button
                                                onClick={() => handleUpdateStatus(order.orderId || order.id)}
                                                disabled={updatingStatus[order.orderId || order.id] || (selectedStatus[order.orderId || order.id] || order.status) === order.status}
                                                style={{
                                                    padding: "0.5rem 1rem",
                                                    background: updatingStatus[order.orderId || order.id] || (selectedStatus[order.orderId || order.id] || order.status) === order.status
                                                        ? "#cbd5e0"
                                                        : "#fff",
                                                    color: updatingStatus[order.orderId || order.id] || (selectedStatus[order.orderId || order.id] || order.status) === order.status
                                                        ? "#718096"
                                                        : "#667eea",
                                                    border: updatingStatus[order.orderId || order.id] || (selectedStatus[order.orderId || order.id] || order.status) === order.status
                                                        ? "2px solid #cbd5e0"
                                                        : "2px solid #667eea",
                                                    borderRadius: "4px",
                                                    fontWeight: 600,
                                                    cursor: updatingStatus[order.orderId || order.id] || (selectedStatus[order.orderId || order.id] || order.status) === order.status
                                                        ? "not-allowed"
                                                        : "pointer",
                                                    fontSize: "0.85rem",
                                                    transition: "all 0.2s",
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!updatingStatus[order.orderId || order.id] && (selectedStatus[order.orderId || order.id] || order.status) !== order.status) {
                                                        e.currentTarget.style.background = "#667eea";
                                                        e.currentTarget.style.color = "#fff";
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!updatingStatus[order.orderId || order.id] && (selectedStatus[order.orderId || order.id] || order.status) !== order.status) {
                                                        e.currentTarget.style.background = "#fff";
                                                        e.currentTarget.style.color = "#667eea";
                                                    }
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

