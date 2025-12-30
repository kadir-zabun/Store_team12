import { useState, useEffect, useRef } from "react";
import supportApi from "../api/supportApi";
import { useToast } from "../contexts/ToastContext";
import { useUserRole } from "../hooks/useUserRole";

export default function CustomerChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [conversationId, setConversationId] = useState(null);
    const [conversationStatus, setConversationStatus] = useState(null);
    const [guestToken, setGuestToken] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState("");
    const [sendingMessage, setSendingMessage] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [closingConversation, setClosingConversation] = useState(false);
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const { success: showSuccess, error: showError } = useToast();
    const userRole = useUserRole();
    const stompClientRef = useRef(null);

    useEffect(() => {
        // Get or create guest token
        let token = localStorage.getItem("guest_token");
        if (!token) {
            token = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem("guest_token", token);
        }
        setGuestToken(token);
    }, []);

    // WebSocket connection for real-time messages (no polling)
    useEffect(() => {
        if (isOpen && conversationId && conversationStatus !== "CLOSED") {
            // Load initial messages only once
            loadMessages();
            
            // Connect to WebSocket for real-time updates
            connectWebSocket();
            
            return () => {
                disconnectWebSocket();
            };
        } else {
            disconnectWebSocket();
        }
    }, [isOpen, conversationId, conversationStatus]);

    const connectWebSocket = () => {
        if (!conversationId || conversationStatus === "CLOSED" || stompClientRef.current) return;
        
        try {
            // Use SockJS and STOMP from CDN
            if (!window.SockJS || !window.Stomp) {
                console.warn("SockJS or STOMP not loaded from CDN");
                return;
            }

            const baseUrl = window.location.origin;
            const wsUrl = `${baseUrl}/ws`;
            
            // Try new @stomp/stompjs API first, then fallback to old STOMP.js API
            let client;
            if (window.Stomp && window.Stomp.Client) {
                // New @stomp/stompjs API
                client = new window.Stomp.Client({
                    webSocketFactory: () => new window.SockJS(wsUrl),
                    reconnectDelay: 5000,
                    heartbeatIncoming: 4000,
                    heartbeatOutgoing: 4000,
                });
                
                const token = localStorage.getItem("access_token");
                const connectHeaders = {};
                if (token) {
                    connectHeaders.Authorization = `Bearer ${token}`;
                }
                
                client.onConnect = () => {
                    // Subscribe to messages
                    client.subscribe(`/topic/support/${conversationId}`, (message) => {
                        try {
                            const messageData = typeof message.body === 'string' ? JSON.parse(message.body) : message.body;
                            // Validate message structure
                            if (!messageData || !messageData.messageId) {
                                console.warn("Invalid message format received:", messageData);
                                return;
                            }
                            // Add new message if it doesn't exist (real-time update)
                            setMessages((prevMessages) => {
                                const exists = prevMessages.some(msg => msg.messageId === messageData.messageId);
                                if (exists) return prevMessages;
                                const updated = [...prevMessages, messageData];
                                return updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                            });
                        } catch (error) {
                            console.error("Error parsing WebSocket message:", error);
                            console.error("Message body:", message.body);
                        }
                    });
                    
                    // Subscribe to conversation status changes
                    client.subscribe(`/topic/support/${conversationId}/status`, (message) => {
                        try {
                            const statusData = JSON.parse(message.body);
                            // Update conversation status in real-time
                            if (statusData.status) {
                                setConversationStatus(statusData.status);
                            }
                        } catch (error) {
                            console.error("Error parsing WebSocket status update:", error);
                        }
                    });
                };
                
                client.onStompError = (frame) => {
                    console.error("STOMP error:", frame);
                };
                
                client.activate();
            } else if (window.Stomp && window.Stomp.client) {
                // Old STOMP.js API
                client = window.Stomp.client(wsUrl);
                const token = localStorage.getItem("access_token");
                const headers = {};
                if (token) {
                    headers.Authorization = `Bearer ${token}`;
                }
                
                client.connect(headers, () => {
                    // Subscribe to messages
                    client.subscribe(`/topic/support/${conversationId}`, (message) => {
                        try {
                            const messageData = typeof message.body === 'string' ? JSON.parse(message.body) : message.body;
                            // Validate message structure
                            if (!messageData || !messageData.messageId) {
                                console.warn("Invalid message format received:", messageData);
                                return;
                            }
                            setMessages((prevMessages) => {
                                const exists = prevMessages.some(msg => msg.messageId === messageData.messageId);
                                if (exists) return prevMessages;
                                const updated = [...prevMessages, messageData];
                                return updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                            });
                        } catch (error) {
                            console.error("Error parsing WebSocket message:", error);
                            console.error("Message body:", message.body);
                        }
                    });
                    
                    // Subscribe to conversation status changes
                    client.subscribe(`/topic/support/${conversationId}/status`, (message) => {
                        try {
                            const statusData = typeof message.body === 'string' ? JSON.parse(message.body) : message.body;
                            // Update conversation status in real-time
                            if (statusData.status) {
                                setConversationStatus(statusData.status);
                            }
                        } catch (error) {
                            console.error("Error parsing WebSocket status update:", error);
                        }
                    });
                });
            } else {
                console.warn("STOMP client not available");
                return;
            }
            
            stompClientRef.current = client;
        } catch (error) {
            console.error("Error connecting to WebSocket:", error);
        }
    };

    const disconnectWebSocket = () => {
        if (stompClientRef.current) {
            try {
                if (stompClientRef.current.deactivate) {
                    stompClientRef.current.deactivate();
                } else if (stompClientRef.current.disconnect) {
                    stompClientRef.current.disconnect();
                }
            } catch (error) {
                console.error("Error disconnecting WebSocket:", error);
            }
            stompClientRef.current = null;
        }
    };

    useEffect(() => {
        // Only scroll when new messages are added, not on every render
        if (messagesEndRef.current && messages.length > 0) {
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
        }
    }, [messages.length]);

    const handleOpenChat = async () => {
        setIsOpen(true);
        if (!conversationId || conversationStatus === "CLOSED") {
            try {
                const token = localStorage.getItem("access_token");
                const response = await supportApi.startConversation(token ? null : guestToken);
                const convData = response.data?.data || response.data;
                setConversationId(convData.conversationId);
                setConversationStatus(convData.status || "OPEN");
                if (convData.guestToken) {
                    setGuestToken(convData.guestToken);
                    localStorage.setItem("guest_token", convData.guestToken);
                }
                // Load messages immediately after starting conversation
                await loadMessages();
            } catch (error) {
                console.error("Error starting conversation:", error);
                console.error("Error response:", error.response);
                let errorMessage = "Failed to start conversation. Please try again.";
                if (error.response?.data) {
                    if (typeof error.response.data === "string") {
                        errorMessage = error.response.data;
                    } else if (error.response.data.message) {
                        errorMessage = String(error.response.data.message);
                    } else if (error.response.data.error) {
                        errorMessage = String(error.response.data.error);
                    } else {
                        errorMessage = JSON.stringify(error.response.data);
                    }
                } else if (error.message) {
                    errorMessage = String(error.message);
                }
                showError(errorMessage);
            }
        } else {
            // Load messages for existing conversation
            await loadMessages();
        }
    };

    const handleCloseConversation = async () => {
        if (!conversationId) return;
        setClosingConversation(true);
        try {
            const token = localStorage.getItem("access_token");
            const response = await supportApi.customerCloseConversation(conversationId, token ? null : guestToken);
            const convData = response.data?.data || response.data;
            setConversationStatus(convData.status || "CLOSED");
            showSuccess("Conversation closed successfully!");
        } catch (error) {
            console.error("Error closing conversation:", error);
            let errorMessage = "Failed to close conversation.";
            if (error.response?.data) {
                if (typeof error.response.data === "string") {
                    errorMessage = error.response.data;
                } else if (error.response.data.message) {
                    errorMessage = String(error.response.data.message);
                } else if (error.response.data.error) {
                    errorMessage = String(error.response.data.error);
                } else {
                    errorMessage = JSON.stringify(error.response.data);
                }
            } else if (error.message) {
                errorMessage = String(error.message);
            }
            showError(errorMessage);
        } finally {
            setClosingConversation(false);
        }
    };

    const handleStartNewConversation = async () => {
        setConversationId(null);
        setConversationStatus(null);
        setMessages([]);
        await handleOpenChat();
    };

    const loadMessages = async () => {
        if (!conversationId) return;
        setLoadingMessages(true);
        try {
            const token = localStorage.getItem("access_token");
            const response = await supportApi.getMessages(conversationId, token ? null : guestToken);
            const messagesData = response.data?.data || response.data || [];
            // Only set messages if we don't have any yet (initial load)
            // Otherwise, WebSocket will handle new messages
            setMessages((prevMessages) => {
                if (prevMessages.length === 0) {
                    return Array.isArray(messagesData) ? messagesData : [];
                }
                // Merge: keep existing messages, add new ones that don't exist
                const existingIds = new Set(prevMessages.map(msg => msg.messageId));
                const newMessages = (Array.isArray(messagesData) ? messagesData : []).filter(
                    msg => !existingIds.has(msg.messageId)
                );
                if (newMessages.length === 0) {
                    return prevMessages; // No new messages, keep existing
                }
                const merged = [...prevMessages, ...newMessages];
                return merged.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            });
        } catch (error) {
            console.error("Error loading messages:", error);
            // If error says conversation is closed, update status
            if (error.response?.data?.message?.includes("closed") || 
                error.response?.data?.error?.includes("closed")) {
                setConversationStatus("CLOSED");
            }
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!messageText.trim() || !conversationId || conversationStatus === "CLOSED") return;

        setSendingMessage(true);
        const messageToSend = messageText.trim();
        setMessageText(""); // Clear input immediately
        
        try {
            const token = localStorage.getItem("access_token");
            const response = await supportApi.sendText(conversationId, messageToSend, token ? null : guestToken);
            
            // Add the sent message immediately (optimistic update)
            const sentMessage = response.data?.data || response.data;
            if (sentMessage) {
                setMessages((prevMessages) => {
                    const exists = prevMessages.some(msg => msg.messageId === sentMessage.messageId);
                    if (exists) {
                        return prevMessages;
                    }
                    const updated = [...prevMessages, sentMessage];
                    return updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                });
            }
            // Don't reload messages - WebSocket will handle new messages from others
        } catch (error) {
            console.error("Error sending message:", error);
            console.error("Error response:", error.response);
            let errorMessage = "Failed to send message. Please try again.";
            if (error.response?.data) {
                if (typeof error.response.data === "string") {
                    errorMessage = error.response.data;
                    if (error.response.data.includes("closed")) {
                        setConversationStatus("CLOSED");
                    }
                } else if (error.response.data.message) {
                    errorMessage = String(error.response.data.message);
                    if (error.response.data.message.includes("closed")) {
                        setConversationStatus("CLOSED");
                    }
                } else if (error.response.data.error) {
                    errorMessage = String(error.response.data.error);
                    if (error.response.data.error.includes("closed")) {
                        setConversationStatus("CLOSED");
                    }
                } else {
                    errorMessage = JSON.stringify(error.response.data);
                }
            } else if (error.message) {
                errorMessage = String(error.message);
            }
            showError(errorMessage);
        } finally {
            setSendingMessage(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !conversationId) return;

        setUploadingFile(true);
        try {
            const token = localStorage.getItem("access_token");
            const response = await supportApi.uploadAttachment(conversationId, file, token ? null : guestToken);
            
            // Add the uploaded message immediately (optimistic update)
            const uploadedMessage = response.data?.data || response.data;
            if (uploadedMessage) {
                setMessages((prevMessages) => {
                    const exists = prevMessages.some(msg => msg.messageId === uploadedMessage.messageId);
                    if (exists) {
                        return prevMessages;
                    }
                    const updated = [...prevMessages, uploadedMessage];
                    return updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                });
            }
            
            showSuccess("File uploaded successfully!");
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
            // Don't reload messages - WebSocket will handle new messages
        } catch (error) {
            console.error("Error uploading file:", error);
            showError("Failed to upload file. Please try again.");
        } finally {
            setUploadingFile(false);
        }
    };

    const handleDownloadAttachment = async (attachmentId) => {
        try {
            const token = localStorage.getItem("access_token");
            const response = await supportApi.getAttachment(attachmentId, token ? null : guestToken);
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
            showError("Failed to download attachment.");
        }
    };

    // Hide widget for support agents, sales managers, and product managers
    // Show only for customers and guests
    if (userRole === "SUPPORT_AGENT" || userRole === "SALES_MANAGER" || userRole === "PRODUCT_MANAGER") {
        return null;
    }

    return (
        <>
            {/* Chat Button */}
            {!isOpen && (
                <button
                    onClick={handleOpenChat}
                    style={{
                        position: "fixed",
                        bottom: "2rem",
                        right: "2rem",
                        width: "60px",
                        height: "60px",
                        borderRadius: "50%",
                        background: "#667eea",
                        color: "#fff",
                        border: "none",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                        cursor: "pointer",
                        fontSize: "1.5rem",
                        zIndex: 1000,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#764ba2";
                        e.currentTarget.style.transform = "scale(1.1)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#667eea";
                        e.currentTarget.style.transform = "scale(1)";
                    }}
                >
                    💬
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div
                    style={{
                        position: "fixed",
                        bottom: "2rem",
                        right: "2rem",
                        width: "400px",
                        height: "600px",
                        background: "#fff",
                        borderRadius: "8px",
                        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
                        zIndex: 1000,
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    {/* Header */}
                    <div
                        style={{
                            padding: "1rem",
                            background: "#667eea",
                            color: "#fff",
                            borderRadius: "8px 8px 0 0",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <div>
                            <div style={{ fontWeight: 600, fontSize: "1rem" }}>Support Chat</div>
                            {conversationStatus === "CLOSED" && (
                                <div style={{ fontSize: "0.75rem", opacity: 0.9, marginTop: "0.25rem" }}>
                                    Conversation Closed
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            style={{
                                background: "transparent",
                                border: "none",
                                color: "#fff",
                                fontSize: "1.25rem",
                                cursor: "pointer",
                                padding: "0.25rem 0.5rem",
                            }}
                        >
                            ×
                        </button>
                    </div>

                    {/* Messages */}
                    <div
                        style={{
                            flex: 1,
                            overflowY: "auto",
                            padding: "1rem",
                            background: "#f7fafc",
                        }}
                    >
                        {conversationStatus === "CLOSED" && (
                            <div style={{ 
                                textAlign: "center", 
                                padding: "1rem", 
                                marginBottom: "1rem",
                                background: "#fee",
                                color: "#c53030",
                                borderRadius: "4px",
                                fontSize: "0.85rem",
                                fontWeight: 500
                            }}>
                                This conversation has been closed.
                            </div>
                        )}
                        {loadingMessages && messages.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "2rem", color: "#718096" }}>Loading messages...</div>
                        ) : messages.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "2rem", color: "#718096" }}>
                                Start a conversation with our support team!
                            </div>
                        ) : (
                            messages.map((msg) => (
                                <div
                                    key={msg.messageId}
                                    style={{
                                        marginBottom: "1rem",
                                        display: "flex",
                                        justifyContent: msg.senderType === "CUSTOMER" || msg.senderType === "GUEST" ? "flex-end" : "flex-start",
                                    }}
                                >
                                    <div
                                        style={{
                                            maxWidth: "75%",
                                            padding: "0.75rem 1rem",
                                            background: msg.senderType === "CUSTOMER" || msg.senderType === "GUEST" ? "#667eea" : "#fff",
                                            color: msg.senderType === "CUSTOMER" || msg.senderType === "GUEST" ? "#fff" : "#2d3748",
                                            borderRadius: "8px",
                                            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                                        }}
                                    >
                                        <div style={{ fontSize: "0.75rem", opacity: 0.8, marginBottom: "0.25rem", fontWeight: 500 }}>
                                            {msg.senderType === "CUSTOMER" || msg.senderType === "GUEST" ? "You" : "Support Agent"}
                                        </div>
                                        {msg.type === "TEXT" ? (
                                            <div style={{ fontSize: "0.9rem", wordBreak: "break-word" }}>{msg.text}</div>
                                        ) : (
                                            <div>
                                                <div style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>Attachment</div>
                                                <button
                                                    onClick={() => handleDownloadAttachment(msg.attachmentId)}
                                                    style={{
                                                        padding: "0.5rem 1rem",
                                                        background: msg.senderType === "CUSTOMER" || msg.senderType === "GUEST" ? "#764ba2" : "#667eea",
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
                                        <div style={{ fontSize: "0.7rem", opacity: 0.7, marginTop: "0.5rem" }}>
                                            {new Date(msg.createdAt).toLocaleTimeString()}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    {conversationStatus === "CLOSED" ? (
                        <div style={{ padding: "1rem", borderTop: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            <button
                                onClick={handleStartNewConversation}
                                style={{
                                    padding: "0.75rem 1rem",
                                    background: "#667eea",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "4px",
                                    fontSize: "0.85rem",
                                    cursor: "pointer",
                                    fontWeight: 600,
                                }}
                            >
                                Start New Conversation
                            </button>
                            <button
                                onClick={handleCloseConversation}
                                disabled={closingConversation}
                                style={{
                                    padding: "0.5rem 1rem",
                                    background: closingConversation ? "#e2e8f0" : "#e53e3e",
                                    color: closingConversation ? "#718096" : "#fff",
                                    border: "none",
                                    borderRadius: "4px",
                                    fontSize: "0.75rem",
                                    cursor: closingConversation ? "not-allowed" : "pointer",
                                }}
                            >
                                {closingConversation ? "Closing..." : "Close Conversation"}
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSendMessage} style={{ padding: "1rem", borderTop: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    onChange={handleFileUpload}
                                    disabled={uploadingFile || conversationStatus === "CLOSED"}
                                    style={{ display: "none" }}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingFile || conversationStatus === "CLOSED"}
                                    style={{
                                        padding: "0.5rem",
                                        background: "#e2e8f0",
                                        color: "#4a5568",
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor: uploadingFile || conversationStatus === "CLOSED" ? "not-allowed" : "pointer",
                                        fontSize: "1rem",
                                    }}
                                >
                                    📎
                                </button>
                                <input
                                    type="text"
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    placeholder="Type a message..."
                                    disabled={sendingMessage || conversationStatus === "CLOSED"}
                                    style={{
                                        flex: 1,
                                        padding: "0.5rem",
                                        border: "1px solid #cbd5e0",
                                        borderRadius: "4px",
                                        fontSize: "0.85rem",
                                    }}
                                />
                                <button
                                    type="submit"
                                    disabled={sendingMessage || !messageText.trim() || conversationStatus === "CLOSED"}
                                    style={{
                                        padding: "0.5rem 1rem",
                                        background: sendingMessage || !messageText.trim() || conversationStatus === "CLOSED" ? "#e2e8f0" : "#667eea",
                                        color: sendingMessage || !messageText.trim() || conversationStatus === "CLOSED" ? "#718096" : "#fff",
                                        border: "none",
                                        borderRadius: "4px",
                                        fontSize: "0.85rem",
                                        cursor: sendingMessage || !messageText.trim() || conversationStatus === "CLOSED" ? "not-allowed" : "pointer",
                                    }}
                                >
                                    {sendingMessage ? "..." : "Send"}
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={handleCloseConversation}
                                disabled={closingConversation || conversationStatus === "CLOSED"}
                                style={{
                                    padding: "0.5rem 1rem",
                                    background: closingConversation || conversationStatus === "CLOSED" ? "#e2e8f0" : "#e53e3e",
                                    color: closingConversation || conversationStatus === "CLOSED" ? "#718096" : "#fff",
                                    border: "none",
                                    borderRadius: "4px",
                                    fontSize: "0.75rem",
                                    cursor: closingConversation || conversationStatus === "CLOSED" ? "not-allowed" : "pointer",
                                    alignSelf: "flex-end",
                                }}
                            >
                                {closingConversation ? "Closing..." : "Close Conversation"}
                            </button>
                        </form>
                    )}
                </div>
            )}
        </>
    );
}
