import { useState } from "react";
import { Link } from "react-router-dom";
import authApi from "../api/authApi";
import { useToast } from "../contexts/ToastContext";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const { success: showSuccess, error: showError } = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess(false);
        setLoading(true);

        try {
            const res = await authApi.requestPasswordReset(email);
            const apiResponse = res.data;
            const responseData = apiResponse?.data || apiResponse;

            if (responseData?.resetLink || responseData?.message) {
                setSuccess(true);
                showSuccess("If an account with this email exists, a password reset link has been sent to your email.");
            } else {
                const errorMsg = "Failed to generate reset link. Please try again.";
                setError(errorMsg);
                showError(errorMsg);
            }
        } catch (err) {
            const message =
                err.response?.data?.data?.message ||
                err.response?.data?.error?.message ||
                err.response?.data?.message ||
                "Failed to send reset email. Please try again.";
            setError(message);
            showError(message);
        } finally {
            setLoading(false);
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
                        🛍️ Store
                    </Link>
                </div>
                <Link
                    to="/login"
                    style={{
                        color: "#667eea",
                        textDecoration: "none",
                        fontWeight: 600,
                    }}
                >
                    Back to Login
                </Link>
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
                        gap: "1.2rem",
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
                        Forgot Password?
                    </h2>
                    <p style={{ textAlign: "center", color: "#718096", marginBottom: "1rem" }}>
                        Enter your email address and we'll send you a link to reset your password.
                    </p>

                    {success ? (
                        <div
                            style={{
                                padding: "1rem",
                                background: "#c6f6d5",
                                color: "#22543d",
                                borderRadius: "8px",
                                fontSize: "0.9rem",
                                textAlign: "center",
                            }}
                        >
                            <p style={{ margin: 0, marginBottom: "0.5rem", fontWeight: 600 }}>
                                ✅ Password reset link sent!
                            </p>
                            <p style={{ margin: "0.5rem 0", fontSize: "0.9rem" }}>
                                If an account with this email exists, a password reset link has been sent to your email.
                            </p>
                            <p style={{ margin: "0.75rem 0 0 0", fontSize: "0.8rem", opacity: 0.8 }}>
                                The link will expire in 1 hour.
                            </p>
                        </div>
                    ) : (
                        <>
                            <input
                                type="email"
                                placeholder="Email Address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
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
                                disabled={loading}
                                style={{
                                    padding: "1rem",
                                    fontSize: "1.1rem",
                                    fontWeight: 600,
                                    background: loading
                                        ? "#a0aec0"
                                        : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "12px",
                                    cursor: loading ? "not-allowed" : "pointer",
                                    transition: "all 0.3s",
                                    boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)",
                                    marginTop: "0.5rem",
                                }}
                                onMouseEnter={(e) => {
                                    if (!loading) {
                                        e.currentTarget.style.transform = "translateY(-2px)";
                                        e.currentTarget.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.5)";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!loading) {
                                        e.currentTarget.style.transform = "translateY(0)";
                                        e.currentTarget.style.boxShadow = "0 4px 15px rgba(102, 126, 234, 0.4)";
                                    }
                                }}
                            >
                                {loading ? "Sending..." : "Send Reset Link"}
                            </button>
                        </>
                    )}

                    <div
                        style={{
                            textAlign: "center",
                            marginTop: "0.5rem",
                            fontSize: "0.95rem",
                            color: "#718096",
                        }}
                    >
                        Remember your password?{" "}
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

