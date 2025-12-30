import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import supportApi from "../api/supportApi";
import userApi from "../api/userApi";
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
    const [userNames, setUserNames] = useState({}); // Map userId -> userName
    const [currentAgentClaimedConversationId, setCurrentAgentClaimedConversationId] = useState(null);
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const navigate = useNavigate();
    const { success: showSuccess, error: showError } = useToast();
    const userRole = useUserRole();
    const wsClientRef = useRef(null);
    const messageSubscriptionRef = useRef(null);
    const queueSubscriptionRef = useRef(null);
    const messagesLoadedRef = useRef(null);

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
                console.log("[SupportAgentChatPage] Loading initial data...");
                await loadQueue();
                console.log("[SupportAgentChatPage] Initial data loaded successfully");
            } catch (error) {
                console.error("[SupportAgentChatPage] Error loading data:", error);
                showError("Failed to load data. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        loadData();

        // Connect WebSocket for real-time updates
        console.log("[SupportAgentChatPage] Connecting to WebSocket...");
        const client = connectWebSocket(
            null,
            (error) => {
                console.error("[SupportAgentChatPage] WebSocket error:", error);
                showError("Connection error. Please refresh the page.");
            },
            token
        );

        wsClientRef.current = client;

        // Subscribe to queue updates
        const checkConnection = setInterval(() => {
            if (client && client.connected) {
                clearInterval(checkConnection);
                console.log("[SupportAgentChatPage] WebSocket connected, subscribing to queue...");
                
                // Subscribe to queue updates
                const queueSub = subscribeToQueue(client, (conversation) => {
                    console.log("[SupportAgentChatPage] Received queue update:", conversation);
                    // Update conversation in the list
                    setConversations((prev) => {
                        const index = prev.findIndex((c) => c.conversationId === conversation.conversationId);
                        if (index >= 0) {
                            // Update existing conversation
                            const updated = [...prev];
                            updated[index] = conversation;
                            console.log("[SupportAgentChatPage] Updated conversation in list:", conversation.conversationId);
                            return updated;
                        } else {
                            // Add new conversation
                            console.log("[SupportAgentChatPage] Added new conversation to list:", conversation.conversationId);
                            return [...prev, conversation];
                        }
                    });

                    // Update selected conversation if it's the one being updated
                    if (selectedConversation && selectedConversation.conversationId === conversation.conversationId) {
                        console.log("[SupportAgentChatPage] Updating selected conversation:", conversation);
                        setSelectedConversation(conversation);
                        // If conversation was closed, clear messages
                        if (conversation.status === "CLOSED") {
                            console.log("[SupportAgentChatPage] Conversation closed, clearing messages");
                            setMessages([]);
                            setCustomerContext(null);
                            // If this was the claimed conversation, clear it
                            if (currentAgentClaimedConversationId === conversation.conversationId) {
                                setCurrentAgentClaimedConversationId(null);
                            }
                        }
                        // Update claimed conversation ID if this agent claimed it
                        if (conversation.status === "CLAIMED" && conversation.claimedByAgentId) {
                            const token = localStorage.getItem("access_token");
                            if (token) {
                                try {
                                    const payloadBase64 = token.split(".")[1];
                                    const normalized = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
                                    const payloadJson = atob(normalized);
                                    const payload = JSON.parse(payloadJson);
                                    const currentUsername = payload.sub || payload.name || payload.username;
                                    // Check if this agent claimed it (we'll need to get agent username from conversation)
                                    // For now, if conversation is CLAIMED, set it as claimed
                                    setCurrentAgentClaimedConversationId(conversation.conversationId);
                                } catch (e) {
                                    console.error("[SupportAgentChatPage] Error parsing token:", e);
                                }
                            }
                        }
                    }
                });

                queueSubscriptionRef.current = queueSub;
                console.log("[SupportAgentChatPage] Subscribed to queue updates");
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
            // Reset messages loaded flag when conversation changes
            if (messagesLoadedRef.current !== selectedConversation.conversationId) {
                messagesLoadedRef.current = selectedConversation.conversationId;
                // Load initial messages only once when conversation is selected
                loadMessages(selectedConversation.conversationId);
            }

            // Wait for WebSocket connection and subscribe
            const checkConnection = setInterval(() => {
                if (wsClientRef.current && wsClientRef.current.connected) {
                    clearInterval(checkConnection);

                    // Unsubscribe from previous conversation if any
                    if (messageSubscriptionRef.current) {
                        messageSubscriptionRef.current.unsubscribe();
                    }

                    // Subscribe to new conversation messages
                    console.log("[SupportAgentChatPage] Subscribing to conversation messages:", selectedConversation.conversationId);
                    const subscription = subscribeToConversation(
                        wsClientRef.current,
                        selectedConversation.conversationId,
                        (message) => {
                            console.log("[SupportAgentChatPage] Received message via WebSocket:", message);
                            // Add new message to the list, sorted by createdAt
                            setMessages((prev) => {
                                // Check if message already exists
                                const exists = prev.some((m) => m.messageId === message.messageId);
                                if (exists) {
                                    console.log("[SupportAgentChatPage] Message already exists, skipping:", message.messageId);
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
                                console.log("[SupportAgentChatPage] Updated messages list, total:", sorted.length);
                                return sorted;
                            });
                        }
                    );
                    console.log("[SupportAgentChatPage] Subscribed to conversation messages");

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
        console.log("[SupportAgentChatPage] Loading queue with filter:", statusFilter);
        setLoadingQueue(true);
        try {
            const response = await supportApi.getQueue(statusFilter || null);
            const conversationsData = response.data?.data || response.data || [];
            const conversationsList = Array.isArray(conversationsData) ? conversationsData : [];
            console.log("[SupportAgentChatPage] Loaded conversations:", conversationsList.length);
            setConversations(conversationsList);
            
            // Load user names for all conversations
            const userIds = conversationsList
                .map(c => c.customerUserId)
                .filter(id => id && !userNames[id]);
            
            if (userIds.length > 0) {
                console.log("[SupportAgentChatPage] Loading user names for:", userIds);
                const namePromises = userIds.map(async (userId) => {
                    try {
                        const userResponse = await userApi.getUserByUserId(userId);
                        const user = userResponse.data?.data || userResponse.data;
                        if (user) {
                            return { userId, userName: user.name || user.username || userId };
                        }
                    } catch (error) {
                        console.error(`[SupportAgentChatPage] Error loading user ${userId}:`, error);
                        return { userId, userName: userId };
                    }
                });
                
                const names = await Promise.all(namePromises);
                const namesMap = {};
                names.forEach(({ userId, userName }) => {
                    namesMap[userId] = userName;
                });
                setUserNames(prev => ({ ...prev, ...namesMap }));
                console.log("[SupportAgentChatPage] Loaded user names:", namesMap);
            }
            
            // Check current agent's claimed conversation
            const token = localStorage.getItem("access_token");
            if (token) {
                try {
                    const payloadBase64 = token.split(".")[1];
                    const normalized = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
                    const payloadJson = atob(normalized);
                    const payload = JSON.parse(payloadJson);
                    const currentUsername = payload.sub || payload.name || payload.username;
                    
                    // Find conversation claimed by current agent
                    const claimedConv = conversationsList.find(c => 
                        c.status === "CLAIMED" && c.claimedByAgentId
                    );
                    if (claimedConv) {
                        // We need to check if it's claimed by current agent
                        // For now, if there's a CLAIMED conversation, set it
                        setCurrentAgentClaimedConversationId(claimedConv.conversationId);
                        console.log("[SupportAgentChatPage] Found claimed conversation:", claimedConv.conversationId);
                    }
                } catch (e) {
                    console.error("[SupportAgentChatPage] Error parsing token:", e);
                }
            }
        } catch (error) {
            console.error("[SupportAgentChatPage] Error loading queue:", error);
            showError(error.response?.data?.message || "Failed to load conversation queue.");
        } finally {
            setLoadingQueue(false);
        }
    };

    const loadMessages = async (conversationId) => {
        console.log("[SupportAgentChatPage] Loading messages for conversation:", conversationId);
        try {
            const response = await supportApi.agentGetMessages(conversationId);
            const messagesData = response.data?.data || response.data || [];
            console.log("[SupportAgentChatPage] Loaded messages:", messagesData.length);
            // Sort messages by createdAt to ensure correct order
            const sortedMessages = Array.isArray(messagesData)
                ? messagesData.sort((a, b) => {
                    const dateA = new Date(a.createdAt);
                    const dateB = new Date(b.createdAt);
                    return dateA - dateB;
                })
                : [];
            setMessages(sortedMessages);
            console.log("[SupportAgentChatPage] Set messages:", sortedMessages.length);
        } catch (error) {
            console.error("[SupportAgentChatPage] Error loading messages:", error);
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
        console.log("[SupportAgentChatPage] Claiming conversation:", conversationId);
        
        // Check if agent already has a claimed conversation
        if (currentAgentClaimedConversationId && currentAgentClaimedConversationId !== conversationId) {
            const currentClaimed = conversations.find(c => c.conversationId === currentAgentClaimedConversationId);
            if (currentClaimed && currentClaimed.status !== "CLOSED") {
                console.log("[SupportAgentChatPage] Agent already has a claimed conversation:", currentAgentClaimedConversationId);
                showError("You already have a claimed conversation. Please close it first before claiming another one.");
                return;
            }
        }
        
        try {
            const response = await supportApi.claimConversation(conversationId);
            const conversation = response.data?.data || response.data;
            console.log("[SupportAgentChatPage] Conversation claimed successfully:", conversation);
            setSelectedConversation(conversation);
            setCurrentAgentClaimedConversationId(conversationId);
            await loadMessages(conversationId);
            await loadCustomerContext(conversationId);
            await loadQueue();
            showSuccess("Conversation claimed successfully!");
        } catch (error) {
            console.error("[SupportAgentChatPage] Error claiming conversation:", error);
            showError(error.response?.data?.message || "Failed to claim conversation.");
        }
    };

    const handleSelectConversation = async (conversation) => {
        // Allow agents to view any conversation, even if not claimed
            setSelectedConversation(conversation);
            await loadMessages(conversation.conversationId);
            await loadCustomerContext(conversation.conversationId);
        
        // If conversation is OPEN and not claimed, show option to claim
        if (conversation.status === "OPEN" && !conversation.claimedByAgentId) {
            // Conversation is open but not claimed - agent can view but should claim to respond
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!messageText.trim() || !selectedConversation) return;

        console.log("[SupportAgentChatPage] Sending message:", messageText.trim());
        
        // Don't allow sending messages to unclaimed conversations
        if (selectedConversation.status === "OPEN" && !selectedConversation.claimedByAgentId) {
            console.log("[SupportAgentChatPage] Cannot send message to unclaimed conversation");
            showError("Please claim the conversation first to send messages.");
            return;
        }

        const text = messageText.trim();
        const tempMessageId = `temp_${Date.now()}`;
        
        // Get current user name for optimistic update
        const token = localStorage.getItem("access_token");
        let currentUserName = null;
        if (token) {
            try {
                const payloadBase64 = token.split(".")[1];
                const normalized = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
                const payloadJson = atob(normalized);
                const payload = JSON.parse(payloadJson);
                currentUserName = payload.sub || payload.name || payload.username;
            } catch (e) {
                console.error("[SupportAgentChatPage] Error parsing token:", e);
            }
        }
        
        // Optimistic update - add message immediately
        const optimisticMessage = {
            messageId: tempMessageId,
            conversationId: selectedConversation.conversationId,
            senderType: "SUPPORT_AGENT",
            senderId: "temp",
            senderName: currentUserName,
            type: "TEXT",
            text: text,
            attachmentId: null,
            createdAt: new Date().toISOString(),
        };
        
        console.log("[SupportAgentChatPage] Adding optimistic message:", optimisticMessage);
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
                console.log("[SupportAgentChatPage] Sending via WebSocket");
                const sent = sendAgentMessageViaWebSocket(
                    wsClientRef.current,
                    selectedConversation.conversationId,
                    text
                );
                if (sent) {
                    console.log("[SupportAgentChatPage] Message sent via WebSocket");
                    // Message will be received via WebSocket subscription and replace optimistic one
                    setSendingMessage(false);
                    return;
                }
            }

            // Fallback to REST API
            console.log("[SupportAgentChatPage] Sending via REST API");
            await supportApi.agentSendText(selectedConversation.conversationId, text);
            console.log("[SupportAgentChatPage] Message sent via REST API");
            // Don't reload messages - wait for WebSocket message
        } catch (error) {
            console.error("[SupportAgentChatPage] Error sending message:", error);
            // Remove optimistic message on error
            setMessages((prev) => prev.filter((m) => m.messageId !== tempMessageId));
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

        console.log("[SupportAgentChatPage] Closing conversation:", selectedConversation.conversationId);
        try {
            await supportApi.closeConversation(selectedConversation.conversationId);
            console.log("[SupportAgentChatPage] Conversation closed successfully");
            setSelectedConversation(null);
            setMessages([]);
            setCustomerContext(null);
            setCurrentAgentClaimedConversationId(null);
            await loadQueue();
            showSuccess("Conversation closed successfully!");
        } catch (error) {
            console.error("[SupportAgentChatPage] Error closing conversation:", error);
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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#2d3748", margin: 0 }}>
                        Conversation Queue
                    </h2>
                        <button
                            onClick={loadQueue}
                            disabled={loadingQueue}
                            style={{
                                padding: "0.5rem 1rem",
                                background: loadingQueue ? "#e2e8f0" : "#667eea",
                                color: loadingQueue ? "#718096" : "#fff",
                                border: "none",
                                borderRadius: "4px",
                                fontSize: "0.85rem",
                                cursor: loadingQueue ? "not-allowed" : "pointer",
                            }}
                        >
                            {loadingQueue ? "Refreshing..." : "🔄 Refresh"}
                        </button>
                    </div>
                    
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
                                        {conv.customerUserId 
                                            ? `User: ${userNames[conv.customerUserId] || conv.customerUserId}` 
                                            : `Guest: ${conv.guestToken?.substring(0, 8)}...`}
                                    </div>
                                    <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                                        Status: {conv.status}
                                        {conv.status === "CLAIMED" && conv.claimedByAgentId && (
                                            <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem" }}>
                                                (Claimed)
                                            </span>
                                        )}
                                    </div>
                                    {conv.lastMessageAt && (
                                        <div style={{ fontSize: "0.75rem", opacity: 0.7, marginTop: "0.25rem" }}>
                                            {new Date(conv.lastMessageAt).toLocaleString()}
                                        </div>
                                    )}
                                    {conv.status === "OPEN" && !conv.claimedByAgentId && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleClaimConversation(conv.conversationId);
                                            }}
                                            disabled={currentAgentClaimedConversationId && currentAgentClaimedConversationId !== conv.conversationId}
                                            style={{
                                                marginTop: "0.5rem",
                                                padding: "0.4rem 0.8rem",
                                                background: currentAgentClaimedConversationId && currentAgentClaimedConversationId !== conv.conversationId ? "#e2e8f0" : "#667eea",
                                                color: currentAgentClaimedConversationId && currentAgentClaimedConversationId !== conv.conversationId ? "#718096" : "#fff",
                                                border: "none",
                                                borderRadius: "4px",
                                                fontSize: "0.75rem",
                                                cursor: currentAgentClaimedConversationId && currentAgentClaimedConversationId !== conv.conversationId ? "not-allowed" : "pointer",
                                                width: "100%",
                                            }}
                                        >
                                            {currentAgentClaimedConversationId && currentAgentClaimedConversationId !== conv.conversationId 
                                                ? "Close current conversation first" 
                                                : "Claim Conversation"}
                                        </button>
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
                                        {selectedConversation.customerUserId 
                                            ? `Customer: ${userNames[selectedConversation.customerUserId] || customerContext?.user?.name || selectedConversation.customerUserId}` 
                                            : `Guest: ${selectedConversation.guestToken?.substring(0, 8)}...`}
                                    </h3>
                                    <div style={{ fontSize: "0.85rem", color: "#718096" }}>
                                        Status: {selectedConversation.status}
                                        {selectedConversation.status === "OPEN" && !selectedConversation.claimedByAgentId && (
                                            <span style={{ marginLeft: "0.5rem", color: "#f59e0b", fontSize: "0.8rem" }}>
                                                (Not Claimed)
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                    {selectedConversation.status === "OPEN" && !selectedConversation.claimedByAgentId && (
                                        <button
                                            onClick={() => handleClaimConversation(selectedConversation.conversationId)}
                                            style={{
                                                padding: "0.5rem 1rem",
                                                background: "#667eea",
                                                color: "#fff",
                                                border: "none",
                                                borderRadius: "4px",
                                                fontSize: "0.85rem",
                                                cursor: "pointer",
                                            }}
                                        >
                                            Claim Conversation
                                        </button>
                                    )}
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
                            </div>

                            {/* Customer Context */}
                            {customerContext && (
                                <div style={{ 
                                    marginBottom: "1rem", 
                                    padding: "1.25rem", 
                                    background: "#ffffff", 
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "8px", 
                                    fontSize: "0.9rem",
                                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)"
                                }}>
                                    <div style={{ 
                                        fontWeight: 700, 
                                        marginBottom: "1rem", 
                                        color: "#2d3748",
                                        fontSize: "1rem",
                                        borderBottom: "2px solid #e2e8f0",
                                        paddingBottom: "0.5rem"
                                    }}>
                                        Customer Information
                                    </div>
                                    {customerContext.user && (
                                        <div style={{ marginBottom: "0.75rem" }}>
                                            <div style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center" }}>
                                                <span style={{ fontWeight: 600, color: "#4a5568", minWidth: "80px" }}>Name:</span>
                                                <span style={{ color: "#2d3748" }}>{customerContext.user.name || "N/A"}</span>
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center" }}>
                                                <span style={{ fontWeight: 600, color: "#4a5568", minWidth: "80px" }}>Email:</span>
                                                <span style={{ color: "#2d3748" }}>{customerContext.user.email || "N/A"}</span>
                                            </div>
                                        </div>
                                    )}
                                    {customerContext.orders && customerContext.orders.length > 0 && (
                                        <div style={{ 
                                            marginBottom: "0.75rem",
                                            paddingTop: "0.75rem",
                                            borderTop: "1px solid #e2e8f0"
                                        }}>
                                            <div style={{ display: "flex", alignItems: "center" }}>
                                                <span style={{ fontWeight: 600, color: "#4a5568", minWidth: "80px" }}>Orders:</span>
                                                <span style={{ color: "#2d3748" }}>{customerContext.orders.length} order(s)</span>
                                            </div>
                                        </div>
                                    )}
                                    {customerContext.wishListProductIds && customerContext.wishListProductIds.length > 0 && (
                                        <div style={{ 
                                            paddingTop: "0.75rem",
                                            borderTop: "1px solid #e2e8f0"
                                        }}>
                                            <div style={{ display: "flex", alignItems: "center" }}>
                                                <span style={{ fontWeight: 600, color: "#4a5568", minWidth: "80px" }}>Wishlist:</span>
                                                <span style={{ color: "#2d3748" }}>{customerContext.wishListProductIds.length} item(s)</span>
                                            </div>
                                        </div>
                                    )}
                                    {(!customerContext.user || (!customerContext.orders || customerContext.orders.length === 0) && (!customerContext.wishListProductIds || customerContext.wishListProductIds.length === 0)) && (
                                        <div style={{ color: "#718096", fontStyle: "italic" }}>
                                            No additional information available
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
                                                <div style={{ fontSize: "0.85rem", marginBottom: "0.25rem", fontWeight: 600 }}>
                                                    {msg.senderType === "SUPPORT_AGENT" 
                                                        ? "You" 
                                                        : msg.senderType === "CUSTOMER" 
                                                            ? (msg.senderName || "Customer")
                                                            : "Guest"}
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
                                    placeholder={selectedConversation.status === "OPEN" && !selectedConversation.claimedByAgentId ? "Claim conversation to send messages..." : "Type a message..."}
                                    disabled={selectedConversation.status === "CLOSED" || (selectedConversation.status === "OPEN" && !selectedConversation.claimedByAgentId) || sendingMessage}
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
                                    disabled={selectedConversation.status === "CLOSED" || (selectedConversation.status === "OPEN" && !selectedConversation.claimedByAgentId) || uploadingFile}
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
                                    disabled={selectedConversation.status === "CLOSED" || (selectedConversation.status === "OPEN" && !selectedConversation.claimedByAgentId) || sendingMessage || !messageText.trim()}
                                    style={{
                                        padding: "0.75rem 1.5rem",
                                        background: selectedConversation.status === "CLOSED" || (selectedConversation.status === "OPEN" && !selectedConversation.claimedByAgentId) || sendingMessage || !messageText.trim() ? "#e2e8f0" : "#667eea",
                                        color: selectedConversation.status === "CLOSED" || (selectedConversation.status === "OPEN" && !selectedConversation.claimedByAgentId) || sendingMessage || !messageText.trim() ? "#718096" : "#fff",
                                        border: "none",
                                        borderRadius: "4px",
                                        fontSize: "0.85rem",
                                        cursor: selectedConversation.status === "CLOSED" || (selectedConversation.status === "OPEN" && !selectedConversation.claimedByAgentId) || sendingMessage || !messageText.trim() ? "not-allowed" : "pointer",
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

