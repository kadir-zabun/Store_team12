import { useState, useEffect, useRef } from "react";
import supportApi from "../api/supportApi";
import { useToast } from "../contexts/ToastContext";
import { useUserRole } from "../hooks/useUserRole";
import {
    connectWebSocket,
    disconnectWebSocket,
    subscribeToConversation,
    subscribeToQueue,
    sendMessageViaWebSocket,
} from "../utils/websocketClient";

export default function CustomerChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [conversationId, setConversationId] = useState(null);
    const [guestToken, setGuestToken] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageText, setMessageText] = useState("");
    const [sendingMessage, setSendingMessage] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const { success: showSuccess, error: showError } = useToast();
    const userRole = useUserRole();
    const wsClientRef = useRef(null);
    const subscriptionRef = useRef(null);
    const queueSubscriptionRef = useRef(null);
    const messagesLoadedRef = useRef(false);
    const [conversationStatus, setConversationStatus] = useState(null);

    useEffect(() => {
        // Get or create guest token
        let token = localStorage.getItem("guest_token");
        if (!token) {
            token = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem("guest_token", token);
        }
        setGuestToken(token);
    }, []);

    // WebSocket connection and subscription
    useEffect(() => {
        if (isOpen && conversationId) {
            // Reset messages loaded flag when conversation changes
            if (messagesLoadedRef.current === false || messagesLoadedRef.current !== conversationId) {
                messagesLoadedRef.current = conversationId;
                // Load initial messages only once
                loadMessages();
            }

            // Connect WebSocket
            const token = localStorage.getItem("access_token");
            const client = connectWebSocket(
                null,
                (error) => {
                    console.error("WebSocket error:", error);
                    showError("Connection error. Please refresh the page.");
                },
                token
            );

            wsClientRef.current = client;

            // Wait for connection and subscribe
            const checkConnection = setInterval(() => {
                if (client && client.connected) {
                    clearInterval(checkConnection);
                    
                    // Subscribe to conversation messages
                    const subscription = subscribeToConversation(
                        client,
                        conversationId,
                        (message) => {
                            console.log("[CustomerChatWidget] Received message via WebSocket:", message);
                            // Add new message to the list, sorted by createdAt
                            setMessages((prev) => {
                                // Check if message already exists
                                const exists = prev.some((m) => m.messageId === message.messageId);
                                if (exists) {
                                    console.log("[CustomerChatWidget] Message already exists, skipping:", message.messageId);
                                    return prev;
                                }
                                // Remove optimistic message if exists (same text and temp ID)
                                const filtered = prev.filter((m) => !m.messageId.startsWith("temp_"));
                                // Add new message and sort by createdAt
                                const updated = [...filtered, message];
                                const sorted = updated.sort((a, b) => {
                                    const dateA = new Date(a.createdAt);
                                    const dateB = new Date(b.createdAt);
                                    return dateA - dateB;
                                });
                                console.log("[CustomerChatWidget] Updated messages list, total:", sorted.length);
                                return sorted;
                            });
                        }
                    );

                    subscriptionRef.current = subscription;

                    // Subscribe to queue updates to detect conversation status changes
                    const queueSub = subscribeToQueue(client, (conversation) => {
                        console.log("[CustomerChatWidget] Received queue update:", conversation);
                        // If this is our conversation, update status
                        if (conversation.conversationId === conversationId) {
                            console.log("[CustomerChatWidget] Updating conversation status:", conversation.status);
                            setConversationStatus(conversation.status);
                            // If conversation is closed, close the chat widget
                            if (conversation.status === "CLOSED") {
                                console.log("[CustomerChatWidget] Conversation closed, closing widget");
                                setIsOpen(false);
                                showError("This conversation has been closed by support.");
                            }
                        }
                    });
                    queueSubscriptionRef.current = queueSub;
                }
            }, 100);

            // Cleanup
            return () => {
                clearInterval(checkConnection);
                if (subscriptionRef.current) {
                    subscriptionRef.current.unsubscribe();
                    subscriptionRef.current = null;
                }
                if (queueSubscriptionRef.current) {
                    queueSubscriptionRef.current.unsubscribe();
                    queueSubscriptionRef.current = null;
                }
            };
        } else {
            // Disconnect when chat is closed
            if (subscriptionRef.current) {
                subscriptionRef.current.unsubscribe();
                subscriptionRef.current = null;
            }
            if (queueSubscriptionRef.current) {
                queueSubscriptionRef.current.unsubscribe();
                queueSubscriptionRef.current = null;
            }
        }

        return () => {
            // Cleanup on unmount
            if (subscriptionRef.current) {
                subscriptionRef.current.unsubscribe();
                subscriptionRef.current = null;
            }
            if (queueSubscriptionRef.current) {
                queueSubscriptionRef.current.unsubscribe();
                queueSubscriptionRef.current = null;
            }
        };
    }, [isOpen, conversationId]);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const handleOpenChat = async () => {
        setIsOpen(true);
        // Always create a new conversation when opening chat
        try {
            const token = localStorage.getItem("access_token");
            const response = await supportApi.startConversation(token ? null : guestToken);
            const convData = response.data?.data || response.data;
            setConversationId(convData.conversationId);
            setMessages([]); // Clear previous messages
            if (convData.guestToken) {
                setGuestToken(convData.guestToken);
                localStorage.setItem("guest_token", convData.guestToken);
            }
        } catch (error) {
            console.error("Error starting conversation:", error);
            showError("Failed to start conversation. Please try again.");
        }
    };

    const loadMessages = async () => {
        if (!conversationId) return;
        setLoadingMessages(true);
        try {
            const token = localStorage.getItem("access_token");
            const response = await supportApi.getMessages(conversationId, token ? null : guestToken);
            const messagesData = response.data?.data || response.data || [];
            // Sort messages by createdAt to ensure correct order
            const sortedMessages = Array.isArray(messagesData) 
                ? messagesData.sort((a, b) => {
                    const dateA = new Date(a.createdAt);
                    const dateB = new Date(b.createdAt);
                    return dateA - dateB;
                })
                : [];
            setMessages(sortedMessages);
        } catch (error) {
            console.error("Error loading messages:", error);
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!messageText.trim() || !conversationId) return;

        console.log("[CustomerChatWidget] Sending message:", messageText.trim());
        const token = localStorage.getItem("access_token");
        const text = messageText.trim();
        const tempMessageId = `temp_${Date.now()}`;
        
        // Get current user name for optimistic update
        let currentUserName = null;
        if (token) {
            try {
                const payloadBase64 = token.split(".")[1];
                const normalized = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
                const payloadJson = atob(normalized);
                const payload = JSON.parse(payloadJson);
                currentUserName = payload.name || payload.sub || payload.username;
            } catch (e) {
                console.error("[CustomerChatWidget] Error parsing token:", e);
            }
        }
        
        // Optimistic update - add message immediately
        const optimisticMessage = {
            messageId: tempMessageId,
            conversationId: conversationId,
            senderType: token ? "CUSTOMER" : "GUEST",
            senderId: token ? "temp" : guestToken,
            senderName: currentUserName,
            type: "TEXT",
            text: text,
            attachmentId: null,
            createdAt: new Date().toISOString(),
        };
        
        console.log("[CustomerChatWidget] Adding optimistic message:", optimisticMessage);
        setMessages((prev) => {
            const updated = [...prev, optimisticMessage];
            return updated.sort((a, b) => {
                const dateA = new Date(a.createdAt);
                const dateB = new Date(b.createdAt);
                return dateA - dateB;
            });
        });
        setMessageText("");
        setSendingMessage(true);

        try {
            // Try WebSocket first, fallback to REST API
            if (wsClientRef.current && wsClientRef.current.connected) {
                console.log("[CustomerChatWidget] Sending via WebSocket");
                const sent = sendMessageViaWebSocket(
                    wsClientRef.current,
                    conversationId,
                    text,
                    token ? null : guestToken
                );
                if (sent) {
                    console.log("[CustomerChatWidget] Message sent via WebSocket");
                    // Message will be received via WebSocket subscription and replace optimistic one
                    setSendingMessage(false);
                    return;
                }
            }

            // Fallback to REST API
            console.log("[CustomerChatWidget] Sending via REST API");
            await supportApi.sendText(conversationId, text, token ? null : guestToken);
            console.log("[CustomerChatWidget] Message sent via REST API");
            // Don't reload messages - wait for WebSocket message
        } catch (error) {
            console.error("[CustomerChatWidget] Error sending message:", error);
            // Remove optimistic message on error
            setMessages((prev) => prev.filter((m) => m.messageId !== tempMessageId));
            showError("Failed to send message. Please try again.");
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
            await supportApi.uploadAttachment(conversationId, file, token ? null : guestToken);
            // File uploads trigger WebSocket messages, so we'll receive it via subscription
            showSuccess("File uploaded successfully!");
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
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

    // Hide widget for non-customer roles
    if (userRole && userRole !== "CUSTOMER" && userRole !== null && userRole !== undefined) {
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
                        <div style={{ fontWeight: 600, fontSize: "1rem" }}>Support Chat</div>
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
                        {loadingMessages ? (
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
                                        {msg.senderType === "SUPPORT_AGENT" && (
                                            <div style={{ fontSize: "0.75rem", opacity: 0.8, marginBottom: "0.25rem", fontWeight: 600 }}>
                                                {msg.senderName || "Support Agent"}
                                            </div>
                                        )}
                                        {msg.type === "TEXT" ? (
                                            <div style={{ fontSize: "0.9rem" }}>{msg.text}</div>
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
                                        <div style={{ fontSize: "0.75rem", opacity: 0.7, marginTop: "0.25rem" }}>
                                            {new Date(msg.createdAt).toLocaleTimeString()}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSendMessage} style={{ padding: "1rem", borderTop: "1px solid #e2e8f0", display: "flex", gap: "0.5rem" }}>
                        <input
                            ref={fileInputRef}
                            type="file"
                            onChange={handleFileUpload}
                            disabled={uploadingFile}
                            style={{ display: "none" }}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingFile}
                            style={{
                                padding: "0.5rem",
                                background: "#e2e8f0",
                                color: "#4a5568",
                                border: "none",
                                borderRadius: "4px",
                                cursor: uploadingFile ? "not-allowed" : "pointer",
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
                            disabled={sendingMessage}
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
                            disabled={sendingMessage || !messageText.trim()}
                            style={{
                                padding: "0.5rem 1rem",
                                background: sendingMessage || !messageText.trim() ? "#e2e8f0" : "#667eea",
                                color: sendingMessage || !messageText.trim() ? "#718096" : "#fff",
                                border: "none",
                                borderRadius: "4px",
                                fontSize: "0.85rem",
                                cursor: sendingMessage || !messageText.trim() ? "not-allowed" : "pointer",
                            }}
                        >
                            {sendingMessage ? "..." : "Send"}
                        </button>
                    </form>
                </div>
            )}
        </>
    );
}

