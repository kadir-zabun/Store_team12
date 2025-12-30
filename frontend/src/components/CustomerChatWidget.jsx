import { useState, useEffect, useRef } from "react";
import supportApi from "../api/supportApi";
import { useToast } from "../contexts/ToastContext";
import { useUserRole } from "../hooks/useUserRole";
import socketService from "../utils/socketService";

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

    useEffect(() => {
        // Get or create guest token
        let token = localStorage.getItem("guest_token");
        if (!token) {
            token = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem("guest_token", token);
        }
        setGuestToken(token);
    }, []);

    // Reset conversation when user identity changes (login/logout)
    useEffect(() => {
        setConversationId(null);
        setMessages([]);
        if (isOpen) {
            // If chat was open, try to fetch the new conversation for the new user status
            // However, state update is async, so better let the user trigger or use a timeout?
            // Or rely on the fact that conversationId becoming null will stop the socket, 
            // and we might need to trigger startOrJoinConversation again if we want auto-reconnect.
            // For now, let's just close it or keep it open and let handleOpenChat logic (if we were to re-call it) handle it.
            // Safest is to just clear it. If the user clicks chat, it will fetch.
            // Actually, if it's open, we should probably auto-refresh.
            const timer = setTimeout(() => {
                // startOrJoinConversation(); // We can't call this directly if it's defined below. 
                // Let's rely on the separate function or just clear state.
            }, 100);
        }
    }, [userRole]);

    // Connect WebSocket when chat opens and conversationId exists
    useEffect(() => {
        if (!isOpen || !conversationId) return;

        const token = localStorage.getItem("access_token");

        // Connect to WebSocket
        socketService.connect(
            token,
            () => {
                // Subscribe to conversation topic
                socketService.subscribe(`/topic/support/${conversationId}`, (message) => {
                    if (message.type === "STATUS_UPDATE" && message.text === "CONVERSATION_CLOSED") {
                        showError("Agent closed the conversation. Starting a new session...");
                        setConversationId(null);
                        setMessages([]);
                        // Auto-restart
                        setTimeout(() => startOrJoinConversation(), 1000);
                        return;
                    }

                    setMessages((prev) => {
                        // Avoid duplicates
                        if (prev.some(m => m.messageId === message.messageId)) return prev;
                        return [...prev, message];
                    });
                });
            },
            (error) => console.error("Socket error", error)
        );

        // Load initial history
        loadMessages();

        return () => {
            // Optional: disconnect or just unsubscribe. 
            // For a global widget, we might want to keep the connection alive, 
            // but for now let's not force disconnect to allow other components to use it if needed.
            // But since this is specific to this conversation, we should probably just leave it open 
            // or manage it globally. 
            // In this simple implementation, we can leave it connected.
        };
    }, [isOpen, conversationId]);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const startOrJoinConversation = async () => {
        try {
            const token = localStorage.getItem("access_token");
            const response = await supportApi.startConversation(token ? null : guestToken);
            const convData = response.data?.data || response.data;
            setConversationId(convData.conversationId);
            if (convData.guestToken) {
                setGuestToken(convData.guestToken);
                localStorage.setItem("guest_token", convData.guestToken);
            }
        } catch (error) {
            console.error("Error starting conversation:", error);
            showError("Failed to start conversation. Please try again.");
        }
    };

    const handleOpenChat = async () => {
        setIsOpen(true);
        if (!conversationId) {
            await startOrJoinConversation();
        }
    };

    const loadMessages = async () => {
        if (!conversationId) return;
        setLoadingMessages(true);
        try {
            const token = localStorage.getItem("access_token");
            const response = await supportApi.getMessages(conversationId, token ? null : guestToken);
            const messagesData = response.data?.data || response.data || [];
            setMessages(Array.isArray(messagesData) ? messagesData : []);
        } catch (error) {
            console.error("Error loading messages:", error);
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!messageText.trim() || !conversationId) return;

        setSendingMessage(true);
        try {
            const token = localStorage.getItem("access_token");
            await supportApi.sendText(conversationId, messageText.trim(), token ? null : guestToken);
            setMessageText("");
        } catch (error) {
            console.error("Error sending message:", error);
            if (error.response && error.response.status === 400) {
                // Conversation likely closed
                // Conversation likely closed
                setConversationId(null);
                setMessages([]);
                showError("Previous conversation closed. Starting a new one...");
                await startOrJoinConversation();
            } else {
                showError("Failed to send message. Please try again.");
            }
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
            showSuccess("File uploaded!");
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        } catch (error) {
            console.error("Error uploading file:", error);
            if (error.response && error.response.status === 400) {
                setConversationId(null);
                setMessages([]);
                showError("Previous conversation closed. Starting a new one...");
                await startOrJoinConversation();
            } else {
                showError("Failed to upload file. Please try again.");
            }
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

    // Hide widget for non-customer roles (Support Agents shouldn't see this widget typically)
    if (userRole && userRole !== "CUSTOMER" && userRole !== null && userRole !== undefined) {
        return null;
    }

    return (
        <>
            {/* Chat Trigger Button */}
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
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        color: "#fff",
                        border: "none",
                        boxShadow: "0 8px 20px rgba(102, 126, 234, 0.4)",
                        cursor: "pointer",
                        fontSize: "1.75rem",
                        zIndex: 9999,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "scale(1.1) translateY(-5px)";
                        e.currentTarget.style.boxShadow = "0 12px 24px rgba(102, 126, 234, 0.5)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "scale(1)";
                        e.currentTarget.style.boxShadow = "0 8px 20px rgba(102, 126, 234, 0.4)";
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
                        width: "380px",
                        height: "600px",
                        background: "#fff",
                        borderRadius: "16px",
                        boxShadow: "0 12px 32px rgba(0, 0, 0, 0.15)",
                        zIndex: 9999,
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                        animation: "fadeInUp 0.3s ease-out",
                        border: "1px solid rgba(0,0,0,0.05)",
                    }}
                >
                    {/* Header */}
                    <div
                        style={{
                            padding: "1.25rem",
                            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            color: "#fff",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <div style={{ padding: "0.5rem", background: "rgba(255,255,255,0.2)", borderRadius: "50%" }}>
                                🎧
                            </div>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: "1rem" }}>Support Chat</div>
                                <div style={{ fontSize: "0.75rem", opacity: 0.9 }}>We're here to help!</div>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            style={{
                                background: "rgba(255,255,255,0.1)",
                                border: "none",
                                color: "#fff",
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "background 0.2s",
                            }}
                            onMouseEnter={(e) => e.target.style.background = "rgba(255,255,255,0.2)"}
                            onMouseLeave={(e) => e.target.style.background = "rgba(255,255,255,0.1)"}
                        >
                            ✕
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div
                        style={{
                            flex: 1,
                            overflowY: "auto",
                            padding: "1rem",
                            background: "#f8f9fa",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.75rem",
                        }}
                    >
                        {loadingMessages ? (
                            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#a0aec0" }}>
                                Loading messages...
                            </div>
                        ) : messages.length === 0 ? (
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#a0aec0", textAlign: "center", padding: "2rem" }}>
                                <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>👋</div>
                                <p>Start a conversation with our support team!</p>
                            </div>
                        ) : (
                            messages.map((msg) => {
                                const isMe = msg.senderType === "CUSTOMER" || msg.senderType === "GUEST";
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
                                                maxWidth: "80%",
                                                padding: "0.75rem 1rem",
                                                background: isMe ? "#667eea" : "#fff",
                                                color: isMe ? "#fff" : "#2d3748",
                                                borderRadius: isMe ? "12px 12px 0 12px" : "12px 12px 12px 0",
                                                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                                                position: "relative",
                                            }}
                                        >
                                            {msg.type === "TEXT" ? (
                                                <div style={{ fontSize: "0.95rem", lineHeight: "1.4" }}>{msg.text}</div>
                                            ) : (
                                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                                    <div style={{ fontSize: "0.85rem", opacity: isMe ? 0.9 : 0.7 }}>Attachment</div>
                                                    <button
                                                        onClick={() => handleDownloadAttachment(msg.attachmentId)}
                                                        style={{
                                                            padding: "0.4rem 0.8rem",
                                                            background: isMe ? "rgba(255,255,255,0.2)" : "#edf2f7",
                                                            color: isMe ? "#fff" : "#4a5568",
                                                            border: "none",
                                                            borderRadius: "6px",
                                                            fontSize: "0.85rem",
                                                            cursor: "pointer",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: "0.4rem",
                                                        }}
                                                    >
                                                        <span>⬇️</span> Download File
                                                    </button>
                                                </div>
                                            )}
                                            <div style={{ fontSize: "0.7rem", opacity: 0.7, marginTop: "0.4rem", textAlign: "right" }}>
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
                    <form
                        onSubmit={handleSendMessage}
                        style={{
                            padding: "1rem",
                            background: "#fff",
                            borderTop: "1px solid #edf2f7",
                            display: "flex",
                            gap: "0.75rem",
                            alignItems: "flex-end"
                        }}
                    >
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
                                padding: "0.6rem",
                                background: "#edf2f7",
                                color: "#4a5568",
                                border: "none",
                                borderRadius: "8px",
                                cursor: uploadingFile ? "not-allowed" : "pointer",
                                transition: "all 0.2s",
                            }}
                            title="Attach File"
                        >
                            📎
                        </button>

                        <div style={{ flex: 1, position: "relative" }}>
                            <input
                                type="text"
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                placeholder="Type a message..."
                                disabled={sendingMessage}
                                style={{
                                    width: "100%",
                                    padding: "0.75rem",
                                    paddingRight: "2.5rem",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "8px",
                                    fontSize: "0.95rem",
                                    outline: "none",
                                    transition: "border-color 0.2s",
                                    color: "#2d3748",
                                    boxSizing: "border-box",
                                    background: "#fff"
                                }}
                                onFocus={(e) => e.target.style.borderColor = "#667eea"}
                                onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={sendingMessage || !messageText.trim()}
                            style={{
                                padding: "0.75rem 1rem",
                                background: sendingMessage || !messageText.trim() ? "#cbd5e0" : "#667eea",
                                color: "#fff",
                                border: "none",
                                borderRadius: "8px",
                                cursor: sendingMessage || !messageText.trim() ? "not-allowed" : "pointer",
                                fontWeight: 600,
                                transition: "all 0.2s",
                                flexShrink: 0
                            }}
                        >
                            Send
                        </button>
                    </form>
                    <style>
                        {`
                        @keyframes fadeInUp {
                            from { opacity: 0; transform: translateY(20px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                        `}
                    </style>
                </div>
            )}
        </>
    );
}

