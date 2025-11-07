import { Link } from "react-router-dom";

export default function HomePage() {
    return (
        <div style={{ minHeight: "100vh", background: "#f7f8fa" }}>
            {/* Navigation Bar */}
            <nav
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "2rem",
                    padding: "1.5rem 0",
                    background: "#fff",
                    borderBottom: "1px solid #e5e7eb",
                    fontSize: "1.15rem",
                    fontWeight: 500,
                    letterSpacing: ".01em",
                }}
            >
                <Link
                    to="/"
                    style={{
                        color: "#222",
                        textDecoration: "none",
                        padding: "0.5rem 1rem",
                        borderRadius: "5px",
                    }}
                >
                    Home
                </Link>
                <Link
                    to="/products"
                    style={{
                        color: "#222",
                        textDecoration: "none",
                        padding: "0.5rem 1rem",
                        borderRadius: "5px",
                    }}
                >
                    Products
                </Link>
                <Link
                    to="/cart"
                    style={{
                        color: "#222",
                        textDecoration: "none",
                        padding: "0.5rem 1rem",
                        borderRadius: "5px",
                    }}
                >
                    Cart
                </Link>
                <Link
                    to="/login"
                    style={{
                        color: "#fff",
                        background: "#2563eb",
                        textDecoration: "none",
                        padding: "0.5rem 1.2rem",
                        borderRadius: "6px",
                        fontWeight: 600,
                    }}
                >
                    Login
                </Link>
            </nav>

            {/* Center content */}
            <div
                style={{
                    minHeight: "calc(100vh - 80px)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    textAlign: "center",
                }}
            >
                <h1
                    style={{
                        fontSize: "2.8rem",
                        fontWeight: 700,
                        marginBottom: "1rem",
                        color: "#22223b",
                    }}
                >
                    Welcome to Online Store
                </h1>
                <p
                    style={{
                        fontSize: "1.35rem",
                        color: "#555",
                        marginBottom: "2.5rem",
                        maxWidth: "420px",
                    }}
                >
                    Please login or sign up to start shopping.
                </p>
                <div style={{ display: "flex", gap: "2rem" }}>
                    <Link
                        to="/login"
                        style={{
                            background: "#2563eb",
                            color: "#fff",
                            fontSize: "1.1rem",
                            fontWeight: 600,
                            padding: "0.9rem 2.2rem",
                            borderRadius: "8px",
                            textDecoration: "none",
                        }}
                    >
                        Login
                    </Link>
                    <Link
                        to="/register"
                        style={{
                            background: "#fff",
                            color: "#2563eb",
                            fontSize: "1.1rem",
                            fontWeight: 600,
                            padding: "0.9rem 2.2rem",
                            borderRadius: "8px",
                            border: "2px solid #2563eb",
                            textDecoration: "none",
                        }}
                    >
                        Sign Up
                    </Link>
                </div>
            </div>
        </div>
    );
}