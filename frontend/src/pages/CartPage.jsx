import { Link } from "react-router-dom";

export default function CartPage() {
    return (
        <div style={{ minHeight: "100vh", background: "#f7f8fa" }}>

            <nav
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "2rem",
                    padding: "1.5rem 0",
                    background: "#fff",
                    borderBottom: "1px solid #e5e7eb",
                    fontSize: "1.05rem",
                    fontWeight: 500,
                }}
            >
                <Link to="/" style={{ textDecoration: "none", color: "#222" }}>
                    Home
                </Link>
                <Link to="/products" style={{ textDecoration: "none", color: "#222" }}>
                    Products
                </Link>
                <Link
                    to="/cart"
                    style={{
                        textDecoration: "none",
                        color: "#2563eb",
                        fontWeight: 600,
                    }}
                >
                    Cart
                </Link>
                <Link to="/login" style={{ textDecoration: "none", color: "#222" }}>
                    Login
                </Link>
            </nav>


            <div style={{ padding: "3rem", textAlign: "center" }}>
                <h1 style={{ fontSize: "2.2rem", marginBottom: "1rem", color: "#22223b" }}>Your Cart</h1>
                <p style={{ color: "#555" }}>
                    Your cart is empty for now. Add products from the Products page.
                </p>
            </div>
        </div>
    );
}