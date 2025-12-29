import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import supportApi from "../api/supportApi";
import { useToast } from "../contexts/ToastContext";
import { useUserRole } from "../hooks/useUserRole";

export default function SupportAgentChatPage() {
    const [userName, setUserName] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [customerContext, setCustomerContext] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingQueue, setLoadingQueue] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [statusFilter, setStatusFilter] = useState("");
    const [messageText, setMessageText] = useState("");
    const [sendingMessage, setSendingMessage] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const navigate = useNavigate();
    const { success: showSuccess, error: showError } = useToast();
    const userRole = useUserRole();
    const dropdownRef = useRef(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [pollingInterval, setPollingInterval] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            navigate("/login");
            return;
        }

        const storedRole = localStorage.getItem("user_role");
        const currentRole = userRole || storedRole;

        if (currentRole === null || currentRole === undefined) {
            return;
        }

        if (currentRole !== "SUPPORT_AGENT") {
            navigate("/");
            return;
        }

        const loadData = async () => {
            try {
                const payloadBase64 = token.split(".")[1];
                const normalized = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
                const payloadJson = atob(normalized);
                const payload = JSON.parse(payloadJson);
                const username = payload.sub || payload.name || payload.username;
                setUserName(username);

                await loadQueue();
            } catch (error) {
                console.error("Error loading data:", error);
                showError("Failed to load data. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        loadData();

        // Poll for new messages every 3 seconds if a conversation is selected
        const interval = setInterval(() => {
            if (selectedConversation) {
                loadMessages(selectedConversation.conversationId);
            }
        }, 3000);
        setPollingInterval(interval);

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [navigate, userRole, showError, selectedConversation]);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const loadQueue = async () => {
        setLoadingQueue(true);
        try {
            const response = await supportApi.getQueue(statusFilter || null);
            const conversationsData = response.data?.data || response.data || [];
            setConversations(Array.isArray(conversationsData) ? conversationsData : []);
        } catch (error) {
            console.error("Error loading queue:", error);
            showError(error.response?.data?.message || "Failed to load conversation queue.");
        } finally {
            setLoadingQueue(false);
        }
    };

    const loadMessages = async (conversationId) => {
        try {
            const response = await supportApi.agentGetMessages(conversationId);
            const messagesData = response.data?.data || response.data || [];
            setMessages(Array.isArray(messagesData) ? messagesData : []);
        } catch (error) {
            console.error("Error loading messages:", error);
            showError(error.response?.data?.message || "Failed to load messages.");
        }
    };

    const loadCustomerContext = async (conversationId) => {
        try {
            const response = await supportApi.getCustomerDetails(conversationId);
            const contextData = response.data?.data || response.data;
            setCustomerContext(contextData);
        } catch (error) {
            console.error("Error loading customer context:", error);
            // Don't show error, context might not be available for guest users
        }
    };

    const handleClaimConversation = async (conversationId) => {
        try {
            const response = await supportApi.claimConversation(conversationId);
            const conversation = response.data?.data || response.data;
            setSelectedConversation(conversation);
            await loadMessages(conversationId);
            await loadCustomerContext(conversationId);
            await loadQueue();
            showSuccess("Conversation claimed successfully!");
        } catch (error) {
            console.error("Error claiming conversation:", error);
            showError(error.response?.data?.message || "Failed to claim conversation.");
        }
    };

    const handleSelectConversation = async (conversation) => {
        if (conversation.status === "OPEN") {
            await handleClaimConversation(conversation.conversationId);
        } else {
            setSelectedConversation(conversation);
            await loadMessages(conversation.conversationId);
            await loadCustomerContext(conversation.conversationId);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!messageText.trim() || !selectedConversation) return;

        setSendingMessage(true);
        try {
            await supportApi.agentSendText(selectedConversation.conversationId, messageText.trim());
            setMessageText("");
            await loadMessages(selectedConversation.conversationId);
        } catch (error) {
            console.error("Error sending message:", error);
            showError(error.response?.data?.message || "Failed to send message.");
        } finally {
            setSendingMessage(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedConversation) return;

        setUploadingFile(true);
        try {
            await supportApi.agentUploadAttachment(selectedConversation.conversationId, file);
            await loadMessages(selectedConversation.conversationId);
            showSuccess("File uploaded successfully!");
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        } catch (error) {
            console.error("Error uploading file:", error);
            showError(error.response?.data?.message || "Failed to upload file.");
        } finally {
            setUploadingFile(false);
        }
    };

    const handleCloseConversation = async () => {
        if (!selectedConversation) return;

        try {
            await supportApi.closeConversation(selectedConversation.conversationId);
            setSelectedConversation(null);
            setMessages([]);
            setCustomerContext(null);
            await loadQueue();
            showSuccess("Conversation closed successfully!");
        } catch (error) {
            console.error("Error closing conversation:", error);
            showError(error.response?.data?.message || "Failed to close conversation.");
        }
    };

    const handleDownloadAttachment = async (attachmentId) => {
        try {
            const response = await supportApi.getAttachment(attachmentId);
            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `attachment_${attachmentId}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error downloading attachment:", error);
            showError(error.response?.data?.message || "Failed to download attachment.");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user_role");
        setUserName(null);
        setShowDropdown(false);
        navigate("/login");
    };

    const storedRole = localStorage.getItem("user_role");
    const currentRole = userRole || storedRole;

    if (loading || (currentRole === null || currentRole === undefined)) {
        return (
            <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ color: "#fff", fontSize: "1.5rem" }}>Loading...</div>
            </div>
        );
    }

    if (currentRole !== "SUPPORT_AGENT") {
        return (
            <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ background: "rgba(255, 255, 255, 0.95)", padding: "2rem", borderRadius: "8px", textAlign: "center" }}>
                    <h2 style={{ color: "#2d3748" }}>Access Denied</h2>
                    <p style={{ color: "#718096" }}>This page is only accessible to Support Agents.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
            <nav
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "1.2rem 4rem",
                    background: "rgba(255, 255, 255, 0.95)",
                    backdropFilter: "blur(10px)",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                    position: "sticky",
                    top: 0,
                    zIndex: 100,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "3rem" }}>
                    <Link
                        to="/"
                        style={{
                            fontSize: "1.5rem",
                            fontWeight: 700,
                            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            textDecoration: "none",
                        }}
                    >
                        🛍️ TeknoSU
                    </Link>
                    <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
                        <Link 
                            to="/support/chat" 
                            style={{ color: "#667eea", textDecoration: "underline", padding: "0.5rem 1rem", borderRadius: "4px", fontWeight: 600, transition: "all 0.2s" }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = "#764ba2";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = "#667eea";
                            }}
                        >
                            Support Chat
                        </Link>
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "1rem", position: "relative" }}>
                    {userName && (
                        <div ref={dropdownRef} style={{ position: "relative" }}
                            onMouseEnter={() => setShowDropdown(true)}
                            onMouseLeave={() => setShowDropdown(false)}
                        >
                            <button
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.6rem",
                                    padding: "0.6rem 1.2rem",
                                    borderRadius: "4px",
                                    border: "none",
                                    background: showDropdown ? "#f7fafc" : "transparent",
                                    color: showDropdown ? "#667eea" : "#4a5568",
                                    transition: "all 0.2s",
                                    fontSize: "0.95rem",
                                    fontWeight: 500,
                                    cursor: "pointer",
                                }}
                            >
                                <span>{userName}</span>
                                <span style={{ fontSize: "0.7rem" }}>{showDropdown ? "▲" : "▼"}</span>
                            </button>
                            {showDropdown && (
                                <div
                                    style={{
                                        position: "absolute",
                                        top: "100%",
                                        right: 0,
                                        marginTop: "0.25rem",
                                        background: "#fff",
                                        border: "1px solid #e2e8f0",
                                        borderRadius: "4px",
                                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                                        minWidth: "200px",
                                        zIndex: 1000,
                                    }}
                                >
                                    <button
                                        onClick={handleLogout}
                                        style={{
                                            width: "100%",
                                            textAlign: "left",
                                            padding: "0.75rem 1rem",
                                            background: "transparent",
                                            border: "none",
                                            color: "#e53e3e",
                                            fontSize: "0.9rem",
                                            cursor: "pointer",
                                            transition: "all 0.2s",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = "#fee";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = "transparent";
                                        }}
                                    >
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </nav>

            <div style={{ display: "flex", height: "calc(100vh - 80px)", padding: "2rem", gap: "1rem" }}>
                {/* Conversation Queue */}
                <div
                    style={{
                        flex: "0 0 350px",
                        background: "rgba(255, 255, 255, 0.95)",
                        backdropFilter: "blur(10px)",
                        borderRadius: "8px",
                        padding: "1.5rem",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#2d3748", marginBottom: "1rem" }}>
                        Conversation Queue
                    </h2>
                    
                    {/* Filter */}
                    <div style={{ marginBottom: "1rem" }}>
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                loadQueue();
                            }}
                            style={{
                                width: "100%",
                                padding: "0.5rem",
                                border: "1px solid #cbd5e0",
                                borderRadius: "4px",
                                fontSize: "0.85rem",
                            }}
                        >
                            <option value="">All Status</option>
                            <option value="OPEN">Open</option>
                            <option value="CLAIMED">Claimed</option>
                            <option value="CLOSED">Closed</option>
                        </select>
                    </div>

                    {/* Conversations List */}
                    <div style={{ flex: 1, overflowY: "auto" }}>
                        {loadingQueue ? (
                            <div style={{ textAlign: "center", padding: "2rem", color: "#718096" }}>Loading...</div>
                        ) : conversations.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "2rem", color: "#718096" }}>No conversations found.</div>
                        ) : (
                            conversations.map((conv) => (
                                <div
                                    key={conv.conversationId}
                                    onClick={() => handleSelectConversation(conv)}
                                    style={{
                                        padding: "1rem",
                                        marginBottom: "0.5rem",
                                        background: selectedConversation?.conversationId === conv.conversationId ? "#667eea" : "#f7fafc",
                                        color: selectedConversation?.conversationId === conv.conversationId ? "#fff" : "#2d3748",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                        border: selectedConversation?.conversationId === conv.conversationId ? "2px solid #667eea" : "1px solid #e2e8f0",
                                    }}
                                    onMouseEnter={(e) => {
                                        if (selectedConversation?.conversationId !== conv.conversationId) {
                                            e.currentTarget.style.background = "#e2e8f0";
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (selectedConversation?.conversationId !== conv.conversationId) {
                                            e.currentTarget.style.background = "#f7fafc";
                                        }
                                    }}
                                >
                                    <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.25rem" }}>
                                        {conv.customerUserId ? `User: ${conv.customerUserId}` : `Guest: ${conv.guestToken?.substring(0, 8)}...`}
                                    </div>
                                    <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                                        Status: {conv.status}
                                    </div>
                                    {conv.lastMessageAt && (
                                        <div style={{ fontSize: "0.75rem", opacity: 0.7, marginTop: "0.25rem" }}>
                                            {new Date(conv.lastMessageAt).toLocaleString()}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div
                    style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        background: "rgba(255, 255, 255, 0.95)",
                        backdropFilter: "blur(10px)",
                        borderRadius: "8px",
                        padding: "1.5rem",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                    }}
                >
                    {selectedConversation ? (
                        <>
                            {/* Chat Header */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid #e2e8f0" }}>
                                <div>
                                    <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#2d3748", marginBottom: "0.25rem" }}>
                                        {selectedConversation.customerUserId ? `User: ${selectedConversation.customerUserId}` : `Guest: ${selectedConversation.guestToken?.substring(0, 8)}...`}
                                    </h3>
                                    <div style={{ fontSize: "0.85rem", color: "#718096" }}>
                                        Status: {selectedConversation.status}
                                    </div>
                                </div>
                                <button
                                    onClick={handleCloseConversation}
                                    disabled={selectedConversation.status === "CLOSED"}
                                    style={{
                                        padding: "0.5rem 1rem",
                                        background: selectedConversation.status === "CLOSED" ? "#e2e8f0" : "#e53e3e",
                                        color: selectedConversation.status === "CLOSED" ? "#718096" : "#fff",
                                        border: "none",
                                        borderRadius: "4px",
                                        fontSize: "0.85rem",
                                        cursor: selectedConversation.status === "CLOSED" ? "not-allowed" : "pointer",
                                    }}
                                >
                                    Close Conversation
                                </button>
                            </div>

                            {/* Customer Context */}
                            {customerContext && (
                                <div style={{ marginBottom: "1rem", padding: "1rem", background: "#f7fafc", borderRadius: "4px", fontSize: "0.85rem" }}>
                                    <div style={{ fontWeight: 600, marginBottom: "0.5rem", color: "#2d3748" }}>Customer Information:</div>
                                    {customerContext.user && (
                                        <div style={{ marginBottom: "0.5rem" }}>
                                            <strong>Name:</strong> {customerContext.user.name || "N/A"} | 
                                            <strong> Email:</strong> {customerContext.user.email || "N/A"}
                                        </div>
                                    )}
                                    {customerContext.orders && customerContext.orders.length > 0 && (
                                        <div style={{ marginBottom: "0.5rem" }}>
                                            <strong>Orders:</strong> {customerContext.orders.length}
                                        </div>
                                    )}
                                    {customerContext.wishListProductIds && customerContext.wishListProductIds.length > 0 && (
                                        <div>
                                            <strong>Wishlist Items:</strong> {customerContext.wishListProductIds.length}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Messages */}
                            <div style={{ flex: 1, overflowY: "auto", marginBottom: "1rem", padding: "1rem", background: "#f7fafc", borderRadius: "4px" }}>
                                {loadingMessages ? (
                                    <div style={{ textAlign: "center", padding: "2rem", color: "#718096" }}>Loading messages...</div>
                                ) : messages.length === 0 ? (
                                    <div style={{ textAlign: "center", padding: "2rem", color: "#718096" }}>No messages yet.</div>
                                ) : (
                                    messages.map((msg) => (
                                        <div
                                            key={msg.messageId}
                                            style={{
                                                marginBottom: "1rem",
                                                display: "flex",
                                                justifyContent: msg.senderType === "SUPPORT_AGENT" ? "flex-end" : "flex-start",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    maxWidth: "70%",
                                                    padding: "0.75rem 1rem",
                                                    background: msg.senderType === "SUPPORT_AGENT" ? "#667eea" : "#fff",
                                                    color: msg.senderType === "SUPPORT_AGENT" ? "#fff" : "#2d3748",
                                                    borderRadius: "8px",
                                                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                                                }}
                                            >
                                                <div style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                                                    {msg.senderType === "SUPPORT_AGENT" ? "You" : msg.senderType === "CUSTOMER" ? "Customer" : "Guest"}
                                                </div>
                                                {msg.type === "TEXT" ? (
                                                    <div style={{ fontSize: "0.9rem" }}>{msg.text}</div>
                                                ) : (
                                                    <div>
                                                        <div style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>Attachment</div>
                                                        <button
                                                            onClick={() => handleDownloadAttachment(msg.attachmentId)}
                                                            style={{
                                                                padding: "0.5rem 1rem",
                                                                background: msg.senderType === "SUPPORT_AGENT" ? "#764ba2" : "#667eea",
                                                                color: "#fff",
                                                                border: "none",
                                                                borderRadius: "4px",
                                                                fontSize: "0.85rem",
                                                                cursor: "pointer",
                                                            }}
                                                        >
                                                            Download File
                                                        </button>
                                                    </div>
                                                )}
                                                <div style={{ fontSize: "0.75rem", opacity: 0.7, marginTop: "0.25rem" }}>
                                                    {new Date(msg.createdAt).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Message Input */}
                            <form onSubmit={handleSendMessage} style={{ display: "flex", gap: "0.5rem" }}>
                                <input
                                    type="text"
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    placeholder="Type a message..."
                                    disabled={selectedConversation.status === "CLOSED" || sendingMessage}
                                    style={{
                                        flex: 1,
                                        padding: "0.75rem",
                                        border: "1px solid #cbd5e0",
                                        borderRadius: "4px",
                                        fontSize: "0.85rem",
                                    }}
                                />
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    onChange={handleFileUpload}
                                    disabled={selectedConversation.status === "CLOSED" || uploadingFile}
                                    style={{ display: "none" }}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={selectedConversation.status === "CLOSED" || uploadingFile}
                                    style={{
                                        padding: "0.75rem 1rem",
                                        background: "#e2e8f0",
                                        color: "#4a5568",
                                        border: "none",
                                        borderRadius: "4px",
                                        fontSize: "0.85rem",
                                        cursor: selectedConversation.status === "CLOSED" ? "not-allowed" : "pointer",
                                    }}
                                >
                                    📎
                                </button>
                                <button
                                    type="submit"
                                    disabled={selectedConversation.status === "CLOSED" || sendingMessage || !messageText.trim()}
                                    style={{
                                        padding: "0.75rem 1.5rem",
                                        background: selectedConversation.status === "CLOSED" || sendingMessage || !messageText.trim() ? "#e2e8f0" : "#667eea",
                                        color: selectedConversation.status === "CLOSED" || sendingMessage || !messageText.trim() ? "#718096" : "#fff",
                                        border: "none",
                                        borderRadius: "4px",
                                        fontSize: "0.85rem",
                                        cursor: selectedConversation.status === "CLOSED" || sendingMessage || !messageText.trim() ? "not-allowed" : "pointer",
                                    }}
                                >
                                    {sendingMessage ? "Sending..." : "Send"}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#718096" }}>
                            Select a conversation to start chatting
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

