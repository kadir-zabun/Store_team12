
import { useState } from "react";
import { Link } from "react-router-dom";

export default function RegisterPage() {
    const [usernameOrEmail, setUsernameOrEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("Register attempt:", usernameOrEmail, password);
    };

    return (
        <div
            style={{
                height: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "#1e1e1e",
            }}
        >
            <form
                onSubmit={handleSubmit}
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "15px",
                    backgroundColor: "#2c2c2c",
                    padding: "40px",
                    borderRadius: "10px",
                    boxShadow: "0 0 15px rgba(0,0,0,0.3)",
                    minWidth: "320px",
                }}
            >
                <h2
                    style={{
                        textAlign: "center",
                        color: "white",
                        fontSize: "26px",
                        margin: 0,
                        marginBottom: "10px",
                    }}
                >
                    Sign Up
                </h2>

                <input
                    type="text"
                    placeholder="Username or Email"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    style={{
                        padding: "12px",
                        fontSize: "16px",
                        borderRadius: "5px",
                        border: "1px solid #666",
                        backgroundColor: "#3a3a3a",
                        color: "white",
                    }}
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                        padding: "12px",
                        fontSize: "16px",
                        borderRadius: "5px",
                        border: "1px solid #666",
                        backgroundColor: "#3a3a3a",
                        color: "white",
                    }}
                />

                <div
                    style={{
                        marginTop: "5px",
                        marginBottom: "5px",
                        fontSize: "14px",
                        color: "#cccccc",
                    }}
                >
                    You already have an account?{" "}
                    <Link
                        to="/login"
                        style={{
                            color: "#4da3ff",
                            textDecoration: "none",
                            fontWeight: "500",
                        }}
                    >
                        Login
                    </Link>
                </div>

                <button
                    type="submit"
                    style={{
                        padding: "12px",
                        fontSize: "16px",
                        backgroundColor: "#2ecc71",
                        color: "white",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
                        marginTop: "5px",
                    }}
                >
                    Sign Up
                </button>
            </form>
        </div>
    );
}