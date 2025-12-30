import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import supportApi from "../api/supportApi";
import { useToast } from "../contexts/ToastContext";
import { useUserRole } from "../hooks/useUserRole";
import {
    connectWebSocket,
    disconnectWebSocket,
    subscribeToConversation,
    subscribeToQueue,
    sendAgentMessageViaWebSocket,
} from "../utils/websocketClient";

export default function SupportAgentChatPage() {
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
    const wsClientRef = useRef(null);
    const messageSubscriptionRef = useRef(null);
    const queueSubscriptionRef = useRef(null);

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
                await loadQueue();
            } catch (error) {
                console.error("Error loading data:", error);
                showError("Failed to load data. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        loadData();

        // Connect WebSocket for real-time updates
        const client = connectWebSocket(
            null,
            (error) => {
                console.error("WebSocket error:", error);
                showError("Connection error. Please refresh the page.");
            },
            token
        );

        wsClientRef.current = client;

        // Subscribe to queue updates
        const checkConnection = setInterval(() => {
            if (client && client.connected) {
                clearInterval(checkConnection);
                
                // Subscribe to queue updates
                const queueSub = subscribeToQueue(client, (conversation) => {
                    // Update conversation in the list
                    setConversations((prev) => {
                        const index = prev.findIndex((c) => c.conversationId === conversation.conversationId);
                        if (index >= 0) {
                            // Update existing conversation
                            const updated = [...prev];
                            updated[index] = conversation;
                            return updated;
                        } else {
                            // Add new conversation
                            return [...prev, conversation];
                        }
                    });

                    // Update selected conversation if it's the one being updated
                    if (selectedConversation && selectedConversation.conversationId === conversation.conversationId) {
                        setSelectedConversation(conversation);
                    }
                });

                queueSubscriptionRef.current = queueSub;
            }
        }, 100);

        return () => {
            clearInterval(checkConnection);
            if (messageSubscriptionRef.current) {
                messageSubscriptionRef.current.unsubscribe();
                messageSubscriptionRef.current = null;
            }
            if (queueSubscriptionRef.current) {
                queueSubscriptionRef.current.unsubscribe();
                queueSubscriptionRef.current = null;
            }
            disconnectWebSocket();
        };
    }, [navigate, userRole, showError]);

    // Subscribe to conversation messages when a conversation is selected
    useEffect(() => {
        if (selectedConversation && wsClientRef.current) {
            // Load initial messages
            loadMessages(selectedConversation.conversationId);

            // Wait for WebSocket connection and subscribe
            const checkConnection = setInterval(() => {
                if (wsClientRef.current && wsClientRef.current.connected) {
                    clearInterval(checkConnection);

                    // Unsubscribe from previous conversation if any
                    if (messageSubscriptionRef.current) {
                        messageSubscriptionRef.current.unsubscribe();
                    }

                    // Subscribe to new conversation messages
                    const subscription = subscribeToConversation(
                        wsClientRef.current,
                        selectedConversation.conversationId,
                        (message) => {
                            // Add new message to the list
                            setMessages((prev) => {
                                // Check if message already exists
                                const exists = prev.some((m) => m.messageId === message.messageId);
                                if (exists) {
                                    return prev;
                                }
                                return [...prev, message];
                            });
                        }
                    );

                    messageSubscriptionRef.current = subscription;
                }
            }, 100);

            return () => {
                clearInterval(checkConnection);
                if (messageSubscriptionRef.current) {
                    messageSubscriptionRef.current.unsubscribe();
                    messageSubscriptionRef.current = null;
                }
            };
        }
    }, [selectedConversation]);

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
            const text = messageText.trim();
            setMessageText("");

            // Try WebSocket first, fallback to REST API
            if (wsClientRef.current && wsClientRef.current.connected) {
                const sent = sendAgentMessageViaWebSocket(
                    wsClientRef.current,
                    selectedConversation.conversationId,
                    text
                );
                if (sent) {
                    // Message will be received via WebSocket subscription
                    setSendingMessage(false);
                    return;
                }
            }

            // Fallback to REST API
            await supportApi.agentSendText(selectedConversation.conversationId, text);
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
            // File uploads trigger WebSocket messages, so we'll receive it via subscription
            // But reload messages to ensure we have the latest
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


    const storedRole = localStorage.getItem("user_role");
    const currentRole = userRole || storedRole;

    if (loading || (currentRole === null || currentRole === undefined)) {
        return (
            <div style={{ minHeight: "calc(100vh - 120px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ color: "#667eea", fontSize: "1.5rem" }}>Loading...</div>
            </div>
        );
    }

    if (currentRole !== "SUPPORT_AGENT") {
        return (
            <div style={{ minHeight: "calc(100vh - 120px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ background: "rgba(255, 255, 255, 0.95)", padding: "2rem", borderRadius: "8px", textAlign: "center", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)" }}>
                    <h2 style={{ color: "#2d3748" }}>Access Denied</h2>
                    <p style={{ color: "#718096" }}>This page is only accessible to Support Agents.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: "calc(100vh - 120px)", padding: "2rem", display: "flex", gap: "1rem" }}>
            {/* Conversation Queue */}
            <div
                    style={{
                        flex: "0 0 350px",
                        background: "#fff",
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
                        background: "#fff",
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
    );
}

