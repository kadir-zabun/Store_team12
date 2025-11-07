import { Link } from "react-router-dom";

export default function HomePage() {
    return (
        <div style={{ padding: "20px" }}>
            <h1>Home Page</h1>
            <p>Hoş geldin! Giriş yaptıysan kullanıcı bilgilerini burada gösterebiliriz.</p>
            <Link to="/login" style={{ color: "#61dafb", textDecoration: "none", fontWeight: "bold" }}>
                Giriş Yap
            </Link>
        </div>
    );
}