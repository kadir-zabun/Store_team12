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
    const stompClientRef = useRef(null);

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

        return () => {
            // Cleanup if needed
        };
    }, [navigate, userRole, showError]);

    // Load messages when conversation is selected and connect WebSocket
    useEffect(() => {
        if (!selectedConversation) {
            setMessages([]);
            disconnectWebSocket();
            return;
        }
        // Initial load only - no polling
        loadMessages(selectedConversation.conversationId, true);
        // Connect WebSocket for real-time updates
        connectWebSocket(selectedConversation.conversationId);
        
        return () => {
            disconnectWebSocket();
        };
    }, [selectedConversation?.conversationId]);

    const connectWebSocket = (conversationId) => {
        if (!conversationId || stompClientRef.current) return;
        
        try {
            if (!window.SockJS || !window.Stomp) {
                console.warn("SockJS or STOMP not loaded from CDN");
                return;
            }

            const baseUrl = window.location.origin;
            const wsUrl = `${baseUrl}/ws`;
            
            let client;
            if (window.Stomp && window.Stomp.Client) {
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
                            const messageData = JSON.parse(message.body);
                            setMessages((prevMessages) => {
                                const exists = prevMessages.some(msg => msg.messageId === messageData.messageId);
                                if (exists) return prevMessages;
                                const updated = [...prevMessages, messageData];
                                return updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                            });
                        } catch (error) {
                            console.error("Error parsing WebSocket message:", error);
                        }
                    });
                    
                    // Subscribe to conversation status changes
                    client.subscribe(`/topic/support/${conversationId}/status`, (message) => {
                        try {
                            const statusData = JSON.parse(message.body);
                            // Update selected conversation status
                            setSelectedConversation((prev) => {
                                if (prev && prev.conversationId === statusData.conversationId) {
                                    return { ...prev, status: statusData.status };
                                }
                                return prev;
                            });
                            // Refresh queue to update conversation list
                            loadQueue();
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
                client = window.Stomp.client(wsUrl);
                const token = localStorage.getItem("access_token");
                const headers = {};
                if (token) {
                    headers.Authorization = `Bearer ${token}`;
                }
                
                client.connect(headers, () => {
                    client.subscribe(`/topic/support/${conversationId}`, (message) => {
                        try {
                            const messageData = typeof message.body === 'string' ? JSON.parse(message.body) : message.body;
                            setMessages((prevMessages) => {
                                const exists = prevMessages.some(msg => msg.messageId === messageData.messageId);
                                if (exists) return prevMessages;
                                const updated = [...prevMessages, messageData];
                                return updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                            });
                        } catch (error) {
                            console.error("Error parsing WebSocket message:", error);
                        }
                    });
                    
                    client.subscribe(`/topic/support/${conversationId}/status`, (message) => {
                        try {
                            const statusData = typeof message.body === 'string' ? JSON.parse(message.body) : message.body;
                            setSelectedConversation((prev) => {
                                if (prev && prev.conversationId === statusData.conversationId) {
                                    return { ...prev, status: statusData.status };
                                }
                                return prev;
                            });
                            loadQueue();
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

    // Reload queue when status filter changes
    useEffect(() => {
        if (!loading && !loadingQueue) {
            loadQueue();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter]);

    useEffect(() => {
        // Only scroll to bottom when new messages are added, not on every render
        if (messagesEndRef.current && messages.length > 0) {
            // Use setTimeout to ensure DOM is updated
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
        }
    }, [messages.length]); // Only depend on messages length, not the entire messages array

    const loadQueue = async () => {
        setLoadingQueue(true);
        try {
            const filterValue = statusFilter && statusFilter.trim() !== "" ? statusFilter : null;
            const response = await supportApi.getQueue(filterValue);
            console.log("Queue response:", response);
            const conversationsData = response.data?.data || response.data || [];
            console.log("Conversations data:", conversationsData);
            setConversations(Array.isArray(conversationsData) ? conversationsData : []);
        } catch (error) {
            console.error("Error loading queue:", error);
            console.error("Error response:", error.response);
            let errorMessage = "Failed to load conversation queue.";
            if (error.response?.data) {
                if (typeof error.response.data === "string") {
                    errorMessage = error.response.data;
                } else if (error.response.data.message) {
                    errorMessage = String(error.response.data.message);
                } else if (error.response.data.error) {
                    errorMessage = String(error.response.data.error);
                }
            }
            // Don't show error on initial load failures, just log
            if (conversations.length === 0) {
                console.warn("Queue load failed:", errorMessage);
            } else {
                showError(errorMessage);
            }
        } finally {
            setLoadingQueue(false);
        }
    };

    const loadMessages = async (conversationId, isInitialLoad = false) => {
        if (!conversationId) return;
        // Only show loading state on initial load
        if (isInitialLoad) {
            setLoadingMessages(true);
        }
        try {
            const response = await supportApi.agentGetMessages(conversationId);
            const messagesData = response.data?.data || response.data || [];
            const newMessages = Array.isArray(messagesData) ? messagesData : [];
            
            if (isInitialLoad) {
                // Initial load: replace all messages
                setMessages(newMessages);
            } else {
                // Subsequent loads: merge only new messages
                setMessages((prevMessages) => {
                    if (prevMessages.length === 0) {
                        return newMessages;
                    }
                    
                    // Create a map of existing message IDs for quick lookup
                    const existingIds = new Set(prevMessages.map(msg => msg.messageId));
                    
                    // Add only new messages that don't exist in current list
                    const messagesToAdd = newMessages.filter(msg => !existingIds.has(msg.messageId));
                    
                    // If no new messages, keep existing ones unchanged
                    if (messagesToAdd.length === 0) {
                        return prevMessages;
                    }
                    
                    // Merge: existing messages + new messages, sorted by createdAt
                    const merged = [...prevMessages, ...messagesToAdd];
                    return merged.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                });
            }
        } catch (error) {
            console.error("Error loading messages:", error);
            const errorMessage = error.response?.data?.message 
                || error.response?.data?.error 
                || "Failed to load messages.";
            // Only show error if it's not an access denied error (403) and it's initial load
            if (error.response?.status !== 403 && isInitialLoad) {
                showError(errorMessage);
            }
            // Don't clear messages on error, keep existing ones
        } finally {
            if (isInitialLoad) {
                setLoadingMessages(false);
            }
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
            await loadMessages(conversationId, true);
            await loadCustomerContext(conversationId);
            await loadQueue();
            showSuccess("Conversation claimed successfully!");
        } catch (error) {
            console.error("Error claiming conversation:", error);
            console.error("Error response:", error.response);
            const errorMessage = error.response?.data?.message 
                || error.response?.data?.error 
                || "Failed to claim conversation.";
            showError(errorMessage);
            // If claim fails, still try to load messages (might already be claimed by this agent)
            if (error.response?.status !== 403) {
                try {
                    await loadMessages(conversationId, true);
                    await loadCustomerContext(conversationId);
                } catch (loadError) {
                    console.error("Error loading messages after failed claim:", loadError);
                }
            }
        }
    };

    const handleSelectConversation = async (conversation) => {
        console.log("Selecting conversation:", conversation);
        // Don't auto-claim OPEN conversations - let agent manually claim them
        // Just select the conversation and try to load messages
        setSelectedConversation(conversation);
        try {
            await loadMessages(conversation.conversationId, true);
            await loadCustomerContext(conversation.conversationId);
        } catch (error) {
            console.error("Error loading messages:", error);
            // If access denied for CLAIMED conversation, show error
            if (error.response?.status === 403 || error.response?.data?.message?.includes("not claimed")) {
                if (conversation.status === "CLAIMED") {
                    showError("You don't have access to this conversation. Please claim it first.");
                } else if (conversation.status === "OPEN") {
                    // For OPEN conversations, silently fail - agent needs to claim first
                    console.log("OPEN conversation selected, agent needs to claim first");
                }
            } else {
                // Still show the conversation even if messages fail to load
                console.warn("Failed to load messages but keeping conversation selected");
            }
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!messageText.trim() || !selectedConversation) return;

        const messageToSend = messageText.trim();
        setMessageText(""); // Clear input immediately for better UX
        setSendingMessage(true);
        
        // Optimistic update: add temporary message immediately
        const tempMessageId = `temp_${Date.now()}`;
        const optimisticMessage = {
            messageId: tempMessageId,
            conversationId: selectedConversation.conversationId,
            senderType: "SUPPORT_AGENT",
            type: "TEXT",
            text: messageToSend,
            createdAt: new Date().toISOString(),
        };
        
        setMessages((prevMessages) => {
            const updated = [...prevMessages, optimisticMessage];
            return updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        });
        
        try {
            const response = await supportApi.agentSendText(selectedConversation.conversationId, messageToSend);
            
            // Replace optimistic message with real message from server
            const sentMessage = response.data?.data || response.data;
            if (sentMessage) {
                setMessages((prevMessages) => {
                    // Remove optimistic message and add real one
                    const filtered = prevMessages.filter(msg => msg.messageId !== tempMessageId);
                    const exists = filtered.some(msg => msg.messageId === sentMessage.messageId);
                    if (exists) {
                        return filtered;
                    }
                    const updated = [...filtered, sentMessage];
                    return updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                });
            }
        } catch (error) {
            // Remove optimistic message on error
            setMessages((prevMessages) => {
                return prevMessages.filter(msg => msg.messageId !== tempMessageId);
            });
            // Restore message text
            setMessageText(messageToSend);
            console.error("Error sending message:", error);
            console.error("Error response:", error.response);
            const errorMessage = error.response?.data?.message 
                || error.response?.data?.error 
                || "Failed to send message.";
            
            // If access denied (conversation not claimed), try to claim it
            if (error.response?.status === 403 || errorMessage.includes("not claimed")) {
                if (selectedConversation.status === "OPEN") {
                    try {
                        await handleClaimConversation(selectedConversation.conversationId);
                        // Retry sending message after claiming
                        const retryResponse = await supportApi.agentSendText(selectedConversation.conversationId, messageToSend);
                        
                        // Replace optimistic message with real message from server
                        const sentMessage = retryResponse.data?.data || retryResponse.data;
                        if (sentMessage) {
                            setMessages((prevMessages) => {
                                // Remove optimistic message and add real one
                                const filtered = prevMessages.filter(msg => msg.messageId !== tempMessageId);
                                const exists = filtered.some(msg => msg.messageId === sentMessage.messageId);
                                if (exists) {
                                    return filtered;
                                }
                                const updated = [...filtered, sentMessage];
                                return updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                            });
                        }
                        return;
                    } catch (claimError) {
                        showError("Please claim the conversation first.");
                    }
                } else {
                    showError("You don't have access to this conversation. Please claim it first.");
                }
            } else {
                showError(errorMessage);
            }
            
            // Refresh conversation status
            await loadQueue();
        } finally {
            setSendingMessage(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedConversation) return;

        setUploadingFile(true);
        try {
            const response = await supportApi.agentUploadAttachment(selectedConversation.conversationId, file);
            
            // Add the uploaded message immediately to the UI (optimistic update)
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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#2d3748", margin: 0 }}>
                            Conversation Queue
                        </h2>
                        <button
                            onClick={() => loadQueue()}
                            disabled={loadingQueue}
                            style={{
                                padding: "0.5rem 1rem",
                                background: loadingQueue ? "#e2e8f0" : "#667eea",
                                color: "#fff",
                                border: "none",
                                borderRadius: "4px",
                                fontSize: "0.75rem",
                                cursor: loadingQueue ? "not-allowed" : "pointer",
                                fontWeight: 600,
                            }}
                        >
                            {loadingQueue ? "Loading..." : "Refresh"}
                        </button>
                    </div>
                    
                    {/* Filter */}
                    <div style={{ marginBottom: "1rem" }}>
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
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
                            <div style={{ textAlign: "center", padding: "2rem", color: "#718096" }}>Loading conversations...</div>
                        ) : conversations.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "2rem", color: "#718096" }}>
                                <div style={{ marginBottom: "0.5rem" }}>No conversations found.</div>
                                <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>Start a conversation from the customer side to see it here.</div>
                            </div>
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
                                    <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.5rem" }}>
                                        {conv.customerUserId ? (
                                            <>
                                                {conv.customerName ? (
                                                    <div style={{ fontSize: "1rem", marginBottom: "0.25rem" }}>{conv.customerName}</div>
                                                ) : null}
                                                <div style={{ fontSize: "0.8rem", opacity: 0.7, fontWeight: 400 }}>
                                                    {conv.customerEmail || `User ID: ${conv.customerUserId.substring(0, 8)}...`}
                                                </div>
                                            </>
                                        ) : (
                                            <div>Guest: {conv.guestToken?.substring(0, 12)}...</div>
                                        )}
                                    </div>
                                    <div style={{ 
                                        display: "inline-block",
                                        padding: "0.25rem 0.5rem",
                                        borderRadius: "4px",
                                        fontSize: "0.75rem",
                                        fontWeight: 600,
                                        background: conv.status === "OPEN" ? "#48bb78" : conv.status === "CLAIMED" ? "#667eea" : "#a0aec0",
                                        color: "#fff",
                                        marginBottom: "0.5rem"
                                    }}>
                                        {conv.status}
                                    </div>
                                    {conv.lastMessageAt && (
                                        <div style={{ fontSize: "0.75rem", opacity: 0.7, marginTop: "0.5rem" }}>
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
                                    <h3 style={{ fontSize: "1.2rem", fontWeight: 600, color: "#2d3748", marginBottom: "0.25rem" }}>
                                        {selectedConversation.customerUserId ? (
                                            selectedConversation.customerName || `User: ${selectedConversation.customerUserId.substring(0, 8)}...`
                                        ) : (
                                            `Guest: ${selectedConversation.guestToken?.substring(0, 12)}...`
                                        )}
                                    </h3>
                                    {selectedConversation.customerEmail && (
                                        <div style={{ fontSize: "0.85rem", color: "#718096", marginBottom: "0.25rem" }}>
                                            {selectedConversation.customerEmail}
                                        </div>
                                    )}
                                    <div style={{ 
                                        display: "inline-block",
                                        padding: "0.25rem 0.5rem",
                                        borderRadius: "4px",
                                        fontSize: "0.75rem",
                                        fontWeight: 600,
                                        background: selectedConversation.status === "OPEN" ? "#48bb78" : selectedConversation.status === "CLAIMED" ? "#667eea" : "#a0aec0",
                                        color: "#fff"
                                    }}>
                                        {selectedConversation.status}
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
                                {messages.length === 0 ? (
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

