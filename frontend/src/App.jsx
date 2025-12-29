import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastProvider } from "./contexts/ToastContext";
import { NavigationProvider } from "./contexts/NavigationContext";
import Toast from "./components/Toast";
import Layout from "./components/Layout";
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
import SalesManagerDashboard from "./pages/SalesManagerDashboard";
import WishlistPage from "./pages/WishlistPage";
import DeliveryManagementPage from "./pages/DeliveryManagementPage";
import ProductManagerInvoicePage from "./pages/ProductManagerInvoicePage";
import SupportAgentChatPage from "./pages/SupportAgentChatPage";
import CustomerChatWidget from "./components/CustomerChatWidget";
import ProfilePage from "./pages/ProfilePage";
import MyAccountPage from "./pages/MyAccountPage";
import MyReviewsPage from "./pages/MyReviewsPage";

function App() {
    return (
        <ToastProvider>
            <BrowserRouter>
                <NavigationProvider>
                    <Routes>
                        {/* Routes without Layout (auth pages) */}
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                        <Route path="/reset-password" element={<ResetPasswordPage />} />
                        
                        {/* Routes with Layout */}
                        <Route element={<Layout />}>
                            <Route path="/" element={<HomePage />} />
                            <Route path="/products" element={<ProductsPage />} />
                            <Route path="/products/:productId" element={<ProductDetailPage />} />
                            <Route path="/cart" element={<CartPage />} />
                            <Route path="/checkout" element={<CheckoutPage />} />
                            <Route path="/invoice/:orderId" element={<InvoicePage />} />
                            <Route path="/orders" element={<OrderHistoryPage />} />
                            <Route path="/profile" element={<ProfilePage />} />
                            <Route path="/owner/products" element={<ProductManagementPage />} />
                            <Route path="/owner/orders" element={<OrderManagementPage />} />
                            <Route path="/owner/deliveries" element={<DeliveryManagementPage />} />
                            <Route path="/owner/invoices" element={<ProductManagerInvoicePage />} />
                            <Route path="/owner/reviews" element={<ReviewManagementPage />} />
                            <Route path="/owner-dashboard" element={<OwnerDashboard />} />
                            <Route path="/sales-manager" element={<SalesManagerDashboard />} />
                            <Route path="/wishlist" element={<WishlistPage />} />
                            <Route path="/support/chat" element={<SupportAgentChatPage />} />
                            <Route path="/my-account" element={<MyAccountPage />} />
                            <Route path="/my-reviews" element={<MyReviewsPage />} />
                        </Route>
                    </Routes>
                    <Toast />
                    <CustomerChatWidget />
                </NavigationProvider>
            </BrowserRouter>
        </ToastProvider>
    );
}

export default App;