import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import authApi from "../api/authApi";

export default function RegisterPage() {
    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        // Basit frontend validasyonları
        if (!name || !username || !email || !password || !confirmPassword) {
            setError("Lütfen tüm alanları doldurun.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Password ve Confirm Password aynı olmalı.");
            return;
        }

        try {
            const res = await authApi.register(
                name,
                username,
                email,
                password,
                confirmPassword
            );
            console.log("Register response:", res.data);

            // Kayıt başarılı → login sayfasına at
            navigate("/login");
        } catch (err) {
            console.error("REGISTER ERROR:", err);

            // Spring ResponseStatusException genelde message alanı döner
            const message =
                err.response?.data?.message ||
                err.response?.data?.error ||
                err.response?.data ||
                "Kayıt sırasında bir hata oluştu.";

            setError(message);
        }
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
                    gap: "12px",
                    backgroundColor: "#2c2c2c",
                    padding: "40px",
                    borderRadius: "10px",
                    boxShadow: "0 0 15px rgba(0,0,0,0.3)",
                    minWidth: "340px",
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
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                        padding: "10px",
                        fontSize: "15px",
                        borderRadius: "5px",
                        border: "1px solid #666",
                        backgroundColor: "#3a3a3a",
                        color: "white",
                    }}
                />

                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{
                        padding: "10px",
                        fontSize: "15px",
                        borderRadius: "5px",
                        border: "1px solid #666",
                        backgroundColor: "#3a3a3a",
                        color: "white",
                    }}
                />

                <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                        padding: "10px",
                        fontSize: "15px",
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
                        padding: "10px",
                        fontSize: "15px",
                        borderRadius: "5px",
                        border: "1px solid #666",
                        backgroundColor: "#3a3a3a",
                        color: "white",
                    }}
                />

                <input
                    type="password"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{
                        padding: "10px",
                        fontSize: "15px",
                        borderRadius: "5px",
                        border: "1px solid #666",
                        backgroundColor: "#3a3a3a",
                        color: "white",
                    }}
                />

                {error && (
                    <span
                        style={{
                            color: "#ff4d4f",
                            fontSize: "14px",
                            marginTop: "4px",
                        }}
                    >
            {error}
          </span>
                )}

                <div
                    style={{
                        marginTop: "5px",
                        marginBottom: "5px",
                        fontSize: "14px",
                        color: "#cccccc",
                    }}
                >
                    Zaten hesabın var mı?{" "}
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