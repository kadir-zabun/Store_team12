import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import authApi from "../api/AuthApi";
import { useToast } from "../contexts/ToastContext";
import { useUserRole } from "../hooks/useUserRole";
import { getRegisterErrorMessage } from "../utils/errorHandler";

export default function RegisterPage() {
    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [taxId, setTaxId] = useState("");
    const [role] = useState("CUSTOMER"); // Only CUSTOMER role available
    const [error, setError] = useState("");
    const [userName, setUserName] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { success: showSuccess, error: showError, info: showInfo } = useToast();
    const userRole = useUserRole();

    const extractUsernameFromToken = () => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            setUserName(null);
            return;
        }
        try {
            const payloadBase64 = token.split(".")[1];
            const normalized = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
            const payloadJson = atob(normalized);
            const payload = JSON.parse(payloadJson);
            const nameFromToken = payload.sub || payload.name || payload.username;
            setUserName(nameFromToken || null);
        } catch (e) {
            setUserName(null);
        }
    };

    useEffect(() => {
        extractUsernameFromToken();
        const intervalId = setInterval(() => {
            extractUsernameFromToken();
        }, 200);
        const timeoutId = setTimeout(() => {
            clearInterval(intervalId);
            setInterval(() => {
                extractUsernameFromToken();
            }, 2000);
        }, 10000);
        return () => {
            clearInterval(intervalId);
            clearTimeout(timeoutId);
        };
    }, []);

    useEffect(() => {
        extractUsernameFromToken();
    }, [location.pathname]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        if (showDropdown) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showDropdown]);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!name || !username || !email || !password || !confirmPassword || !taxId) {
            setError("Please fill in all fields (Tax ID is required).");
            return;
        }

        if (password !== confirmPassword) {
            setError("Password and Confirm Password must match.");
            return;
        }

        try {
            const res = await authApi.register(name, username, email, password, confirmPassword, role, taxId);
            showSuccess("Registration successful! Redirecting to login...");
            setTimeout(() => {
                navigate("/login");
            }, 1500);
        } catch (err) {
            console.error("REGISTER ERROR:", err);
            const errorMessage = getRegisterErrorMessage(err);
            setError(errorMessage);
            showError(errorMessage);
        }
    };

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
                            style={{
                                color: "#4a5568",
                                textDecoration: "none",
                                padding: "0.5rem 1rem",
                                borderRadius: "8px",
                                fontWeight: 500,
                                transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#f7fafc";
                                e.currentTarget.style.color = "#667eea";
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
                            style={{
                                color: "#4a5568",
                                textDecoration: "none",
                                padding: "0.5rem 1rem",
                                borderRadius: "8px",
                                fontWeight: 500,
                                transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#f7fafc";
                                e.currentTarget.style.color = "#667eea";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.color = "#4a5568";
                            }}
                        >
                            Products
                        </Link>
                        {userRole === "CUSTOMER" && (
                        <Link
                            to="/cart"
                            style={{
                                color: "#4a5568",
                                textDecoration: "none",
                                padding: "0.5rem 1rem",
                                borderRadius: "8px",
                                fontWeight: 500,
                                transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#f7fafc";
                                e.currentTarget.style.color = "#667eea";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.color = "#4a5568";
                            }}
                        >
                            Cart
                        </Link>
                        )}
                        {userRole === "PRODUCT_MANAGER" && (
                            <Link
                                to="/owner-dashboard"
                                style={{
                                    color: "#4a5568",
                                    textDecoration: "none",
                                    padding: "0.5rem 1rem",
                                    borderRadius: "8px",
                                    fontWeight: 500,
                                    transition: "all 0.2s",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "#f7fafc";
                                    e.currentTarget.style.color = "#667eea";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "transparent";
                                    e.currentTarget.style.color = "#4a5568";
                                }}
                            >
                                Dashboard
                            </Link>
                        )}
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "1rem", position: "relative" }}>
                    {userName ? (
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
                                    transition: "all 0.3s",
                                    boxShadow: "0 2px 4px rgba(102, 126, 234, 0.3)",
                                }}
                            >
                                <span style={{ fontSize: "1.2rem" }}>👤</span>
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
                                    {userRole === "CUSTOMER" && (
                                    <Link
                                        to="/cart"
                                        onClick={() => setShowDropdown(false)}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.8rem",
                                            padding: "0.9rem 1.2rem",
                                            color: "#2d3748",
                                            textDecoration: "none",
                                            fontSize: "0.95rem",
                                            borderBottom: "1px solid #f1f5f9",
                                        }}
                                    >
                                        <span>🛒</span>
                                        <span>My Cart</span>
                                    </Link>
                                    )}
                                    {userRole === "PRODUCT_MANAGER" && (
                                        <Link
                                            to="/owner-dashboard"
                                            onClick={() => setShowDropdown(false)}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "0.8rem",
                                                padding: "0.9rem 1.2rem",
                                                color: "#2d3748",
                                                textDecoration: "none",
                                                fontSize: "0.95rem",
                                                borderBottom: "1px solid #f1f5f9",
                                            }}
                                        >
                                            <span>📊</span>
                                            <span>Dashboard</span>
                                        </Link>
                                    )}
                                    <Link
                                        to="/orders"
                                        onClick={() => setShowDropdown(false)}
                                        style={{
                                            width: "100%",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.8rem",
                                            textAlign: "left",
                                            padding: "0.9rem 1.2rem",
                                            color: "#2d3748",
                                            fontSize: "0.95rem",
                                            border: "none",
                                            background: "transparent",
                                            cursor: "pointer",
                                            borderBottom: "1px solid #f1f5f9",
                                            textDecoration: "none",
                                        }}
                                    >
                                        <span>📋</span>
                                        <span>Order History</span>
                                    </Link>
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
                    ) : (
                        <Link
                            to="/login"
                            style={{
                                color: "#fff",
                                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                textDecoration: "none",
                                padding: "0.6rem 1.5rem",
                                borderRadius: "10px",
                                fontWeight: 600,
                                transition: "all 0.3s",
                                boxShadow: "0 2px 4px rgba(102, 126, 234, 0.3)",
                            }}
                        >
                            Login
                        </Link>
                    )}
                </div>
            </nav>

            <div
                style={{
                    minHeight: "calc(100vh - 80px)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: "2rem",
                }}
            >
                <form
                    onSubmit={handleSubmit}
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1rem",
                        background: "rgba(255, 255, 255, 0.95)",
                        backdropFilter: "blur(10px)",
                        padding: "3rem",
                        borderRadius: "20px",
                        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
                        minWidth: "400px",
                        maxWidth: "450px",
                    }}
                >
                    <h2
                        style={{
                            textAlign: "center",
                            color: "#2d3748",
                            fontSize: "2rem",
                            fontWeight: 700,
                            margin: 0,
                            marginBottom: "0.5rem",
                        }}
                    >
                        Create Account
                    </h2>
                    <p style={{ textAlign: "center", color: "#718096", marginBottom: "1rem" }}>
                        Join us and start shopping
                    </p>


                    <input
                        type="text"
                        placeholder="Full Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={{
                            padding: "1rem",
                            fontSize: "1rem",
                            borderRadius: "12px",
                            border: "2px solid #e2e8f0",
                            background: "#fff",
                            color: "#2d3748",
                            transition: "all 0.2s",
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = "#667eea";
                            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = "#e2e8f0";
                            e.currentTarget.style.boxShadow = "none";
                        }}
                    />

                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        style={{
                            padding: "1rem",
                            fontSize: "1rem",
                            borderRadius: "12px",
                            border: "2px solid #e2e8f0",
                            background: "#fff",
                            color: "#2d3748",
                            transition: "all 0.2s",
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = "#667eea";
                            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = "#e2e8f0";
                            e.currentTarget.style.boxShadow = "none";
                        }}
                    />

                    <input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{
                            padding: "1rem",
                            fontSize: "1rem",
                            borderRadius: "12px",
                            border: "2px solid #e2e8f0",
                            background: "#fff",
                            color: "#2d3748",
                            transition: "all 0.2s",
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = "#667eea";
                            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = "#e2e8f0";
                            e.currentTarget.style.boxShadow = "none";
                        }}
                    />

                    <input
                        type="text"
                        placeholder="Tax ID"
                        value={taxId}
                        onChange={(e) => setTaxId(e.target.value)}
                        style={{
                            padding: "1rem",
                            fontSize: "1rem",
                            borderRadius: "12px",
                            border: "2px solid #e2e8f0",
                            background: "#fff",
                            color: "#2d3748",
                            transition: "all 0.2s",
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = "#667eea";
                            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = "#e2e8f0";
                            e.currentTarget.style.boxShadow = "none";
                        }}
                    />

                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{
                            padding: "1rem",
                            fontSize: "1rem",
                            borderRadius: "12px",
                            border: "2px solid #e2e8f0",
                            background: "#fff",
                            color: "#2d3748",
                            transition: "all 0.2s",
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = "#667eea";
                            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = "#e2e8f0";
                            e.currentTarget.style.boxShadow = "none";
                        }}
                    />

                    <input
                        type="password"
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        style={{
                            padding: "1rem",
                            fontSize: "1rem",
                            borderRadius: "12px",
                            border: "2px solid #e2e8f0",
                            background: "#fff",
                            color: "#2d3748",
                            transition: "all 0.2s",
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = "#667eea";
                            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.1)";
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = "#e2e8f0";
                            e.currentTarget.style.boxShadow = "none";
                        }}
                    />

                    {error && (
                        <div
                            style={{
                                padding: "0.75rem 1rem",
                                background: "#fed7d7",
                                color: "#c53030",
                                borderRadius: "8px",
                                fontSize: "0.9rem",
                            }}
                        >
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        style={{
                            padding: "1rem",
                            fontSize: "1.1rem",
                            fontWeight: 600,
                            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "12px",
                            cursor: "pointer",
                            transition: "all 0.3s",
                            boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)",
                            marginTop: "0.5rem",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.5)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "0 4px 15px rgba(102, 126, 234, 0.4)";
                        }}
                    >
                        Sign Up
                    </button>

                    <div
                        style={{
                            textAlign: "center",
                            marginTop: "0.5rem",
                            fontSize: "0.95rem",
                            color: "#718096",
                        }}
                    >
                        Already have an account?{" "}
                        <Link
                            to="/login"
                            style={{
                                color: "#667eea",
                                textDecoration: "none",
                                fontWeight: 600,
                            }}
                        >
                            Sign in
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
