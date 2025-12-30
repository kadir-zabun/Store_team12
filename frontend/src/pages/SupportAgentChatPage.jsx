import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import supportApi from "../api/supportApi";
import { useToast } from "../contexts/ToastContext";
import { useUserRole } from "../hooks/useUserRole";
import socketService from "../utils/socketService";

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
    const [queuePollingInterval, setQueuePollingInterval] = useState(null);

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

                // Connect to Socket
                socketService.connect(token, () => {
                    // console.log("Agent Connected to WebSocket");

                    // Listen for global queue updates
                    socketService.subscribe("/topic/support/queue", () => {
                        loadQueue(true);
                    });
                });

                await loadQueue();
            } catch (error) {
                console.error("Error loading data:", error);
                showError("Failed to load data. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        loadData();

        // Poll for QUEUE updates every 5 seconds (Queue updates are less critical than messages)
        const interval = setInterval(() => {
            loadQueue(true); // silent update
        }, 5000);
        setQueuePollingInterval(interval);

        return () => {
            if (interval) clearInterval(interval);
            socketService.disconnect();
        };
    }, [navigate, userRole, showError]);

    // WebSocket subscription for selected conversation
    useEffect(() => {
        if (selectedConversation) {
            const topic = `/topic/support/${selectedConversation.conversationId}`;
            // Subscribe
            const sub = socketService.subscribe(topic, (message) => {
                setMessages((prev) => {
                    // Avoid duplicates
                    if (prev.some(m => m.messageId === message.messageId)) return prev;
                    return [...prev, message];
                });
            });

            // Cleanup subscription when switching conversation? 
            // In current simple implementation, we can just rely on the fact that existing subscriptions 
            // will still fire but we only care about if it matches 'selectedConversation'. 
            // Actually, if we switch conv, we probably want to stop listening to the old one to avoid noise?
            // But StompJS client doesn't expose easy unsubscribe from here without storing ID. 
            // Simpler approach: Just let it be or improve socketService to return unsubscribe handle.
            // Our socketService implementation returns the subscription object which has unsubscribe().

            return () => {
                if (sub) sub.unsubscribe();
            };
        }
    }, [selectedConversation]);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const loadQueue = async (silent = false) => {
        if (!silent) setLoadingQueue(true);
        try {
            const response = await supportApi.getQueue(statusFilter || null);
            const conversationsData = response.data?.data || response.data || [];

            // Check if our selected conversation status changed in the list
            if (selectedConversation) {
                const updated = conversationsData.find(c => c.conversationId === selectedConversation.conversationId);
                // Update selected conversation status if needed (e.g. if another agent closed it, though unlikely)
            }

            setConversations(Array.isArray(conversationsData) ? conversationsData : []);
        } catch (error) {
            console.error("Error loading queue:", error);
            if (!silent) showError(error.response?.data?.message || "Failed to load conversation queue.");
        } finally {
            if (!silent) setLoadingQueue(false);
        }
    };

    const loadMessages = async (conversationId) => {
        setLoadingMessages(true);
        try {
            const response = await supportApi.agentGetMessages(conversationId);
            const messagesData = response.data?.data || response.data || [];
            setMessages(Array.isArray(messagesData) ? messagesData : []);
        } catch (error) {
            console.error("Error loading messages:", error);
            showError(error.response?.data?.message || "Failed to load messages.");
        } finally {
            setLoadingMessages(false);
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
            setCustomerContext(null);
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
            // WebSocket will add the message to the list
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
            showSuccess("File uploaded successfully!");
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
            // WebSocket will add the message
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
        <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)", display: "flex", flexDirection: "column", color: "#2d3748" }}>


            <div style={{ flex: 1, display: "flex", padding: "2rem", gap: "1.5rem", overflow: "hidden" }}>
                {/* Conversation Queue */}
                <div
                    style={{
                        flex: "0 0 320px",
                        background: "#fff",
                        borderRadius: "12px",
                        padding: "1.5rem",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#2d3748", marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>Conversations</span>
                        <span style={{ fontSize: "0.8rem", color: "#718096", fontWeight: "normal" }}>Queue</span>
                    </h2>

                    {/* Filter */}
                    <div style={{ marginBottom: "1rem" }}>
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                loadQueue(); // Trigger load immediately on change
                            }}
                            style={{
                                width: "100%",
                                padding: "0.6rem",
                                border: "1px solid #e2e8f0",
                                borderRadius: "8px",
                                fontSize: "0.9rem",
                                outline: "none",
                                color: "#4a5568",
                                background: "#f8f9fa",
                                boxSizing: "border-box"
                            }}
                        >
                            <option value="">All Statuses</option>
                            <option value="OPEN">Open (Waiting)</option>
                            <option value="CLAIMED">My Active</option>
                            <option value="CLOSED">Closed</option>
                        </select>
                    </div>

                    {/* Conversations List */}
                    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {loadingQueue ? (
                            <div style={{ textAlign: "center", padding: "2rem", color: "#a0aec0" }}>Loading...</div>
                        ) : conversations.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "2rem", color: "#a0aec0" }}>No conversations.</div>
                        ) : (
                            conversations.map((conv) => (
                                <div
                                    key={conv.conversationId}
                                    onClick={() => handleSelectConversation(conv)}
                                    style={{
                                        padding: "1rem",
                                        background: selectedConversation?.conversationId === conv.conversationId ? "#ebf4ff" : "#fff",
                                        borderRadius: "8px",
                                        cursor: "pointer",
                                        border: selectedConversation?.conversationId === conv.conversationId ? "1px solid #667eea" : "1px solid #e2e8f0",
                                        transition: "all 0.2s",
                                    }}
                                    onMouseEnter={(e) => { if (selectedConversation?.conversationId !== conv.conversationId) e.currentTarget.style.borderColor = "#cbd5e0"; }}
                                    onMouseLeave={(e) => { if (selectedConversation?.conversationId !== conv.conversationId) e.currentTarget.style.borderColor = "#e2e8f0"; }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                                        <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "#2d3748" }}>
                                            {conv.customerUserId ? conv.customerUserId : "Guest"}
                                        </span>
                                        <span style={{
                                            fontSize: "0.75rem",
                                            padding: "0.1rem 0.4rem",
                                            borderRadius: "4px",
                                            background: conv.status === "OPEN" ? "#fed7d7" : conv.status === "CLAIMED" ? "#c6f6d5" : "#e2e8f0",
                                            color: conv.status === "OPEN" ? "#c53030" : conv.status === "CLAIMED" ? "#2f855a" : "#718096",
                                            fontWeight: 600
                                        }}>
                                            {conv.status}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: "0.8rem", color: "#718096" }}>
                                        {conv.guestToken ? `Token: ...${conv.guestToken.substr(-4)}` : "Verified User"}
                                    </div>
                                    <div style={{ fontSize: "0.75rem", color: "#a0aec0", marginTop: "0.4rem" }}>
                                        {new Date(conv.lastMessageAt).toLocaleString()}
                                    </div>
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
                        background: "#fff",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                        overflow: "hidden"
                    }}
                >
                    {selectedConversation ? (
                        <>
                            {/* Chat Header */}
                            <div style={{ padding: "1.25rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "#2d3748" }}>
                                        {selectedConversation.customerUserId ? `User: ${selectedConversation.customerUserId}` : `Guest Customer`}
                                    </div>
                                    <div style={{ fontSize: "0.85rem", color: "#718096", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                        Status:
                                        <span style={{ fontWeight: 600 }}>{selectedConversation.status}</span>
                                        {selectedConversation.guestToken && <span style={{ opacity: 0.5 }}>| Guest Token: {selectedConversation.guestToken.substr(0, 8)}...</span>}
                                    </div>
                                </div>
                                <button
                                    onClick={handleCloseConversation}
                                    disabled={selectedConversation.status === "CLOSED"}
                                    style={{
                                        padding: "0.5rem 1rem",
                                        background: selectedConversation.status === "CLOSED" ? "#edf2f7" : "#fff",
                                        color: selectedConversation.status === "CLOSED" ? "#a0aec0" : "#e53e3e",
                                        border: selectedConversation.status === "CLOSED" ? "none" : "1px solid #e53e3e",
                                        borderRadius: "6px",
                                        fontSize: "0.85rem",
                                        cursor: selectedConversation.status === "CLOSED" ? "not-allowed" : "pointer",
                                        fontWeight: 600,
                                        transition: "all 0.2s"
                                    }}
                                >
                                    {selectedConversation.status === "CLOSED" ? "Archived" : "Mark Resolved"}
                                </button>
                            </div>

                            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
                                {/* Messages */}
                                <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "1px solid #e2e8f0" }}>
                                    <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", background: "#f8f9fa", display: "flex", flexDirection: "column", gap: "1rem" }}>
                                        {loadingMessages ? (
                                            <div style={{ textAlign: "center", color: "#a0aec0", marginTop: "2rem" }}>Loading conversation history...</div>
                                        ) : messages.length === 0 ? (
                                            <div style={{ textAlign: "center", color: "#a0aec0", marginTop: "2rem" }}>No messages yet.</div>
                                        ) : (
                                            messages.map((msg) => {
                                                const isMe = msg.senderType === "SUPPORT_AGENT";
                                                return (
                                                    <div
                                                        key={msg.messageId}
                                                        style={{
                                                            display: "flex",
                                                            justifyContent: isMe ? "flex-end" : "flex-start",
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                maxWidth: "70%",
                                                                padding: "1rem",
                                                                background: isMe ? "#667eea" : "#fff",
                                                                color: isMe ? "#fff" : "#2d3748",
                                                                borderRadius: isMe ? "12px 12px 0 12px" : "12px 12px 12px 0",
                                                                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                                                            }}
                                                        >
                                                            <div style={{ fontSize: "0.75rem", marginBottom: "0.25rem", opacity: 0.8 }}>
                                                                {isMe ? "You" : msg.senderType === "CUSTOMER" ? "Customer" : "Guest"}
                                                            </div>
                                                            {msg.type === "TEXT" ? (
                                                                <div style={{ fontSize: "0.95rem", lineHeight: "1.5" }}>{msg.text}</div>
                                                            ) : (
                                                                <div>
                                                                    <div style={{ fontSize: "0.85rem", opacity: 0.9, marginBottom: "0.5rem" }}>Attachment</div>
                                                                    <button
                                                                        onClick={() => handleDownloadAttachment(msg.attachmentId)}
                                                                        style={{
                                                                            padding: "0.4rem 0.8rem",
                                                                            background: isMe ? "rgba(255,255,255,0.2)" : "#edf2f7",
                                                                            color: isMe ? "#fff" : "#2d3748",
                                                                            border: "none",
                                                                            borderRadius: "4px",
                                                                            fontSize: "0.85rem",
                                                                            cursor: "pointer",
                                                                            display: "flex",
                                                                            alignItems: "center",
                                                                            gap: "0.5rem"
                                                                        }}
                                                                    >
                                                                        ⬇️ Download
                                                                    </button>
                                                                </div>
                                                            )}
                                                            <div style={{ fontSize: "0.7rem", opacity: 0.7, marginTop: "0.5rem", textAlign: "right" }}>
                                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Input Area */}
                                    <form onSubmit={handleSendMessage} style={{ padding: "1.25rem", background: "#fff", borderTop: "1px solid #e2e8f0", display: "flex", gap: "1rem", alignItems: "flex-end" }}>
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
                                                padding: "0.6rem",
                                                background: "#edf2f7",
                                                color: "#4a5568",
                                                border: "none",
                                                borderRadius: "8px",
                                                cursor: selectedConversation.status === "CLOSED" ? "not-allowed" : "pointer",
                                                transition: "all 0.2s"
                                            }}
                                            title="Attach File"
                                        >
                                            📎
                                        </button>
                                        <div style={{ flex: 1 }}>
                                            <input
                                                type="text"
                                                value={messageText}
                                                onChange={(e) => setMessageText(e.target.value)}
                                                placeholder={selectedConversation.status === "CLOSED" ? "This conversation is closed." : "Type your reply..."}
                                                disabled={selectedConversation.status === "CLOSED" || sendingMessage}
                                                style={{
                                                    width: "100%",
                                                    padding: "0.75rem",
                                                    border: "1px solid #cbd5e0",
                                                    borderRadius: "8px",
                                                    fontSize: "0.95rem",
                                                    outline: "none",
                                                    background: selectedConversation.status === "CLOSED" ? "#f7fafc" : "#fff",
                                                    color: "#2d3748",
                                                    boxSizing: "border-box"
                                                }}
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={selectedConversation.status === "CLOSED" || sendingMessage || !messageText.trim()}
                                            style={{
                                                padding: "0.75rem 1.5rem",
                                                background: selectedConversation.status === "CLOSED" || sendingMessage || !messageText.trim() ? "#cbd5e0" : "#667eea",
                                                color: "#fff",
                                                border: "none",
                                                borderRadius: "8px",
                                                fontSize: "0.95rem",
                                                fontWeight: 600,
                                                cursor: selectedConversation.status === "CLOSED" || sendingMessage || !messageText.trim() ? "not-allowed" : "pointer",
                                                flexShrink: 0
                                            }}
                                        >
                                            Send
                                        </button>
                                    </form>
                                </div>

                                {/* Context Panel (Right Side) */}
                                <div style={{ width: "300px", background: "#fff", padding: "1.5rem", overflowY: "auto" }}>
                                    <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#2d3748", marginBottom: "1rem", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem" }}>
                                        Customer Context
                                    </h3>

                                    {customerContext ? (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                                            {/* Profile */}
                                            {customerContext.user && (
                                                <div>
                                                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#a0aec0", textTransform: "uppercase", marginBottom: "0.5rem" }}>Profile</div>
                                                    <div style={{ fontSize: "0.9rem", color: "#2d3748" }}>
                                                        <div style={{ fontWeight: 600 }}>{customerContext.user.name}</div>
                                                        <div style={{ color: "#718096" }}>{customerContext.user.email}</div>
                                                        <div style={{ fontSize: "0.8rem", marginTop: "0.25rem", padding: "0.1rem 0.4rem", background: "#edf2f7", borderRadius: "4px", display: "inline-block" }}>
                                                            {customerContext.user.role}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Active Cart */}
                                            <div>
                                                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#a0aec0", textTransform: "uppercase", marginBottom: "0.5rem" }}>Active Cart</div>
                                                {customerContext.cart && customerContext.cart.items && customerContext.cart.items.length > 0 ? (
                                                    <div style={{ background: "#f7fafc", borderRadius: "8px", padding: "0.75rem", border: "1px solid #edf2f7" }}>
                                                        <div style={{ marginBottom: "0.5rem", fontWeight: 600, fontSize: "0.9rem" }}>
                                                            Total: ${customerContext.cart.totalPrice}
                                                        </div>
                                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                                            {customerContext.cart.items.slice(0, 3).map((item, idx) => (
                                                                <div key={idx} style={{ fontSize: "0.85rem", display: "flex", justifyContent: "space-between" }}>
                                                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: "0.5rem" }}>
                                                                        {item.quantity}x {item.productName || "Product"}
                                                                    </span>
                                                                    <span style={{ fontWeight: 600 }}>${item.price}</span>
                                                                </div>
                                                            ))}
                                                            {customerContext.cart.items.length > 3 && (
                                                                <div style={{ fontSize: "0.8rem", color: "#718096", fontStyle: "italic" }}>
                                                                    + {customerContext.cart.items.length - 3} more items
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div style={{ fontSize: "0.9rem", color: "#a0aec0", fontStyle: "italic" }}>Cart is empty</div>
                                                )}
                                            </div>

                                            {/* Orders */}
                                            <div>
                                                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#a0aec0", textTransform: "uppercase", marginBottom: "0.5rem" }}>Recent Orders</div>
                                                {customerContext.orders && customerContext.orders.length > 0 ? (
                                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                                        {customerContext.orders.slice(0, 3).map((order) => (
                                                            <div key={order.orderId} style={{ padding: "0.5rem", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "0.85rem" }}>
                                                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                                                                    <span style={{ fontWeight: 600 }}>#{order.orderId.substring(0, 6)}</span>
                                                                    <span style={{ color: "#718096" }}>{new Date(order.orderDate).toLocaleDateString()}</span>
                                                                </div>
                                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                                    <span style={{
                                                                        padding: "0.1rem 0.3rem",
                                                                        borderRadius: "3px",
                                                                        fontSize: "0.7rem",
                                                                        background: "#ebf8ff",
                                                                        color: "#2b6cb0"
                                                                    }}>
                                                                        {order.status}
                                                                    </span>
                                                                    <span style={{ fontWeight: 600 }}>${order.totalAmount}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div style={{ fontSize: "0.9rem", color: "#a0aec0", fontStyle: "italic" }}>No previous orders</div>
                                                )}
                                            </div>

                                            {/* Deliveries */}
                                            <div>
                                                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#a0aec0", textTransform: "uppercase", marginBottom: "0.5rem" }}>Deliveries</div>
                                                {customerContext.deliveries && customerContext.deliveries.length > 0 ? (
                                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                                        {customerContext.deliveries.map((delivery) => (
                                                            <div key={delivery.deliveryId} style={{ padding: "0.5rem", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "0.85rem", background: "#f8f9fa" }}>
                                                                <div style={{ marginBottom: "0.2rem" }}>
                                                                    <span style={{ fontWeight: 600 }}>Order: #{delivery.orderId.substring(0, 6)}</span>
                                                                </div>
                                                                <div style={{ color: "#4a5568", fontSize: "0.8rem", marginBottom: "0.2rem" }}>
                                                                    {delivery.deliveryAddress}
                                                                </div>
                                                                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                                                    <span style={{
                                                                        padding: "0.1rem 0.3rem",
                                                                        borderRadius: "3px",
                                                                        fontSize: "0.7rem",
                                                                        background: delivery.completed ? "#c6f6d5" : "#fffaf0",
                                                                        color: delivery.completed ? "#2f855a" : "#c05621",
                                                                        fontWeight: 600
                                                                    }}>
                                                                        {delivery.completed ? "DELIVERED" : "IN PROGRESS"}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div style={{ fontSize: "0.9rem", color: "#a0aec0", fontStyle: "italic" }}>No active deliveries</div>
                                                )}
                                            </div>

                                            {/* Wishlist */}
                                            <div>
                                                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#a0aec0", textTransform: "uppercase", marginBottom: "0.5rem" }}>Wishlist</div>
                                                {customerContext.wishListProductIds && customerContext.wishListProductIds.length > 0 ? (
                                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                                                        {customerContext.wishListProductIds.map((pid, idx) => (
                                                            <div key={idx} style={{ padding: "0.4rem", background: "#ebf4ff", borderRadius: "4px", fontSize: "0.8rem", color: "#4299e1" }}>
                                                                Product ID: {pid}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div style={{ fontSize: "0.9rem", color: "#a0aec0", fontStyle: "italic" }}>Wishlist is empty</div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ color: "#718096", fontSize: "0.9rem" }}>
                                            {selectedConversation.customerUserId ? "Loading context..." : "No context available for Guest users."}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", color: "#a0aec0" }}>
                            <div style={{ fontSize: "3rem", marginBottom: "1rem", opacity: 0.5 }}>💬</div>
                            <div>Select a conversation from the queue to start chatting.</div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}

