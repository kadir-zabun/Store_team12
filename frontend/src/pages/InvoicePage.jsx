import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useToast } from "../contexts/ToastContext";
import orderApi from "../api/orderApi";
import paymentApi from "../api/paymentApi";

export default function InvoicePage() {
    const { orderId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { success: showSuccess, error: showError } = useToast();
    const [invoiceData, setInvoiceData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadInvoiceData = async () => {
            // First check if data is in location.state (from checkout)
            if (location.state && location.state.invoice) {
                setInvoiceData(location.state);
                setLoading(false);
                return;
            }

            // Otherwise, fetch order by orderId from URL
            if (orderId) {
                try {
                    const orderResponse = await orderApi.getOrderById(orderId);
                    const order = orderResponse.data || orderResponse;
                    
                    // Try to get payment/invoice info (if available)
                    let invoice = null;
                    try {
                        // Payment info might not be available, so we'll use order data
                        invoice = {
                            invoiceId: order.orderId || order.id,
                            invoiceDate: order.orderDate || new Date(),
                            total: order.totalPrice || 0,
                            amount: order.totalPrice || 0,
                        };
                    } catch (e) {
                        console.log("Payment info not available, using order data");
                    }

                    setInvoiceData({
                        order: order,
                        invoice: invoice,
                        shippingInfo: location.state?.shippingInfo || null,
                    });
                } catch (error) {
                    console.error("Error loading invoice:", error);
                    showError("Failed to load invoice. Redirecting...");
                    navigate("/products");
                } finally {
                    setLoading(false);
                }
            } else {
                showError("No order ID found. Redirecting...");
                navigate("/products");
            }
        };

        loadInvoiceData();
    }, [orderId, location, navigate, showSuccess, showError]);

    if (loading || !invoiceData) {
        return (
            <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ color: "#fff", fontSize: "1.5rem" }}>Loading invoice...</div>
            </div>
        );
    }

    const { order, invoice, shippingInfo } = invoiceData;
    const invoiceDate = invoice?.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : (order?.orderDate ? new Date(order.orderDate).toLocaleDateString() : new Date().toLocaleDateString());
    const totalAmount = invoice?.total || invoice?.amount || order?.totalPrice || 0;

    return (
        <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding: "2rem" }}>
            <div style={{ maxWidth: "800px", margin: "0 auto" }}>
                <div style={{ background: "rgba(255, 255, 255, 0.95)", padding: "3rem", borderRadius: "20px", boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)" }}>
                    {/* Header */}
                    <div style={{ textAlign: "center", marginBottom: "2rem", paddingBottom: "2rem", borderBottom: "2px solid #e2e8f0" }}>
                        <h1 style={{ fontSize: "2.5rem", fontWeight: 700, color: "#667eea", marginBottom: "0.5rem" }}>Invoice</h1>
                        <div style={{ fontSize: "1.1rem", color: "#2d3748", fontWeight: 500 }}>Invoice #{invoice?.invoiceId || order?.orderId || order?.id || "N/A"}</div>
                        <div style={{ fontSize: "0.9rem", color: "#4a5568", marginTop: "0.5rem", fontWeight: 500 }}>Date: {invoiceDate}</div>
                    </div>

                    {/* Order Info */}
                    <div style={{ marginBottom: "2rem" }}>
                        <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#2d3748", marginBottom: "1rem" }}>Order Information</h2>
                        <div style={{ background: "#f7fafc", padding: "1rem", borderRadius: "10px" }}>
                            <div style={{ marginBottom: "0.5rem", color: "#2d3748", fontSize: "1rem" }}>
                                <strong style={{ color: "#2d3748" }}>Order ID:</strong> <span style={{ color: "#4a5568" }}>{order.orderId || order.id || "N/A"}</span>
                            </div>
                            <div style={{ marginBottom: "0.5rem", color: "#2d3748", fontSize: "1rem" }}>
                                <strong style={{ color: "#2d3748" }}>Status:</strong> <span style={{ color: "#667eea", fontWeight: 600 }}>{order.status || "PROCESSING"}</span>
                            </div>
                            {order.orderDate && (
                                <div style={{ color: "#2d3748", fontSize: "1rem" }}>
                                    <strong style={{ color: "#2d3748" }}>Order Date:</strong> <span style={{ color: "#4a5568" }}>{new Date(order.orderDate).toLocaleDateString()}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Shipping Info */}
                    {shippingInfo && (
                        <div style={{ marginBottom: "2rem" }}>
                            <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#2d3748", marginBottom: "1rem" }}>Shipping Address</h2>
                            <div style={{ background: "#f7fafc", padding: "1rem", borderRadius: "10px" }}>
                                <div style={{ color: "#2d3748", fontSize: "1rem", marginBottom: "0.5rem" }}>{shippingInfo.fullName}</div>
                                <div style={{ color: "#4a5568", fontSize: "1rem", marginBottom: "0.5rem" }}>{shippingInfo.address}</div>
                                <div style={{ color: "#4a5568", fontSize: "1rem", marginBottom: "0.5rem" }}>{shippingInfo.city}, {shippingInfo.zipCode}</div>
                                <div style={{ color: "#4a5568", fontSize: "1rem" }}>Phone: {shippingInfo.phone}</div>
                            </div>
                        </div>
                    )}

                    {/* Items */}
                    <div style={{ marginBottom: "2rem" }}>
                        <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#2d3748", marginBottom: "1rem" }}>Items</h2>
                        <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ background: "#f7fafc" }}>
                                        <th style={{ padding: "1rem", textAlign: "left", borderBottom: "2px solid #e2e8f0", color: "#2d3748", fontWeight: 600 }}>Product</th>
                                        <th style={{ padding: "1rem", textAlign: "center", borderBottom: "2px solid #e2e8f0", color: "#2d3748", fontWeight: 600 }}>Quantity</th>
                                        <th style={{ padding: "1rem", textAlign: "right", borderBottom: "2px solid #e2e8f0", color: "#2d3748", fontWeight: 600 }}>Price</th>
                                        <th style={{ padding: "1rem", textAlign: "right", borderBottom: "2px solid #e2e8f0", color: "#2d3748", fontWeight: 600 }}>Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {order.items && order.items.map((item, index) => (
                                        <tr key={index} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                            <td style={{ padding: "1rem", color: "#2d3748", fontSize: "1rem" }}>{item.productName || `Product ${item.productId}`}</td>
                                            <td style={{ padding: "1rem", textAlign: "center", color: "#4a5568", fontSize: "1rem" }}>{item.quantity}</td>
                                            <td style={{ padding: "1rem", textAlign: "right", color: "#4a5568", fontSize: "1rem" }}>${(item.priceAtPurchase || item.price || 0).toFixed(2)}</td>
                                            <td style={{ padding: "1rem", textAlign: "right", fontWeight: 600, color: "#2d3748", fontSize: "1rem" }}>${((item.priceAtPurchase || item.price || 0) * item.quantity).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Total */}
                    <div style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding: "1.5rem", borderRadius: "10px", color: "#fff", marginBottom: "2rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>Total Amount:</div>
                            <div style={{ fontSize: "2rem", fontWeight: 700 }}>${totalAmount.toFixed(2)}</div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
                        <Link
                            to="/products"
                            style={{
                                padding: "0.75rem 2rem",
                                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                color: "#fff",
                                textDecoration: "none",
                                borderRadius: "10px",
                                fontWeight: 600,
                                transition: "all 0.3s",
                            }}
                        >
                            Continue Shopping
                        </Link>
                        <button
                            onClick={() => window.print()}
                            style={{
                                padding: "0.75rem 2rem",
                                background: "#e2e8f0",
                                color: "#4a5568",
                                border: "none",
                                borderRadius: "10px",
                                fontWeight: 600,
                                cursor: "pointer",
                                transition: "all 0.3s",
                            }}
                        >
                            Print Invoice
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

