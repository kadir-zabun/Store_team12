import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import authApi from "../api/authApi";

export default function LoginPage() {
    const [usernameOrEmail, setUsernameOrEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        try {
            const res = await authApi.login(usernameOrEmail, password);

            const data = res.data;

            if (data.token) {
                localStorage.setItem("access_token", data.token);
            }
            if (data.user) {
                localStorage.setItem("user", JSON.stringify(data.user));
            }

            navigate("/"); // başarılıysa HomePage'e
        } catch (err) {
            console.error(err);
            setError("username/password invalid");
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
                        fontSize: "28px",
                        margin: 0,
                        marginBottom: "10px",
                    }}
                >
                    Login
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

                {error && (
                    <span
                        style={{
                            color: "#ff4d4f",
                            fontSize: "14px",
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
                    You don't have an account?{" "}
                    <Link
                        to="/register"
                        style={{
                            color: "#4da3ff",
                            textDecoration: "none",
                            fontWeight: "500",
                        }}
                    >
                        Sign up
                    </Link>
                </div>

                <button
                    type="submit"
                    style={{
                        padding: "12px",
                        fontSize: "16px",
                        backgroundColor: "#007bff",
                        color: "white",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
                        marginTop: "10px",
                    }}
                >
                    Login
                </button>
            </form>
        </div>
    );
}