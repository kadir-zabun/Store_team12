import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastProvider } from "./contexts/ToastContext";
import Toast from "./components/Toast";
import HomePage from "./pages/HomePage";
import ProductsPage from "./pages/ProductsPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import InvoicePage from "./pages/InvoicePage";
import OrderHistoryPage from "./pages/OrderHistoryPage";
import ProductManagementPage from "./pages/ProductManagementPage";
import OrderManagementPage from "./pages/OrderManagementPage";
import ReviewManagementPage from "./pages/ReviewManagementPage";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
import ForgotPasswordPage from "./pages/ForgotPassword";
import ResetPasswordPage from "./pages/ResetPassword";
import OwnerDashboard from "./pages/OwnerDashboard";
import ProductDetailPage from "./pages/ProductDetailPage";

function App() {
    return (
        <ToastProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/products" element={<ProductsPage />} />
                    <Route path="/products/:productId" element={<ProductDetailPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/invoice/:orderId" element={<InvoicePage />} />
                    <Route path="/orders" element={<OrderHistoryPage />} />
                    <Route path="/owner/products" element={<ProductManagementPage />} />
                    <Route path="/owner/orders" element={<OrderManagementPage />} />
                    <Route path="/owner/reviews" element={<ReviewManagementPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/owner-dashboard" element={<OwnerDashboard />} />
                </Routes>
                <Toast />
            </BrowserRouter>
        </ToastProvider>
    );
}

export default App;