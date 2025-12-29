import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import deliveryApi from "../api/deliveryApi";
import { useToast } from "../contexts/ToastContext";
import { useUserRole } from "../hooks/useUserRole";
import CustomSelect from "../components/CustomSelect";

export default function DeliveryManagementPage() {
    const [userName, setUserName] = useState(null);
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [completedFilter, setCompletedFilter] = useState("");
    const [updatingStatus, setUpdatingStatus] = useState({});
    const [editingAddress, setEditingAddress] = useState({});
    const [newAddress, setNewAddress] = useState({});
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

                await loadDeliveries();
            } catch (error) {
                console.error("Error loading data:", error);
                showError("Failed to load data. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [navigate, userRole, showError, completedFilter]);

    const loadDeliveries = async () => {
        try {
            const completed = completedFilter === "completed" ? true : completedFilter === "pending" ? false : null;
            const response = await deliveryApi.getAllDeliveries(completed);
            
            let deliveriesData = [];
            if (response.data) {
                if (response.data.success !== undefined && response.data.data !== undefined) {
                    deliveriesData = response.data.data || [];
                } else if (Array.isArray(response.data)) {
                    deliveriesData = response.data;
                }
            }
            
            setDeliveries(Array.isArray(deliveriesData) ? deliveriesData : []);
        } catch (error) {
            console.error("Error loading deliveries:", error);
            showError(error.response?.data?.message || "Failed to load deliveries. Please try again.");
        }
    };

    const handleUpdateCompleted = async (deliveryId, completed) => {
        setUpdatingStatus({ ...updatingStatus, [deliveryId]: true });
        try {
            await deliveryApi.updateCompleted(deliveryId, completed);
            showSuccess(`Delivery ${completed ? "marked as completed" : "marked as pending"} successfully!`);
            await loadDeliveries();
        } catch (error) {
            console.error("Error updating delivery:", error);
            showError(error.response?.data?.message || "Failed to update delivery status. Please try again.");
        } finally {
            setUpdatingStatus({ ...updatingStatus, [deliveryId]: false });
        }
    };

    const handleUpdateAddress = async (deliveryId) => {
        const address = newAddress[deliveryId];
        if (!address || address.trim() === "") {
            showError("Please enter a valid address.");
            return;
        }

        setUpdatingStatus({ ...updatingStatus, [`address_${deliveryId}`]: true });
        try {
            await deliveryApi.updateAddress(deliveryId, address);
            showSuccess("Delivery address updated successfully!");
            setEditingAddress({ ...editingAddress, [deliveryId]: false });
            setNewAddress({ ...newAddress, [deliveryId]: "" });
            await loadDeliveries();
        } catch (error) {
            console.error("Error updating address:", error);
            showError(error.response?.data?.message || "Failed to update address. Please try again.");
        } finally {
            setUpdatingStatus({ ...updatingStatus, [`address_${deliveryId}`]: false });
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
                            style={{ color: "#667eea", textDecoration: "underline", padding: "0.5rem 1rem", borderRadius: "4px", fontWeight: 600, transition: "all 0.2s" }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = "#764ba2";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = "#667eea";
                            }}
                        >
                            Deliveries
                        </Link>
                        <Link 
                            to="/owner/invoices" 
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
                        Delivery Management
                    </h1>
                    <p style={{ color: "#718096", fontSize: "0.95rem", marginBottom: "2rem" }}>
                        Manage deliveries and update delivery status.
                    </p>

                    {/* Filter */}
                    <div style={{ marginBottom: "2rem" }}>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#4a5568", fontSize: "0.85rem" }}>
                            Filter by Status
                        </label>
                        <CustomSelect
                            value={completedFilter}
                            onChange={(e) => setCompletedFilter(e.target.value)}
                            options={[
                                { value: "", label: "All Deliveries" },
                                { value: "pending", label: "Pending" },
                                { value: "completed", label: "Completed" },
                            ]}
                            placeholder="Select Status"
                        />
                    </div>

                    {/* Deliveries Table */}
                    {deliveries.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "3rem", color: "#718096" }}>
                            No deliveries found.
                        </div>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                                        <th style={{ padding: "0.75rem", textAlign: "left", color: "#4a5568", fontWeight: 600, fontSize: "0.85rem" }}>Delivery ID</th>
                                        <th style={{ padding: "0.75rem", textAlign: "left", color: "#4a5568", fontWeight: 600, fontSize: "0.85rem" }}>Order ID</th>
                                        <th style={{ padding: "0.75rem", textAlign: "left", color: "#4a5568", fontWeight: 600, fontSize: "0.85rem" }}>Customer ID</th>
                                        <th style={{ padding: "0.75rem", textAlign: "left", color: "#4a5568", fontWeight: 600, fontSize: "0.85rem" }}>Product ID</th>
                                        <th style={{ padding: "0.75rem", textAlign: "left", color: "#4a5568", fontWeight: 600, fontSize: "0.85rem" }}>Quantity</th>
                                        <th style={{ padding: "0.75rem", textAlign: "left", color: "#4a5568", fontWeight: 600, fontSize: "0.85rem" }}>Total Price</th>
                                        <th style={{ padding: "0.75rem", textAlign: "left", color: "#4a5568", fontWeight: 600, fontSize: "0.85rem" }}>Delivery Address</th>
                                        <th style={{ padding: "0.75rem", textAlign: "left", color: "#4a5568", fontWeight: 600, fontSize: "0.85rem" }}>Status</th>
                                        <th style={{ padding: "0.75rem", textAlign: "left", color: "#4a5568", fontWeight: 600, fontSize: "0.85rem" }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {deliveries.map((delivery) => (
                                        <tr key={delivery.deliveryId} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                            <td style={{ padding: "0.75rem", color: "#2d3748", fontSize: "0.85rem" }}>{delivery.deliveryId}</td>
                                            <td style={{ padding: "0.75rem", color: "#2d3748", fontSize: "0.85rem" }}>{delivery.orderId}</td>
                                            <td style={{ padding: "0.75rem", color: "#2d3748", fontSize: "0.85rem" }}>{delivery.customerId}</td>
                                            <td style={{ padding: "0.75rem", color: "#2d3748", fontSize: "0.85rem" }}>{delivery.productId}</td>
                                            <td style={{ padding: "0.75rem", color: "#2d3748", fontSize: "0.85rem" }}>{delivery.quantity}</td>
                                            <td style={{ padding: "0.75rem", color: "#2d3748", fontSize: "0.85rem" }}>${delivery.totalPrice?.toFixed(2) || "0.00"}</td>
                                            <td style={{ padding: "0.75rem", color: "#2d3748", fontSize: "0.85rem", maxWidth: "300px" }}>
                                                {editingAddress[delivery.deliveryId] ? (
                                                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                                        <input
                                                            type="text"
                                                            value={newAddress[delivery.deliveryId] || delivery.deliveryAddress || ""}
                                                            onChange={(e) => setNewAddress({ ...newAddress, [delivery.deliveryId]: e.target.value })}
                                                            style={{
                                                                padding: "0.5rem",
                                                                border: "1px solid #cbd5e0",
                                                                borderRadius: "4px",
                                                                fontSize: "0.85rem",
                                                                flex: 1,
                                                            }}
                                                            placeholder="Enter new address"
                                                        />
                                                        <button
                                                            onClick={() => handleUpdateAddress(delivery.deliveryId)}
                                                            disabled={updatingStatus[`address_${delivery.deliveryId}`]}
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
                                                                if (!updatingStatus[`address_${delivery.deliveryId}`]) {
                                                                    e.currentTarget.style.background = "#764ba2";
                                                                }
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                if (!updatingStatus[`address_${delivery.deliveryId}`]) {
                                                                    e.currentTarget.style.background = "#667eea";
                                                                }
                                                            }}
                                                        >
                                                            {updatingStatus[`address_${delivery.deliveryId}`] ? "Saving..." : "Save"}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingAddress({ ...editingAddress, [delivery.deliveryId]: false });
                                                                setNewAddress({ ...newAddress, [delivery.deliveryId]: "" });
                                                            }}
                                                            style={{
                                                                padding: "0.5rem 1rem",
                                                                background: "#e2e8f0",
                                                                color: "#4a5568",
                                                                border: "none",
                                                                borderRadius: "4px",
                                                                fontSize: "0.85rem",
                                                                cursor: "pointer",
                                                            }}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                                        <span>{delivery.deliveryAddress || "N/A"}</span>
                                                        <button
                                                            onClick={() => {
                                                                setEditingAddress({ ...editingAddress, [delivery.deliveryId]: true });
                                                                setNewAddress({ ...newAddress, [delivery.deliveryId]: delivery.deliveryAddress || "" });
                                                            }}
                                                            style={{
                                                                padding: "0.25rem 0.5rem",
                                                                background: "transparent",
                                                                color: "#667eea",
                                                                border: "1px solid #667eea",
                                                                borderRadius: "4px",
                                                                fontSize: "0.75rem",
                                                                cursor: "pointer",
                                                            }}
                                                        >
                                                            Edit
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: "0.75rem" }}>
                                                <span
                                                    style={{
                                                        padding: "0.25rem 0.75rem",
                                                        borderRadius: "4px",
                                                        fontSize: "0.85rem",
                                                        fontWeight: 600,
                                                        background: delivery.completed ? "#c6f6d5" : "#fed7d7",
                                                        color: delivery.completed ? "#22543d" : "#742a2a",
                                                    }}
                                                >
                                                    {delivery.completed ? "Completed" : "Pending"}
                                                </span>
                                            </td>
                                            <td style={{ padding: "0.75rem" }}>
                                                <button
                                                    onClick={() => handleUpdateCompleted(delivery.deliveryId, !delivery.completed)}
                                                    disabled={updatingStatus[delivery.deliveryId]}
                                                    style={{
                                                        padding: "0.5rem 1rem",
                                                        background: delivery.completed ? "#e2e8f0" : "#667eea",
                                                        color: delivery.completed ? "#4a5568" : "#fff",
                                                        border: "none",
                                                        borderRadius: "4px",
                                                        fontSize: "0.85rem",
                                                        cursor: updatingStatus[delivery.deliveryId] ? "not-allowed" : "pointer",
                                                        transition: "all 0.2s",
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!updatingStatus[delivery.deliveryId]) {
                                                            e.currentTarget.style.background = delivery.completed ? "#cbd5e0" : "#764ba2";
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!updatingStatus[delivery.deliveryId]) {
                                                            e.currentTarget.style.background = delivery.completed ? "#e2e8f0" : "#667eea";
                                                        }
                                                    }}
                                                >
                                                    {updatingStatus[delivery.deliveryId] ? "Updating..." : delivery.completed ? "Mark Pending" : "Mark Completed"}
                                                </button>
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

