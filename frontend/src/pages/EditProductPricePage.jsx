import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import productApi from "../api/productApi";
import salesApi from "../api/salesApi";
import { useToast } from "../contexts/ToastContext";
import { useUserRole } from "../hooks/useUserRole";

export default function EditProductPricePage() {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [price, setPrice] = useState("");
  const navigate = useNavigate();
  const { success: showSuccess, error: showError } = useToast();
  const userRole = useUserRole();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login");
      return;
    }

    const storedRole = localStorage.getItem("user_role");
    const currentRole = userRole || storedRole;

    if (currentRole !== "SALES_MANAGER") {
      navigate("/sales-manager");
      return;
    }

    if (productId) {
      loadProduct();
    }
  }, [productId, userRole, navigate]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const response = await productApi.getProductById(productId);
      const productData = response.data?.data || response.data || response;
      setProduct(productData);
      setPrice(productData.price?.toString() || "");
    } catch (error) {
      console.error("Error loading product:", error);
      showError("Failed to load product details.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePrice = async (e) => {
    e.preventDefault();
    if (!price || parseFloat(price) <= 0) {
      showError("Please enter a valid price.");
      return;
    }

    setUpdating(true);
    try {
      await salesApi.setPrice(productId, parseFloat(price));
      showSuccess("Price updated successfully!");
      await loadProduct();
    } catch (error) {
      console.error("Error updating price:", error);
      showError(error.response?.data?.message || "Failed to update price.");
    } finally {
      setUpdating(false);
    }
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return "₺0.00";
    const num = Number(amount);
    if (isNaN(num)) return "₺0.00";
    return `₺${num.toFixed(2)}`;
  };

  const storedRole = localStorage.getItem("user_role");
  const currentRole = userRole || storedRole;

  if (loading || (currentRole === null || currentRole === undefined)) {
    return (
      <div style={{ minHeight: "calc(100vh - 80px)", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: "50px", height: "50px", border: "4px solid rgba(255, 255, 255, 0.3)", borderTop: "4px solid #fff", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <div style={{ color: "#fff", fontSize: "1rem" }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (currentRole !== "SALES_MANAGER") {
    return null;
  }

  return (
    <div style={{ minHeight: "calc(100vh - 80px)", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
      <style>
        {`
          .price-input::-webkit-outer-spin-button,
          .price-input::-webkit-inner-spin-button {
              -webkit-appearance: none;
              margin: 0;
          }
          .price-input[type=number] {
              -moz-appearance: textfield;
          }
          .price-input-wrapper {
              position: relative;
          }
          .price-input-spinner {
              position: absolute;
              right: 0.5rem;
              top: 50%;
              transform: translateY(-50%);
              display: flex;
              flex-direction: column;
              gap: 0.125rem;
              pointer-events: none;
          }
          .price-input-spinner button {
              width: 1.25rem;
              height: 1rem;
              border: 1px solid transparent;
              border-radius: 4px;
              background: #667eea;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 0;
              pointer-events: auto;
              color: #fff;
              font-size: 0.625rem;
              transition: all 0.2s;
          }
          .price-input-spinner button:hover {
              background: #fff;
              color: #667eea;
              border-color: #667eea;
          }
          .price-input-spinner button:active {
              background: #f7fafc;
              color: #667eea;
              border-color: #667eea;
          }
        `}
      </style>
      <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ background: "rgba(255, 255, 255, 0.95)", padding: "2rem", borderRadius: "20px", boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)" }}>
          <button
            onClick={() => navigate("/sales-manager")}
            style={{
              padding: "0.5rem 1rem",
              background: "#e2e8f0",
              color: "#2d3748",
              border: "none",
              borderRadius: "8px",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "0.9rem",
              marginBottom: "1.5rem",
            }}
          >
            ← Back to Dashboard
          </button>

          {product ? (
            <>
              <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#2d3748", marginBottom: "1rem" }}>
                {product.productName}
              </h1>

              {/* Product Details */}
              <div style={{ background: "#f7fafc", padding: "1.5rem", borderRadius: "8px", marginBottom: "2rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem" }}>
                  <div>
                    <div style={{ fontSize: "0.85rem", color: "#718096", marginBottom: "0.25rem" }}>Product ID</div>
                    <div style={{ fontSize: "1rem", fontWeight: 600, color: "#2d3748" }}>{product.productId}</div>
                  </div>
                  {product.model && (
                    <div>
                      <div style={{ fontSize: "0.85rem", color: "#718096", marginBottom: "0.25rem" }}>Model</div>
                      <div style={{ fontSize: "1rem", fontWeight: 600, color: "#2d3748" }}>{product.model}</div>
                    </div>
                  )}
                  {product.serialNumber && (
                    <div>
                      <div style={{ fontSize: "0.85rem", color: "#718096", marginBottom: "0.25rem" }}>Serial Number</div>
                      <div style={{ fontSize: "1rem", fontWeight: 600, color: "#2d3748" }}>{product.serialNumber}</div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: "0.85rem", color: "#718096", marginBottom: "0.25rem" }}>Current Price</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#667eea" }}>{formatCurrency(product.price)}</div>
                  </div>
                  {product.discount && product.discount > 0 && (
                    <div>
                      <div style={{ fontSize: "0.85rem", color: "#718096", marginBottom: "0.25rem" }}>Discount</div>
                      <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#c53030" }}>{product.discount}%</div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: "0.85rem", color: "#718096", marginBottom: "0.25rem" }}>Stock</div>
                    <div style={{ fontSize: "1rem", fontWeight: 600, color: product.inStock ? "#22543d" : "#c53030" }}>
                      {product.quantity || 0} {product.inStock ? "(In Stock)" : "(Out of Stock)"}
                    </div>
                  </div>
                </div>
                {product.description && (
                  <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "0.85rem", color: "#718096", marginBottom: "0.5rem" }}>Description</div>
                    <div style={{ fontSize: "0.95rem", color: "#2d3748", lineHeight: "1.6" }}>{product.description}</div>
                  </div>
                )}
              </div>

              {/* Update Price Form */}
              <form onSubmit={handleUpdatePrice} style={{ background: "#f7fafc", padding: "1.5rem", borderRadius: "8px" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem", color: "#2d3748" }}>
                  Update Price
                </h2>
                <div style={{ display: "flex", gap: "1rem", alignItems: "end", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: "250px" }}>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, color: "#2d3748" }}>
                      New Price (₺)
                    </label>
                    <div className="price-input-wrapper" style={{ position: "relative" }}>
                      <input
                        type="number"
                        className="price-input"
                        step="0.01"
                        min="0"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        required
                        style={{
                          width: "100%",
                          padding: "0.75rem 2.5rem 0.75rem 0.75rem",
                          borderRadius: "8px",
                          border: "2px solid #e2e8f0",
                          fontSize: "0.85rem",
                          backgroundColor: "#fff",
                          color: "#2d3748",
                          boxSizing: "border-box",
                          transition: "border-color 0.2s",
                          outline: "none",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "#667eea";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "#e2e8f0";
                        }}
                      />
                      <div className="price-input-spinner">
                        <button
                          type="button"
                          onClick={() => {
                            const current = parseFloat(price) || 0;
                            setPrice((current + 0.01).toFixed(2));
                          }}
                          aria-label="Increase"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const current = parseFloat(price) || 0;
                            if (current > 0) {
                              setPrice(Math.max(0, current - 0.01).toFixed(2));
                            }
                          }}
                          aria-label="Decrease"
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={updating}
                    style={{
                      padding: "0.75rem 2rem",
                      background: updating ? "#cbd5e0" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: 600,
                      cursor: updating ? "not-allowed" : "pointer",
                      fontSize: "1rem",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (!updating) {
                        e.currentTarget.style.boxShadow = "0 4px 8px rgba(102, 126, 234, 0.4)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!updating) {
                        e.currentTarget.style.boxShadow = "none";
                      }
                    }}
                  >
                    {updating ? "Updating..." : "Update Price"}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "3rem", color: "#718096" }}>
              Product not found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

