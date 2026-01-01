import { Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useUserRole } from "../hooks/useUserRole";
import { useToast } from "../contexts/ToastContext";
import userApi from "../api/userApi";
import authApi from "../api/AuthApi";

export default function MyAccountPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const userRole = useUserRole();
    const { success: showSuccess, error: showError } = useToast();
    const [activeSection, setActiveSection] = useState("account");
    
    // User profile state
    const [profile, setProfile] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    
    // Addresses state
    const [addresses, setAddresses] = useState([]);
    const [newAddress, setNewAddress] = useState({
        fullName: "",
        address: "",
        city: "",
        zipCode: "",
        phone: "",
    });
    const [showAddAddress, setShowAddAddress] = useState(false);
    
    // Cards state
    const [savedCard, setSavedCard] = useState(null);
    const [loadingCard, setLoadingCard] = useState(true);
    
    // Password change state
    const [email, setEmail] = useState("");
    const [passwordResetSent, setPasswordResetSent] = useState(false);

    // Redirect if not CUSTOMER
    useEffect(() => {
        if (userRole !== "CUSTOMER") {
            navigate("/");
        }
    }, [userRole, navigate]);

    // Set active section based on URL hash
    useEffect(() => {
        const hash = location.hash.replace("#", "");
        if (hash) {
            setActiveSection(hash);
        }
    }, [location.hash]);

    // Load user profile
    useEffect(() => {
        if (activeSection === "account") {
            loadProfile();
        }
    }, [activeSection]);

    // Load saved card
    useEffect(() => {
        if (activeSection === "cards") {
            loadSavedCard();
        }
    }, [activeSection]);

    // Load addresses from localStorage
    useEffect(() => {
        if (activeSection === "address") {
            loadAddresses();
        }
    }, [activeSection]);

    // Load profile when password section is active
    useEffect(() => {
        if (activeSection === "password" && !profile) {
            loadProfile();
        }
    }, [activeSection]);

    const loadProfile = async () => {
        setLoadingProfile(true);
        try {
            const token = localStorage.getItem("access_token");
            if (!token) return;
            
            const payloadBase64 = token.split(".")[1];
            const normalized = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
            const payloadJson = atob(normalized);
            const payload = JSON.parse(payloadJson);
            const username = payload.sub || payload.username;
            
            if (username) {
                const response = await userApi.getMyProfile();
                const profileData = response.data?.data || response.data;
                setProfile(profileData);
                setEmail(profileData?.email || "");
            }
        } catch (error) {
            console.error("Error loading profile:", error);
            showError("Failed to load profile.");
        } finally {
            setLoadingProfile(false);
        }
    };

    const loadSavedCard = async () => {
        setLoadingCard(true);
        try {
            const response = await userApi.getMyCard();
            const cardData = response.data?.data || response.data;
            setSavedCard(cardData);
        } catch (error) {
            console.error("Error loading card:", error);
            // Card might not exist, that's okay
            setSavedCard(null);
        } finally {
            setLoadingCard(false);
        }
    };

    const loadAddresses = () => {
        const savedAddresses = localStorage.getItem("user_addresses");
        if (savedAddresses) {
            try {
                setAddresses(JSON.parse(savedAddresses));
            } catch (e) {
                console.error("Error parsing addresses:", e);
                setAddresses([]);
            }
        } else {
            setAddresses([]);
        }
    };

    const saveAddresses = (newAddresses) => {
        localStorage.setItem("user_addresses", JSON.stringify(newAddresses));
        setAddresses(newAddresses);
    };

    const handleAddAddress = () => {
        if (!newAddress.fullName || !newAddress.address || !newAddress.city || !newAddress.zipCode || !newAddress.phone) {
            showError("Please fill in all address fields.");
            return;
        }
        
        const addressId = Date.now().toString();
        const updatedAddresses = [...addresses, { ...newAddress, id: addressId }];
        saveAddresses(updatedAddresses);
        setNewAddress({ fullName: "", address: "", city: "", zipCode: "", phone: "" });
        setShowAddAddress(false);
        showSuccess("Address added successfully!");
    };

    const handleDeleteAddress = (addressId) => {
        const updatedAddresses = addresses.filter((addr) => addr.id !== addressId);
        saveAddresses(updatedAddresses);
        showSuccess("Address deleted successfully!");
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        const userEmail = profile?.email || email;
        if (!userEmail) {
            showError("Email address not found. Please try again.");
            return;
        }

        try {
            await authApi.requestPasswordReset(userEmail);
            setPasswordResetSent(true);
            showSuccess("Password reset link has been sent to your email!");
        } catch (error) {
            console.error("Error requesting password reset:", error);
            showError(error.response?.data?.message || "Failed to send password reset link.");
        }
    };

    const maskCardNumber = (cardNumber) => {
        if (!cardNumber) return "";
        const cleaned = cardNumber.replace(/\s/g, "");
        if (cleaned.length < 4) return cleaned;
        return "**** **** **** " + cleaned.slice(-4);
    };

    const menuItems = [
        { id: "account", label: "My Account", icon: "👤", path: "#account" },
        { id: "address", label: "My Address", icon: "📍", path: "#address" },
        { id: "cards", label: "My Cards", icon: "💳", path: "#cards" },
        { id: "password", label: "Password Change", icon: "🔒", path: "#password" },
        { id: "help", label: "Help", icon: "❓", path: "#help" },
    ];

    const renderContent = () => {
        switch (activeSection) {
            case "account":
                return (
                    <div>
                        <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1.5rem", color: "#2d3748" }}>
                            My Account
                        </h2>
                        {loadingProfile ? (
                            <div style={{ padding: "2rem", textAlign: "center", color: "#718096" }}>Loading...</div>
                        ) : profile ? (
                            <div style={{ background: "#f7fafc", padding: "1.5rem", borderRadius: "8px" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                    <div>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#4a5568", marginBottom: "0.25rem" }}>
                                            Name
                                        </label>
                                        <div style={{ fontSize: "1rem", color: "#2d3748" }}>{profile.name || "N/A"}</div>
                                    </div>
                                    <div>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#4a5568", marginBottom: "0.25rem" }}>
                                            Email
                                        </label>
                                        <div style={{ fontSize: "1rem", color: "#2d3748" }}>{profile.email || "N/A"}</div>
                                    </div>
                                    <div>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#4a5568", marginBottom: "0.25rem" }}>
                                            Username
                                        </label>
                                        <div style={{ fontSize: "1rem", color: "#2d3748" }}>
                                            {(() => {
                                                try {
                                                    const token = localStorage.getItem("access_token");
                                                    if (token) {
                                                        const payloadBase64 = token.split(".")[1];
                                                        const normalized = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
                                                        const payloadJson = atob(normalized);
                                                        const payload = JSON.parse(payloadJson);
                                                        return payload.sub || payload.username || "N/A";
                                                    }
                                                } catch (e) {}
                                                return "N/A";
                                            })()}
                                        </div>
                                    </div>
                                    {profile.taxId && (
                                        <div>
                                            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#4a5568", marginBottom: "0.25rem" }}>
                                                Tax ID
                                            </label>
                                            <div style={{ fontSize: "1rem", color: "#2d3748" }}>{profile.taxId}</div>
                                        </div>
                                    )}
                                    {profile.homeAddress && (
                                        <div>
                                            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#4a5568", marginBottom: "0.25rem" }}>
                                                Home Address
                                            </label>
                                            <div style={{ fontSize: "1rem", color: "#2d3748" }}>{profile.homeAddress}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div style={{ padding: "2rem", textAlign: "center", color: "#718096" }}>Failed to load profile.</div>
                        )}
                    </div>
                );
            case "address":
                return (
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                            <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#2d3748" }}>My Address</h2>
                            <button
                                onClick={() => setShowAddAddress(!showAddAddress)}
                                style={{
                                    padding: "0.5rem 1rem",
                                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "8px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = "translateY(-2px)";
                                    e.currentTarget.style.boxShadow = "0 4px 8px rgba(102, 126, 234, 0.4)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "translateY(0)";
                                    e.currentTarget.style.boxShadow = "none";
                                }}
                            >
                                {showAddAddress ? "Cancel" : "+ Add Address"}
                            </button>
                        </div>

                        {showAddAddress && (
                            <div style={{ background: "#f7fafc", padding: "1.5rem", borderRadius: "8px", marginBottom: "1.5rem" }}>
                                <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem", color: "#2d3748" }}>Add New Address</h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                    <input
                                        type="text"
                                        placeholder="Full Name"
                                        value={newAddress.fullName}
                                        onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })}
                                        style={{
                                            padding: "0.75rem",
                                            borderRadius: "8px",
                                            border: "2px solid #e2e8f0",
                                            fontSize: "0.95rem",
                                        }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Address"
                                        value={newAddress.address}
                                        onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
                                        style={{
                                            padding: "0.75rem",
                                            borderRadius: "8px",
                                            border: "2px solid #e2e8f0",
                                            fontSize: "0.95rem",
                                        }}
                                    />
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                        <input
                                            type="text"
                                            placeholder="City"
                                            value={newAddress.city}
                                            onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                                            style={{
                                                padding: "0.75rem",
                                                borderRadius: "8px",
                                                border: "2px solid #e2e8f0",
                                                fontSize: "0.95rem",
                                            }}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Zip Code"
                                            value={newAddress.zipCode}
                                            onChange={(e) => setNewAddress({ ...newAddress, zipCode: e.target.value })}
                                            style={{
                                                padding: "0.75rem",
                                                borderRadius: "8px",
                                                border: "2px solid #e2e8f0",
                                                fontSize: "0.95rem",
                                            }}
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Phone"
                                        value={newAddress.phone}
                                        onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                                        style={{
                                            padding: "0.75rem",
                                            borderRadius: "8px",
                                            border: "2px solid #e2e8f0",
                                            fontSize: "0.95rem",
                                        }}
                                    />
                                    <button
                                        onClick={handleAddAddress}
                                        style={{
                                            padding: "0.75rem",
                                            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                            color: "#fff",
                                            border: "none",
                                            borderRadius: "8px",
                                            fontWeight: 600,
                                            cursor: "pointer",
                                        }}
                                    >
                                        Save Address
                                    </button>
                                </div>
                            </div>
                        )}

                        {addresses.length === 0 ? (
                            <div style={{ background: "#f7fafc", padding: "2rem", borderRadius: "8px", textAlign: "center", color: "#718096" }}>
                                No saved addresses. Add your first address above.
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                {addresses.map((addr) => (
                                    <div
                                        key={addr.id}
                                        style={{
                                            background: "#f7fafc",
                                            padding: "1.5rem",
                                            borderRadius: "8px",
                                            border: "1px solid #e2e8f0",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "flex-start",
                                        }}
                                    >
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, color: "#2d3748", marginBottom: "0.5rem" }}>{addr.fullName}</div>
                                            <div style={{ color: "#4a5568", fontSize: "0.95rem", lineHeight: "1.6" }}>
                                                {addr.address}
                                                <br />
                                                {addr.city}, {addr.zipCode}
                                                <br />
                                                {addr.phone}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteAddress(addr.id)}
                                            style={{
                                                padding: "0.5rem 1rem",
                                                background: "#e53e3e",
                                                color: "#fff",
                                                border: "none",
                                                borderRadius: "8px",
                                                fontWeight: 600,
                                                cursor: "pointer",
                                                fontSize: "0.85rem",
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case "cards":
                return (
                    <div>
                        <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1.5rem", color: "#2d3748" }}>
                            My Cards
                        </h2>
                        {loadingCard ? (
                            <div style={{ padding: "2rem", textAlign: "center", color: "#718096" }}>Loading...</div>
                        ) : savedCard ? (
                            <div style={{ background: "#f7fafc", padding: "1.5rem", borderRadius: "8px" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                    <div>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#4a5568", marginBottom: "0.25rem" }}>
                                            Card Number
                                        </label>
                                        <div style={{ fontSize: "1rem", color: "#2d3748", fontFamily: "monospace" }}>
                                            {maskCardNumber(savedCard.cardNumber)}
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#4a5568", marginBottom: "0.25rem" }}>
                                            Card Holder Name
                                        </label>
                                        <div style={{ fontSize: "1rem", color: "#2d3748" }}>{savedCard.cardHolderName || "N/A"}</div>
                                    </div>
                                    <div>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#4a5568", marginBottom: "0.25rem" }}>
                                            Expiry Date
                                        </label>
                                        <div style={{ fontSize: "1rem", color: "#2d3748" }}>{savedCard.expiryDate || "N/A"}</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ background: "#f7fafc", padding: "2rem", borderRadius: "8px", textAlign: "center", color: "#718096" }}>
                                No saved cards. Cards will be saved here when you check "Save Card" during checkout.
                            </div>
                        )}
                    </div>
                );
            case "password":
                return (
                    <div>
                        <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1.5rem", color: "#2d3748" }}>
                            Password Change
                        </h2>
                        {passwordResetSent ? (
                            <div style={{ background: "#f7fafc", padding: "1.5rem", borderRadius: "8px" }}>
                                <p style={{ color: "#2d3748", marginBottom: "1rem" }}>
                                    Password reset link has been sent to your email address. Please check your inbox and follow the instructions to reset your password.
                                </p>
                                <button
                                    onClick={() => {
                                        setPasswordResetSent(false);
                                    }}
                                    style={{
                                        padding: "0.5rem 1rem",
                                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                        color: "#fff",
                                        border: "none",
                                        borderRadius: "8px",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                    }}
                                >
                                    Send Another Link
                                </button>
                            </div>
                        ) : loadingProfile ? (
                            <div style={{ background: "#f7fafc", padding: "1.5rem", borderRadius: "8px", textAlign: "center", color: "#718096" }}>
                                Loading...
                            </div>
                        ) : (
                            <div style={{ background: "#f7fafc", padding: "1.5rem", borderRadius: "8px" }}>
                                <p style={{ color: "#4a5568", marginBottom: "1rem" }}>
                                    This is your registered email address. We'll send the reset link to this email.
                                </p>
                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#4a5568", marginBottom: "0.25rem" }}>
                                        Email Address
                                    </label>
                                    <div
                                        style={{
                                            padding: "0.75rem",
                                            borderRadius: "8px",
                                            border: "2px solid #e2e8f0",
                                            fontSize: "0.95rem",
                                            background: "#fff",
                                            color: "#2d3748",
                                        }}
                                    >
                                        {profile?.email || "Loading..."}
                                    </div>
                                </div>
                                <form onSubmit={handlePasswordReset} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                    <button
                                        type="submit"
                                        disabled={!profile?.email}
                                        style={{
                                            padding: "0.75rem",
                                            background: profile?.email
                                                ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                                                : "#a0aec0",
                                            color: "#fff",
                                            border: "none",
                                            borderRadius: "8px",
                                            fontWeight: 600,
                                            cursor: profile?.email ? "pointer" : "not-allowed",
                                            transition: "all 0.2s",
                                        }}
                                        onMouseEnter={(e) => {
                                            if (profile?.email) {
                                                e.currentTarget.style.transform = "translateY(-2px)";
                                                e.currentTarget.style.boxShadow = "0 4px 8px rgba(102, 126, 234, 0.4)";
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (profile?.email) {
                                                e.currentTarget.style.transform = "translateY(0)";
                                                e.currentTarget.style.boxShadow = "none";
                                            }
                                        }}
                                    >
                                        Send Reset Link
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                );
            case "help":
                return (
                    <div>
                        <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1.5rem", color: "#2d3748" }}>
                            Help & Support
                        </h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                            <div style={{ background: "#f7fafc", padding: "1.5rem", borderRadius: "8px" }}>
                                <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem", color: "#2d3748" }}>
                                    Frequently Asked Questions
                                </h3>
                                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                    <div>
                                        <div style={{ fontWeight: 600, color: "#4a5568", marginBottom: "0.25rem" }}>How do I place an order?</div>
                                        <div style={{ color: "#718096", fontSize: "0.95rem" }}>
                                            Add products to your cart, proceed to checkout, fill in your shipping and payment information, and confirm your order.
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, color: "#4a5568", marginBottom: "0.25rem" }}>How can I track my order?</div>
                                        <div style={{ color: "#718096", fontSize: "0.95rem" }}>
                                            You can view your order status in the "Order History" section. Orders are updated in real-time.
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, color: "#4a5568", marginBottom: "0.25rem" }}>What is your return policy?</div>
                                        <div style={{ color: "#718096", fontSize: "0.95rem" }}>
                                            You can request a refund within 30 days of delivery. Go to your order history and click "Request Refund" on eligible items.
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, color: "#4a5568", marginBottom: "0.25rem" }}>How do I change my password?</div>
                                        <div style={{ color: "#718096", fontSize: "0.95rem" }}>
                                            Use the "Password Change" section in your account settings. We'll send you a reset link via email.
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div style={{ background: "#f7fafc", padding: "1.5rem", borderRadius: "8px" }}>
                                <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem", color: "#2d3748" }}>
                                    Need More Help?
                                </h3>
                                <p style={{ color: "#4a5568", marginBottom: "1rem" }}>
                                    If you have a different question or need assistance, our support agents are here to help!
                                </p>
                                <Link
                                    to="/support/chat"
                                    style={{
                                        display: "inline-block",
                                        padding: "0.75rem 1.5rem",
                                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                        color: "#fff",
                                        textDecoration: "none",
                                        borderRadius: "8px",
                                        fontWeight: 600,
                                        transition: "all 0.2s",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = "translateY(-2px)";
                                        e.currentTarget.style.boxShadow = "0 4px 8px rgba(102, 126, 234, 0.4)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = "translateY(0)";
                                        e.currentTarget.style.boxShadow = "none";
                                    }}
                                >
                                    Contact Support Agent
                                </Link>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div style={{ minHeight: "calc(100vh - 80px)", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
            <div
                style={{
                    padding: "2rem",
                    maxWidth: "1400px",
                    margin: "0 auto",
                }}
            >
                <div
                    style={{
                        background: "rgba(255, 255, 255, 0.95)",
                        backdropFilter: "blur(10px)",
                        borderRadius: "20px",
                        padding: "2rem",
                        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
                        display: "flex",
                        gap: "2rem",
                        minHeight: "600px",
                    }}
                >
                    {/* Left Sidebar Menu */}
                    <div
                        style={{
                            width: "280px",
                            borderRight: "1px solid #e2e8f0",
                            paddingRight: "2rem",
                            flexShrink: 0,
                        }}
                    >
                        <h1
                            style={{
                                fontSize: "1.5rem",
                                fontWeight: 700,
                                color: "#2d3748",
                                marginBottom: "2rem",
                            }}
                        >
                            My Account & Help
                        </h1>
                        <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            {menuItems.map((item) => {
                                const isActive = activeSection === item.id;
                                return (
                                    <Link
                                        key={item.id}
                                        to={item.path}
                                        onClick={() => setActiveSection(item.id)}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.75rem",
                                            padding: "0.75rem 1rem",
                                            borderRadius: "8px",
                                            textDecoration: "none",
                                            color: isActive ? "#fff" : "#2d3748",
                                            background: isActive ? "#ff6b35" : "transparent",
                                            fontWeight: isActive ? 600 : 500,
                                            transition: "all 0.2s",
                                            border: isActive ? "none" : "1px solid transparent",
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isActive) {
                                                e.currentTarget.style.background = "#f7fafc";
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isActive) {
                                                e.currentTarget.style.background = "transparent";
                                            }
                                        }}
                                    >
                                        <span style={{ fontSize: "1.2rem" }}>{item.icon}</span>
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Right Content Area */}
                    <div style={{ flex: 1, paddingLeft: "2rem" }}>{renderContent()}</div>
                </div>
            </div>
        </div>
    );
}
