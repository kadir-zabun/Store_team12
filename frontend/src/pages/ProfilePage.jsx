import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import userApi from "../api/userApi";
import { useToast } from "../contexts/ToastContext";
import { useUserRole } from "../hooks/useUserRole";

export default function ProfilePage() {
    const [userName, setUserName] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { error: showError } = useToast();
    const userRole = useUserRole();
    const dropdownRef = useRef(null);
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            navigate("/login");
            return;
        }

        if (userRole === "PRODUCT_MANAGER" || userRole === "SALES_MANAGER" || userRole === "SUPPORT_AGENT") {
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

                const response = await userApi.getMyProfile();
                const profileData = response.data?.data || response.data;
                setProfile(profileData);
            } catch (error) {
                console.error("Error loading profile:", error);
                showError("Failed to load profile. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [navigate, userRole, showError]);

    const handleLogout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user_role");
        setUserName(null);
        setShowDropdown(false);
        navigate("/login");
    };

    if (loading) {
        return (
            <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ color: "#fff", fontSize: "1.5rem" }}>Loading...</div>
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
                            to="/" 
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
                            Home
                        </Link>
                        <Link 
                            to="/products" 
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
                            to="/orders" 
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
                            to="/profile" 
                            style={{ color: "#667eea", textDecoration: "underline", padding: "0.5rem 1rem", borderRadius: "4px", fontWeight: 600, transition: "all 0.2s" }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = "#764ba2";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = "#667eea";
                            }}
                        >
                            Profile
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
                                        to="/orders"
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
                                        Order History
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
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <div
                    style={{
                        background: "rgba(255, 255, 255, 0.95)",
                        backdropFilter: "blur(10px)",
                        borderRadius: "8px",
                        padding: "2rem",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                        maxWidth: "600px",
                        width: "100%",
                    }}
                >
                    <h1
                        style={{
                            fontSize: "1.75rem",
                            fontWeight: 700,
                            color: "#2d3748",
                            marginBottom: "2rem",
                        }}
                    >
                        My Profile
                    </h1>

                    {profile ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                            <div>
                                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#4a5568", fontSize: "0.85rem" }}>
                                    Name
                                </label>
                                <div
                                    style={{
                                        padding: "0.75rem",
                                        background: "#f7fafc",
                                        borderRadius: "4px",
                                        color: "#2d3748",
                                        fontSize: "0.9rem",
                                    }}
                                >
                                    {profile.name || "N/A"}
                                </div>
                            </div>

                            <div>
                                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#4a5568", fontSize: "0.85rem" }}>
                                    Email Address
                                </label>
                                <div
                                    style={{
                                        padding: "0.75rem",
                                        background: "#f7fafc",
                                        borderRadius: "4px",
                                        color: "#2d3748",
                                        fontSize: "0.9rem",
                                    }}
                                >
                                    {profile.email || "N/A"}
                                </div>
                            </div>

                            <div>
                                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#4a5568", fontSize: "0.85rem" }}>
                                    Home Address
                                </label>
                                <div
                                    style={{
                                        padding: "0.75rem",
                                        background: "#f7fafc",
                                        borderRadius: "4px",
                                        color: "#2d3748",
                                        fontSize: "0.9rem",
                                    }}
                                >
                                    {profile.homeAddress || "N/A"}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ textAlign: "center", padding: "2rem", color: "#718096" }}>
                            Failed to load profile information.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

