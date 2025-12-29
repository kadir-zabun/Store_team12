import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useUserRole } from "../hooks/useUserRole";
import { useToast } from "../contexts/ToastContext";

export default function OwnerDashboard() {
    const navigate = useNavigate();
    const userRole = useUserRole();
    const { info: showInfo } = useToast();

    // Redirect if not PRODUCT_MANAGER
    useEffect(() => {
        if (userRole !== "PRODUCT_MANAGER") {
            navigate("/");
        }
    }, [userRole, navigate]);

    return (
        <div style={{ minHeight: "calc(100vh - 80px)", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
            <div
                style={{
                    padding: "4rem 2rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                }}
            >
                <div
                    style={{
                        background: "rgba(255, 255, 255, 0.95)",
                        backdropFilter: "blur(10px)",
                        borderRadius: "20px",
                        padding: "3rem",
                        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
                        maxWidth: "1200px",
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
                        Product Manager Dashboard
                    </h1>
                    <p style={{ color: "#718096", fontSize: "1.1rem", marginBottom: "2rem" }}>
                        Welcome! Manage your products and orders from here.
                    </p>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                            gap: "2rem",
                            marginTop: "2rem",
                        }}
                    >
                        <Link
                            to="/owner/products"
                            style={{
                                background: "#f7fafc",
                                padding: "2rem",
                                borderRadius: "12px",
                                border: "1px solid #e2e8f0",
                                cursor: "pointer",
                                transition: "all 0.3s",
                                textDecoration: "none",
                                color: "inherit",
                                display: "block",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "translateY(-4px)";
                                e.currentTarget.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.1)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "translateY(0)";
                                e.currentTarget.style.boxShadow = "none";
                            }}
                        >
                            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📦</div>
                            <h3 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#2d3748", marginBottom: "0.5rem" }}>
                                Product Management
                            </h3>
                            <p style={{ color: "#718096" }}>
                                Add, edit, and manage your products. Update inventory and pricing.
                            </p>
                        </Link>

                        <Link
                            to="/owner/orders"
                            style={{
                                background: "#f7fafc",
                                padding: "2rem",
                                borderRadius: "12px",
                                border: "1px solid #e2e8f0",
                                cursor: "pointer",
                                transition: "all 0.3s",
                                textDecoration: "none",
                                color: "inherit",
                                display: "block",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "translateY(-4px)";
                                e.currentTarget.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.1)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "translateY(0)";
                                e.currentTarget.style.boxShadow = "none";
                            }}
                        >
                            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📋</div>
                            <h3 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#2d3748", marginBottom: "0.5rem" }}>
                                Order Management
                            </h3>
                            <p style={{ color: "#718096" }}>
                                View and manage customer orders. Update order status and track shipments.
                            </p>
                        </Link>

                        <Link
                            to="/owner/reviews"
                            style={{
                                background: "#f7fafc",
                                padding: "2rem",
                                borderRadius: "12px",
                                border: "1px solid #e2e8f0",
                                cursor: "pointer",
                                transition: "all 0.3s",
                                textDecoration: "none",
                                color: "inherit",
                                display: "block",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "translateY(-4px)";
                                e.currentTarget.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.1)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "translateY(0)";
                                e.currentTarget.style.boxShadow = "none";
                            }}
                        >
                            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⭐</div>
                            <h3 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#2d3748", marginBottom: "0.5rem" }}>
                                Review Management
                            </h3>
                            <p style={{ color: "#718096" }}>
                                Approve or reject product reviews from customers.
                            </p>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

