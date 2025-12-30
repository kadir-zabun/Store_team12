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

    // Load messages when conversation is selected and connect WebSocket (REAL-TIME ONLY, NO POLLING)
    useEffect(() => {
        if (!selectedConversation) {
            setMessages([]);
            disconnectWebSocket();
            return;
        }
        
        // Initial load
        loadMessages(selectedConversation.conversationId, true);
        // Connect WebSocket for real-time updates (push-based, no polling)
        connectWebSocket(selectedConversation.conversationId);
        
        return () => {
            disconnectWebSocket();
        };
    }, [selectedConversation?.conversationId]);

    const connectWebSocket = (conversationId) => {
        if (!conversationId) {
            console.warn("Cannot connect WebSocket: no conversationId");
            return;
        }
        
        // Disconnect existing connection if conversationId changed
        if (stompClientRef.current && stompClientRef.current.conversationId !== conversationId) {
            console.log("Disconnecting existing WebSocket for different conversation");
            disconnectWebSocket();
        }
        
        // If already connected to this conversation, don't reconnect
        if (stompClientRef.current && stompClientRef.current.conversationId === conversationId) {
            console.log("WebSocket already connected to conversation:", conversationId);
            return;
        }
        
        try {
            if (!window.SockJS || !window.Stomp) {
                console.warn("SockJS or STOMP not loaded from CDN");
                return;
            }

            const baseUrl = window.location.origin;
            const wsUrl = `${baseUrl}/ws`;
            console.log("Connecting WebSocket to:", wsUrl, "for conversation:", conversationId);
            
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
                    console.log("WebSocket connected for conversation:", conversationId);
                    // Subscribe to messages
                    client.subscribe(`/topic/support/${conversationId}`, (message) => {
                        try {
                            console.log("WebSocket message received:", message.body);
                            const messageData = typeof message.body === 'string' ? JSON.parse(message.body) : message.body;
                            console.log("Parsed message data:", messageData);
                            
                            if (!messageData || !messageData.messageId) {
                                console.warn("Invalid message format received:", messageData);
                                return;
                            }
                            
                            setMessages((prevMessages) => {
                                // Check if message already exists (real message, not temporary)
                                const existingRealMessage = prevMessages.find(
                                    msg => !msg.isTemporary && msg.messageId === messageData.messageId
                                );
                                if (existingRealMessage) {
                                    console.log("Message already exists, skipping:", messageData.messageId);
                                    return prevMessages; // Keep all messages as-is
                                }
                                
                                // Check if there's a temporary message with matching text (optimistic update)
                                const matchingTempIndex = prevMessages.findIndex(
                                    msg => msg.isTemporary && 
                                           msg.text === messageData.text &&
                                           (msg.senderType === messageData.senderType)
                                );
                                
                                let updatedMessages;
                                if (matchingTempIndex !== -1) {
                                    // Replace temporary message with real one
                                    console.log("Replacing temporary message with real message:", messageData.messageId);
                                    updatedMessages = [...prevMessages];
                                    updatedMessages[matchingTempIndex] = messageData;
                                } else {
                                    // Add new message
                                    console.log("Adding new message via WebSocket:", messageData.messageId);
                                    updatedMessages = [...prevMessages, messageData];
                                }
                                
                                return updatedMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
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
                            // Update selected conversation status
                            setSelectedConversation((prev) => {
                                if (prev && prev.conversationId === statusData.conversationId) {
                                    return { ...prev, status: statusData.status };
                                }
                                return prev;
                            });
                            // Update conversation status in queue immediately
                            setConversations((prevConversations) => {
                                const updated = prevConversations.map((conv) => {
                                    if (conv.conversationId === statusData.conversationId) {
                                        return { 
                                            ...conv, 
                                            status: statusData.status,
                                            claimedBy: statusData.claimedBy || statusData.agentId || statusData.claimedByAgent,
                                            agentId: statusData.agentId || statusData.claimedBy || statusData.claimedByAgent,
                                            claimedByAgent: statusData.claimedByAgent || statusData.claimedBy || statusData.agentId
                                        };
                                    }
                                    return conv;
                                });
                                
                                // Filter out conversations claimed by other agents
                                return updated.filter((conv) => {
                                    if (conv.status === "OPEN") return true;
                                    if (conv.status === "CLAIMED") {
                                        const claimedBy = conv.claimedBy || conv.agentId || conv.claimedByAgent;
                                        return claimedBy === userName || claimedBy === conv.agentUsername;
                                    }
                                    return true;
                                });
                            });
                            // Refresh queue to get latest data
                            loadQueue();
                        } catch (error) {
                            console.error("Error parsing WebSocket status update:", error);
                        }
                    });
                };
                
                client.onStompError = (frame) => {
                    console.error("STOMP error:", frame);
                    console.error("STOMP error headers:", frame.headers);
                    console.error("STOMP error body:", frame.body);
                    // Clear client ref on error to allow reconnection
                    stompClientRef.current = null;
                };
                
                client.onWebSocketClose = () => {
                    console.log("WebSocket closed, will attempt to reconnect");
                    stompClientRef.current = null;
                };
                
                client.onDisconnect = () => {
                    console.log("WebSocket disconnected");
                    stompClientRef.current = null;
                };
                
                // Activate connection
                client.activate();
                console.log("WebSocket activation initiated for conversation:", conversationId);
            } else if (window.Stomp && window.Stomp.client) {
                client = window.Stomp.client(wsUrl);
                const token = localStorage.getItem("access_token");
                const headers = {};
                if (token) {
                    headers.Authorization = `Bearer ${token}`;
                }
                
                client.connect(headers, 
                    () => {
                        // Success callback
                        console.log("WebSocket connected (old API) for conversation:", conversationId);
                        client.subscribe(`/topic/support/${conversationId}`, (message) => {
                        try {
                            console.log("WebSocket message received (old API):", message.body);
                            const messageData = typeof message.body === 'string' ? JSON.parse(message.body) : message.body;
                            console.log("Parsed message data:", messageData);
                            
                            if (!messageData || !messageData.messageId) {
                                console.warn("Invalid message format received:", messageData);
                                return;
                            }
                            
                            setMessages((prevMessages) => {
                                // Check if message already exists (real message, not temporary)
                                const existingRealMessage = prevMessages.find(
                                    msg => !msg.isTemporary && msg.messageId === messageData.messageId
                                );
                                if (existingRealMessage) {
                                    console.log("Message already exists, skipping:", messageData.messageId);
                                    return prevMessages; // Keep all messages as-is
                                }
                                
                                // Check if there's a temporary message with matching text (optimistic update)
                                const matchingTempIndex = prevMessages.findIndex(
                                    msg => msg.isTemporary && 
                                           msg.text === messageData.text &&
                                           (msg.senderType === messageData.senderType)
                                );
                                
                                let updatedMessages;
                                if (matchingTempIndex !== -1) {
                                    // Replace temporary message with real one
                                    console.log("Replacing temporary message with real message:", messageData.messageId);
                                    updatedMessages = [...prevMessages];
                                    updatedMessages[matchingTempIndex] = messageData;
                                } else {
                                    // Add new message
                                    console.log("Adding new message via WebSocket:", messageData.messageId);
                                    updatedMessages = [...prevMessages, messageData];
                                }
                                
                                return updatedMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                            });
                        } catch (error) {
                            console.error("Error parsing WebSocket message:", error);
                            console.error("Message body:", message.body);
                        }
                    });
                    
                    client.subscribe(`/topic/support/${conversationId}/status`, (message) => {
                        try {
                            const statusData = typeof message.body === 'string' ? JSON.parse(message.body) : message.body;
                            // Update selected conversation status
                            setSelectedConversation((prev) => {
                                if (prev && prev.conversationId === statusData.conversationId) {
                                    return { ...prev, status: statusData.status };
                                }
                                return prev;
                            });
                            // Update conversation status in queue immediately
                            setConversations((prevConversations) => {
                                const updated = prevConversations.map((conv) => {
                                    if (conv.conversationId === statusData.conversationId) {
                                        return { 
                                            ...conv, 
                                            status: statusData.status,
                                            claimedBy: statusData.claimedBy || statusData.agentId || statusData.claimedByAgent,
                                            agentId: statusData.agentId || statusData.claimedBy || statusData.claimedByAgent,
                                            claimedByAgent: statusData.claimedByAgent || statusData.claimedBy || statusData.agentId
                                        };
                                    }
                                    return conv;
                                });
                                
                                // Filter out conversations claimed by other agents
                                return updated.filter((conv) => {
                                    if (conv.status === "OPEN") return true;
                                    if (conv.status === "CLAIMED") {
                                        const claimedBy = conv.claimedBy || conv.agentId || conv.claimedByAgent;
                                        return claimedBy === userName || claimedBy === conv.agentUsername;
                                    }
                                    return true;
                                });
                            });
                            // Refresh queue to get latest data
                            loadQueue();
                        } catch (error) {
                            console.error("Error parsing WebSocket status update:", error);
                        }
                    });
                    },
                    (error) => {
                        // Error callback
                        console.error("WebSocket connection error (old API):", error);
                        stompClientRef.current = null;
                    }
                );
            } else {
                console.warn("STOMP client not available");
                return;
            }
            
            // Store conversationId with client for tracking
            client.conversationId = conversationId;
            stompClientRef.current = client;
            console.log("WebSocket client stored for conversation:", conversationId);
        } catch (error) {
            console.error("Error connecting to WebSocket:", error);
        }
    };

    const disconnectWebSocket = () => {
        if (stompClientRef.current) {
            const conversationId = stompClientRef.current.conversationId;
            console.log("Disconnecting WebSocket for conversation:", conversationId);
            try {
                if (stompClientRef.current.deactivate) {
                    stompClientRef.current.deactivate();
                } else if (stompClientRef.current.disconnect) {
                    stompClientRef.current.disconnect();
                }
                console.log("WebSocket disconnected successfully");
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
            
            // Filter conversations: show only OPEN and CLAIMED by current agent
            const filteredConversations = (Array.isArray(conversationsData) ? conversationsData : []).filter((conv) => {
                // Show OPEN conversations
                if (conv.status === "OPEN") {
                    return true;
                }
                // Show CLAIMED conversations only if claimed by current agent
                if (conv.status === "CLAIMED") {
                    // Check if conversation is claimed by current agent
                    // Backend should return claimedBy or agentId field
                    const claimedBy = conv.claimedBy || conv.agentId || conv.claimedByAgent;
                    return claimedBy === userName || claimedBy === conv.agentUsername;
                }
                // Show CLOSED conversations (optional, can be filtered out)
                return true;
            });
            
            setConversations(filteredConversations);
        } catch (error) {
            // Detailed error logging
            console.error("=== SUPPORT AGENT - LOAD QUEUE ERROR ===");
            console.error("Error object:", error);
            console.error("Error type:", typeof error);
            console.error("Error message:", error.message);
            console.error("Error response:", error.response);
            console.error("Error response status:", error.response?.status);
            console.error("Error response data:", error.response?.data);
            console.error("Error response data type:", typeof error.response?.data);
            console.error("Full error response:", JSON.stringify(error.response, null, 2));
            
            let errorMessage = "Failed to load conversation queue.";
            if (error.response?.data) {
                const errorData = error.response.data;
                console.log("Error data:", errorData);
                console.log("Error data type:", typeof errorData);
                
                // Handle nested data structure (ApiResponse format)
                const actualErrorData = errorData?.data || errorData;
                console.log("Actual error data:", actualErrorData);
                console.log("Actual error data type:", typeof actualErrorData);
                
                if (typeof actualErrorData === "string") {
                    console.log("Error is string:", actualErrorData);
                    errorMessage = actualErrorData;
                } else if (actualErrorData?.message) {
                    console.log("Error has message property:", actualErrorData.message);
                    errorMessage = String(actualErrorData.message);
                } else if (actualErrorData?.error) {
                    console.log("Error has error property:", actualErrorData.error);
                    // If error is an object, extract message from it
                    if (typeof actualErrorData.error === "object" && actualErrorData.error.message) {
                        errorMessage = String(actualErrorData.error.message);
                    } else {
                        errorMessage = String(actualErrorData.error);
                    }
                } else if (errorData?.message) {
                    console.log("ErrorData has message property:", errorData.message);
                    errorMessage = String(errorData.message);
                } else if (errorData?.error) {
                    console.log("ErrorData has error property:", errorData.error);
                    // If error is an object, extract message from it
                    if (typeof errorData.error === "object" && errorData.error.message) {
                        errorMessage = String(errorData.error.message);
                    } else {
                        errorMessage = String(errorData.error);
                    }
                } else {
                    console.log("Using fallback - converting to JSON string");
                    errorMessage = typeof actualErrorData === "object" 
                        ? JSON.stringify(actualErrorData) 
                        : String(actualErrorData || "Failed to load conversation queue.");
                }
            } else if (error.message) {
                console.log("Using error.message:", error.message);
                errorMessage = String(error.message);
            }
            
            console.log("Final error message:", errorMessage);
            console.log("Final error message type:", typeof errorMessage);
            console.log("=== END ERROR LOG ===");
            // Don't show error on initial load failures, just log
            if (conversations.length === 0) {
                console.warn("Queue load failed:", errorMessage);
            } else {
                showError(String(errorMessage));
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
                // Polling: merge only new messages (silent update)
                setMessages((prevMessages) => {
                    if (prevMessages.length === 0) {
                        return newMessages;
                    }
                    
                    // Remove temporary messages
                    const withoutTemp = prevMessages.filter(msg => !msg.isTemporary);
                    
                    // Create a map of existing message IDs for quick lookup
                    const existingIds = new Set(withoutTemp.map(msg => msg.messageId));
                    
                    // Add only new messages that don't exist in current list
                    const messagesToAdd = newMessages.filter(msg => !existingIds.has(msg.messageId));
                    
                    // If no new messages, keep existing ones unchanged
                    if (messagesToAdd.length === 0) {
                        return prevMessages;
                    }
                    
                    console.log(`Polling: Found ${messagesToAdd.length} new message(s)`);
                    
                    // Merge: existing messages + new messages, sorted by createdAt
                    const merged = [...withoutTemp, ...messagesToAdd];
                    return merged.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                });
            }
        } catch (error) {
            // Detailed error logging
            console.error("=== SUPPORT AGENT - LOAD MESSAGES ERROR ===");
            console.error("Error object:", error);
            console.error("Error type:", typeof error);
            console.error("Error message:", error.message);
            console.error("Error response:", error.response);
            console.error("Error response status:", error.response?.status);
            console.error("Error response data:", error.response?.data);
            console.error("Error response data type:", typeof error.response?.data);
            console.error("Full error response:", JSON.stringify(error.response, null, 2));
            
            let errorMessage = "Failed to load messages.";
            if (error.response?.data) {
                const errorData = error.response.data;
                console.log("Error data:", errorData);
                console.log("Error data type:", typeof errorData);
                
                // Handle nested data structure (ApiResponse format)
                const actualErrorData = errorData?.data || errorData;
                console.log("Actual error data:", actualErrorData);
                console.log("Actual error data type:", typeof actualErrorData);
                
                if (typeof actualErrorData === "string") {
                    console.log("Error is string:", actualErrorData);
                    errorMessage = actualErrorData;
                } else if (actualErrorData?.message) {
                    console.log("Error has message property:", actualErrorData.message);
                    errorMessage = String(actualErrorData.message);
                } else if (actualErrorData?.error) {
                    console.log("Error has error property:", actualErrorData.error);
                    // If error is an object, extract message from it
                    if (typeof actualErrorData.error === "object" && actualErrorData.error.message) {
                        errorMessage = String(actualErrorData.error.message);
                    } else {
                        errorMessage = String(actualErrorData.error);
                    }
                } else if (errorData?.message) {
                    console.log("ErrorData has message property:", errorData.message);
                    errorMessage = String(errorData.message);
                } else if (errorData?.error) {
                    console.log("ErrorData has error property:", errorData.error);
                    // If error is an object, extract message from it
                    if (typeof errorData.error === "object" && errorData.error.message) {
                        errorMessage = String(errorData.error.message);
                    } else {
                        errorMessage = String(errorData.error);
                    }
                } else {
                    console.log("Using fallback - converting to JSON string");
                    errorMessage = typeof actualErrorData === "object" 
                        ? JSON.stringify(actualErrorData) 
                        : String(actualErrorData || "Failed to load messages.");
                }
            } else if (error.message) {
                console.log("Using error.message:", error.message);
                errorMessage = String(error.message);
            }
            
            console.log("Final error message:", errorMessage);
            console.log("Final error message type:", typeof errorMessage);
            console.log("=== END ERROR LOG ===");
            
            // Check if error is about conversation not being claimed
            const isNotClaimedError = String(errorMessage).toLowerCase().includes("not claimed") ||
                                     error.response?.status === 400 ||
                                     error.response?.status === 403;
            
            // Only show error if it's not a "not claimed" error and it's initial load
            if (!isNotClaimedError && isInitialLoad) {
                showError(String(errorMessage));
            } else if (isNotClaimedError) {
                console.log("Not showing error for unclaimed conversation - this is expected");
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
            console.log("=== SUPPORT AGENT - LOAD CUSTOMER CONTEXT ===");
            console.log("Conversation ID:", conversationId);
            const response = await supportApi.getCustomerDetails(conversationId);
            console.log("Customer context response:", response);
            console.log("Response data:", response.data);
            const contextData = response.data?.data || response.data;
            console.log("Context data:", contextData);
            setCustomerContext(contextData);
            console.log("=== END LOAD CUSTOMER CONTEXT ===");
        } catch (error) {
            // Detailed error logging
            console.error("=== SUPPORT AGENT - LOAD CUSTOMER CONTEXT ERROR ===");
            console.error("Conversation ID:", conversationId);
            console.error("Error object:", error);
            console.error("Error type:", typeof error);
            console.error("Error message:", error.message);
            console.error("Error response:", error.response);
            console.error("Error response status:", error.response?.status);
            console.error("Error response data:", error.response?.data);
            console.error("Error response data type:", typeof error.response?.data);
            console.error("Full error response:", JSON.stringify(error.response, null, 2));
            
            // 400 Bad Request is normal for guest users (no customer context available)
            if (error.response?.status === 400) {
                console.log("400 Bad Request - This is normal for guest users. Customer context not available.");
            } else if (error.response?.status === 404) {
                console.log("404 Not Found - Customer context endpoint not found.");
            } else {
                console.log("Unexpected error loading customer context.");
            }
            
            console.log("=== END ERROR LOG ===");
            // Don't show error to user, context might not be available for guest users
        }
    };

    const handleClaimConversation = async (conversationId) => {
        try {
            const response = await supportApi.claimConversation(conversationId);
            const conversation = response.data?.data || response.data;
            setSelectedConversation(conversation);
            
            // Update conversation status in queue immediately
            setConversations((prevConversations) => {
                return prevConversations.map((conv) => {
                    if (conv.conversationId === conversationId) {
                        return { 
                            ...conv, 
                            status: conversation.status || "CLAIMED",
                            claimedBy: conversation.claimedBy || userName,
                            agentId: conversation.agentId || userName,
                            claimedByAgent: conversation.claimedByAgent || userName
                        };
                    }
                    return conv;
                });
            });
            
            await loadMessages(conversationId, true);
            await loadCustomerContext(conversationId);
            await loadQueue(); // Refresh queue to get latest data
            showSuccess("Conversation claimed successfully!");
        } catch (error) {
            // Detailed error logging
            console.error("=== SUPPORT AGENT - CLAIM CONVERSATION ERROR ===");
            console.error("Error object:", error);
            console.error("Error type:", typeof error);
            console.error("Error message:", error.message);
            console.error("Error response:", error.response);
            console.error("Error response status:", error.response?.status);
            console.error("Error response data:", error.response?.data);
            console.error("Error response data type:", typeof error.response?.data);
            console.error("Full error response:", JSON.stringify(error.response, null, 2));
            
            let errorMessage = "Failed to claim conversation.";
            if (error.response?.data) {
                const errorData = error.response.data;
                console.log("Error data:", errorData);
                console.log("Error data type:", typeof errorData);
                
                // Handle nested data structure (ApiResponse format)
                const actualErrorData = errorData?.data || errorData;
                console.log("Actual error data:", actualErrorData);
                console.log("Actual error data type:", typeof actualErrorData);
                
                if (typeof actualErrorData === "string") {
                    console.log("Error is string:", actualErrorData);
                    errorMessage = actualErrorData;
                } else if (actualErrorData?.message) {
                    console.log("Error has message property:", actualErrorData.message);
                    errorMessage = String(actualErrorData.message);
                } else if (actualErrorData?.error) {
                    console.log("Error has error property:", actualErrorData.error);
                    // If error is an object, extract message from it
                    if (typeof actualErrorData.error === "object" && actualErrorData.error.message) {
                        errorMessage = String(actualErrorData.error.message);
                    } else {
                        errorMessage = String(actualErrorData.error);
                    }
                } else if (errorData?.message) {
                    console.log("ErrorData has message property:", errorData.message);
                    errorMessage = String(errorData.message);
                } else if (errorData?.error) {
                    console.log("ErrorData has error property:", errorData.error);
                    // If error is an object, extract message from it
                    if (typeof errorData.error === "object" && errorData.error.message) {
                        errorMessage = String(errorData.error.message);
                    } else {
                        errorMessage = String(errorData.error);
                    }
                } else {
                    console.log("Using fallback - converting to JSON string");
                    errorMessage = typeof actualErrorData === "object" 
                        ? JSON.stringify(actualErrorData) 
                        : String(actualErrorData || "Failed to claim conversation.");
                }
            } else if (error.message) {
                console.log("Using error.message:", error.message);
                errorMessage = String(error.message);
            }
            
            console.log("Final error message:", errorMessage);
            console.log("Final error message type:", typeof errorMessage);
            console.log("=== END ERROR LOG ===");
            showError(String(errorMessage));
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
        setSelectedConversation(conversation);
        
        // Don't try to load messages for OPEN conversations - agent needs to claim first
        if (conversation.status === "OPEN") {
            console.log("OPEN conversation selected, agent needs to claim first");
            setMessages([]);
            setCustomerContext(null);
            return;
        }
        
        // For CLAIMED conversations, try to load messages
        try {
            await loadMessages(conversation.conversationId, true);
            await loadCustomerContext(conversation.conversationId);
        } catch (error) {
            console.error("Error loading messages:", error);
            // If access denied for CLAIMED conversation, show error
            if (error.response?.status === 403) {
                let errorMessage = "You don't have access to this conversation. Please claim it first.";
                // Check if error message contains "not claimed"
                const errorData = error.response?.data;
                const actualErrorData = errorData?.data || errorData;
                if (actualErrorData?.error?.message?.includes("not claimed") || 
                    actualErrorData?.message?.includes("not claimed") ||
                    errorData?.error?.message?.includes("not claimed") ||
                    errorData?.message?.includes("not claimed")) {
                    errorMessage = "You don't have access to this conversation. Please claim it first.";
                }
                showError(errorMessage);
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
        const tempMessageId = `temp_${Date.now()}_${Math.random()}`;
        const optimisticMessage = {
            messageId: tempMessageId,
            conversationId: selectedConversation.conversationId,
            senderType: "SUPPORT_AGENT",
            type: "TEXT",
            text: messageToSend,
            createdAt: new Date().toISOString(),
            isTemporary: true
        };
        
        setMessages((prevMessages) => {
            const updated = [...prevMessages, optimisticMessage];
            return updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        });
        
        try {
            const response = await supportApi.agentSendText(selectedConversation.conversationId, messageToSend);
            console.log("Message sent successfully, WebSocket will broadcast it");
            
            // WebSocket will replace the temporary message with the real one
            // If WebSocket doesn't receive it within 3 seconds, remove temporary message as fallback
            setTimeout(() => {
                setMessages((prevMessages) => {
                    // Only remove this specific temporary message if it still exists
                    // (WebSocket should have replaced it by now)
                    const stillTemp = prevMessages.find(msg => msg.messageId === tempMessageId);
                    if (stillTemp) {
                        console.warn("Temporary message not replaced by WebSocket, removing:", tempMessageId);
                        return prevMessages.filter(msg => msg.messageId !== tempMessageId);
                    }
                    return prevMessages;
                });
            }, 3000);
            // Don't reload messages - WebSocket will handle all updates
        } catch (error) {
            // Remove optimistic message on error
            setMessages((prevMessages) => {
                return prevMessages.filter(msg => msg.messageId !== tempMessageId);
            });
            // Restore message text
            setMessageText(messageToSend);
            // Detailed error logging
            console.error("=== SUPPORT AGENT - SEND MESSAGE ERROR ===");
            console.error("Error object:", error);
            console.error("Error type:", typeof error);
            console.error("Error message:", error.message);
            console.error("Error response:", error.response);
            console.error("Error response status:", error.response?.status);
            console.error("Error response data:", error.response?.data);
            console.error("Error response data type:", typeof error.response?.data);
            console.error("Full error response:", JSON.stringify(error.response, null, 2));
            
            let errorMessage = "Failed to send message.";
            if (error.response?.data) {
                const errorData = error.response.data;
                console.log("Error data:", errorData);
                console.log("Error data type:", typeof errorData);
                
                // Handle nested data structure (ApiResponse format)
                const actualErrorData = errorData?.data || errorData;
                console.log("Actual error data:", actualErrorData);
                console.log("Actual error data type:", typeof actualErrorData);
                
                if (typeof actualErrorData === "string") {
                    console.log("Error is string:", actualErrorData);
                    errorMessage = actualErrorData;
                } else if (actualErrorData?.message) {
                    console.log("Error has message property:", actualErrorData.message);
                    errorMessage = String(actualErrorData.message);
                } else if (actualErrorData?.error) {
                    console.log("Error has error property:", actualErrorData.error);
                    // If error is an object, extract message from it
                    if (typeof actualErrorData.error === "object" && actualErrorData.error.message) {
                        errorMessage = String(actualErrorData.error.message);
                    } else {
                        errorMessage = String(actualErrorData.error);
                    }
                } else if (errorData?.message) {
                    console.log("ErrorData has message property:", errorData.message);
                    errorMessage = String(errorData.message);
                } else if (errorData?.error) {
                    console.log("ErrorData has error property:", errorData.error);
                    // If error is an object, extract message from it
                    if (typeof errorData.error === "object" && errorData.error.message) {
                        errorMessage = String(errorData.error.message);
                    } else {
                        errorMessage = String(errorData.error);
                    }
                } else {
                    console.log("Using fallback - converting to JSON string");
                    errorMessage = typeof actualErrorData === "object" 
                        ? JSON.stringify(actualErrorData) 
                        : String(actualErrorData || "Failed to send message.");
                }
            } else if (error.message) {
                console.log("Using error.message:", error.message);
                errorMessage = String(error.message);
            }
            
            console.log("Final error message:", errorMessage);
            console.log("Final error message type:", typeof errorMessage);
            console.log("=== END ERROR LOG ===");
            
            // If access denied (conversation not claimed), try to claim it
            if (error.response?.status === 403 || String(errorMessage).includes("not claimed")) {
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
                showError(String(errorMessage));
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
            // Detailed error logging
            console.error("=== SUPPORT AGENT - FILE UPLOAD ERROR ===");
            console.error("Error object:", error);
            console.error("Error type:", typeof error);
            console.error("Error message:", error.message);
            console.error("Error response:", error.response);
            console.error("Error response status:", error.response?.status);
            console.error("Error response data:", error.response?.data);
            console.error("Error response data type:", typeof error.response?.data);
            console.error("Full error response:", JSON.stringify(error.response, null, 2));
            
            let errorMessage = "Failed to upload file.";
            if (error.response?.data) {
                const errorData = error.response.data;
                console.log("Error data:", errorData);
                console.log("Error data type:", typeof errorData);
                
                // Handle nested data structure (ApiResponse format)
                const actualErrorData = errorData?.data || errorData;
                console.log("Actual error data:", actualErrorData);
                console.log("Actual error data type:", typeof actualErrorData);
                
                if (typeof actualErrorData === "string") {
                    console.log("Error is string:", actualErrorData);
                    errorMessage = actualErrorData;
                } else if (actualErrorData?.message) {
                    console.log("Error has message property:", actualErrorData.message);
                    errorMessage = String(actualErrorData.message);
                } else if (actualErrorData?.error) {
                    console.log("Error has error property:", actualErrorData.error);
                    // If error is an object, extract message from it
                    if (typeof actualErrorData.error === "object" && actualErrorData.error.message) {
                        errorMessage = String(actualErrorData.error.message);
                    } else {
                        errorMessage = String(actualErrorData.error);
                    }
                } else if (errorData?.message) {
                    console.log("ErrorData has message property:", errorData.message);
                    errorMessage = String(errorData.message);
                } else if (errorData?.error) {
                    console.log("ErrorData has error property:", errorData.error);
                    // If error is an object, extract message from it
                    if (typeof errorData.error === "object" && errorData.error.message) {
                        errorMessage = String(errorData.error.message);
                    } else {
                        errorMessage = String(errorData.error);
                    }
                } else {
                    console.log("Using fallback - converting to JSON string");
                    errorMessage = typeof actualErrorData === "object" 
                        ? JSON.stringify(actualErrorData) 
                        : String(actualErrorData || "Failed to upload file.");
                }
            } else if (error.message) {
                console.log("Using error.message:", error.message);
                errorMessage = String(error.message);
            }
            
            console.log("Final error message:", errorMessage);
            console.log("Final error message type:", typeof errorMessage);
            console.log("=== END ERROR LOG ===");
            showError(String(errorMessage));
        } finally {
            setUploadingFile(false);
        }
    };

    const handleCloseConversation = async () => {
        if (!selectedConversation) return;

        const conversationId = selectedConversation.conversationId;
        try {
            await supportApi.closeConversation(conversationId);
            
            // Update conversation status in queue immediately
            setConversations((prevConversations) => {
                return prevConversations.map((conv) => {
                    if (conv.conversationId === conversationId) {
                        return { ...conv, status: "CLOSED" };
                    }
                    return conv;
                });
            });
            
            setSelectedConversation(null);
            setMessages([]);
            setCustomerContext(null);
            await loadQueue(); // Refresh queue to get latest data
            showSuccess("Conversation closed successfully!");
        } catch (error) {
            // Detailed error logging
            console.error("=== SUPPORT AGENT - CLOSE CONVERSATION ERROR ===");
            console.error("Error object:", error);
            console.error("Error type:", typeof error);
            console.error("Error message:", error.message);
            console.error("Error response:", error.response);
            console.error("Error response status:", error.response?.status);
            console.error("Error response data:", error.response?.data);
            console.error("Error response data type:", typeof error.response?.data);
            console.error("Full error response:", JSON.stringify(error.response, null, 2));
            
            let errorMessage = "Failed to close conversation.";
            if (error.response?.data) {
                const errorData = error.response.data;
                console.log("Error data:", errorData);
                console.log("Error data type:", typeof errorData);
                
                // Handle nested data structure (ApiResponse format)
                const actualErrorData = errorData?.data || errorData;
                console.log("Actual error data:", actualErrorData);
                console.log("Actual error data type:", typeof actualErrorData);
                
                if (typeof actualErrorData === "string") {
                    console.log("Error is string:", actualErrorData);
                    errorMessage = actualErrorData;
                } else if (actualErrorData?.message) {
                    console.log("Error has message property:", actualErrorData.message);
                    errorMessage = String(actualErrorData.message);
                } else if (actualErrorData?.error) {
                    console.log("Error has error property:", actualErrorData.error);
                    // If error is an object, extract message from it
                    if (typeof actualErrorData.error === "object" && actualErrorData.error.message) {
                        errorMessage = String(actualErrorData.error.message);
                    } else {
                        errorMessage = String(actualErrorData.error);
                    }
                } else if (errorData?.message) {
                    console.log("ErrorData has message property:", errorData.message);
                    errorMessage = String(errorData.message);
                } else if (errorData?.error) {
                    console.log("ErrorData has error property:", errorData.error);
                    // If error is an object, extract message from it
                    if (typeof errorData.error === "object" && errorData.error.message) {
                        errorMessage = String(errorData.error.message);
                    } else {
                        errorMessage = String(errorData.error);
                    }
                } else {
                    console.log("Using fallback - converting to JSON string");
                    errorMessage = typeof actualErrorData === "object" 
                        ? JSON.stringify(actualErrorData) 
                        : String(actualErrorData || "Failed to close conversation.");
                }
            } else if (error.message) {
                console.log("Using error.message:", error.message);
                errorMessage = String(error.message);
            }
            
            console.log("Final error message:", errorMessage);
            console.log("Final error message type:", typeof errorMessage);
            console.log("=== END ERROR LOG ===");
            showError(String(errorMessage));
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
            // Detailed error logging
            console.error("=== SUPPORT AGENT - DOWNLOAD ATTACHMENT ERROR ===");
            console.error("Error object:", error);
            console.error("Error type:", typeof error);
            console.error("Error message:", error.message);
            console.error("Error response:", error.response);
            console.error("Error response status:", error.response?.status);
            console.error("Error response data:", error.response?.data);
            console.error("Error response data type:", typeof error.response?.data);
            console.error("Full error response:", JSON.stringify(error.response, null, 2));
            
            let errorMessage = "Failed to download attachment.";
            if (error.response?.data) {
                const errorData = error.response.data;
                console.log("Error data:", errorData);
                console.log("Error data type:", typeof errorData);
                
                // Handle nested data structure (ApiResponse format)
                const actualErrorData = errorData?.data || errorData;
                console.log("Actual error data:", actualErrorData);
                console.log("Actual error data type:", typeof actualErrorData);
                
                if (typeof actualErrorData === "string") {
                    console.log("Error is string:", actualErrorData);
                    errorMessage = actualErrorData;
                } else if (actualErrorData?.message) {
                    console.log("Error has message property:", actualErrorData.message);
                    errorMessage = String(actualErrorData.message);
                } else if (actualErrorData?.error) {
                    console.log("Error has error property:", actualErrorData.error);
                    // If error is an object, extract message from it
                    if (typeof actualErrorData.error === "object" && actualErrorData.error.message) {
                        errorMessage = String(actualErrorData.error.message);
                    } else {
                        errorMessage = String(actualErrorData.error);
                    }
                } else if (errorData?.message) {
                    console.log("ErrorData has message property:", errorData.message);
                    errorMessage = String(errorData.message);
                } else if (errorData?.error) {
                    console.log("ErrorData has error property:", errorData.error);
                    // If error is an object, extract message from it
                    if (typeof errorData.error === "object" && errorData.error.message) {
                        errorMessage = String(errorData.error.message);
                    } else {
                        errorMessage = String(errorData.error);
                    }
                } else {
                    console.log("Using fallback - converting to JSON string");
                    errorMessage = typeof actualErrorData === "object" 
                        ? JSON.stringify(actualErrorData) 
                        : String(actualErrorData || "Failed to download attachment.");
                }
            } else if (error.message) {
                console.log("Using error.message:", error.message);
                errorMessage = String(error.message);
            }
            
            console.log("Final error message:", errorMessage);
            console.log("Final error message type:", typeof errorMessage);
            console.log("=== END ERROR LOG ===");
            showError(String(errorMessage));
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
                                    style={{
                                        padding: "1rem",
                                        marginBottom: "0.5rem",
                                        background: selectedConversation?.conversationId === conv.conversationId ? "#667eea" : "#f7fafc",
                                        color: selectedConversation?.conversationId === conv.conversationId ? "#fff" : "#2d3748",
                                        borderRadius: "4px",
                                        transition: "all 0.2s",
                                        border: selectedConversation?.conversationId === conv.conversationId ? "2px solid #667eea" : "1px solid #e2e8f0",
                                    }}
                                >
                                    <div 
                                        onClick={() => handleSelectConversation(conv)}
                                        style={{
                                            cursor: "pointer",
                                        }}
                                        onMouseEnter={(e) => {
                                            if (selectedConversation?.conversationId !== conv.conversationId) {
                                                e.currentTarget.parentElement.style.background = "#e2e8f0";
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (selectedConversation?.conversationId !== conv.conversationId) {
                                                e.currentTarget.parentElement.style.background = "#f7fafc";
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
                                    {conv.status === "OPEN" && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleClaimConversation(conv.conversationId);
                                            }}
                                            style={{
                                                width: "100%",
                                                marginTop: "0.5rem",
                                                padding: "0.5rem 1rem",
                                                background: "#48bb78",
                                                color: "#fff",
                                                border: "none",
                                                borderRadius: "4px",
                                                fontSize: "0.85rem",
                                                fontWeight: 600,
                                                cursor: "pointer",
                                                transition: "all 0.2s",
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = "#38a169";
                                                e.currentTarget.style.transform = "scale(1.02)";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = "#48bb78";
                                                e.currentTarget.style.transform = "scale(1)";
                                            }}
                                        >
                                            Claim Conversation
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
                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                    {selectedConversation.status === "OPEN" && (
                                        <button
                                            onClick={() => handleClaimConversation(selectedConversation.conversationId)}
                                            style={{
                                                padding: "0.5rem 1rem",
                                                background: "#48bb78",
                                                color: "#fff",
                                                border: "none",
                                                borderRadius: "4px",
                                                fontSize: "0.85rem",
                                                fontWeight: 600,
                                                cursor: "pointer",
                                                transition: "all 0.2s",
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = "#38a169";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = "#48bb78";
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
                            
                            {/* Claim Banner for OPEN conversations */}
                            {selectedConversation.status === "OPEN" && (
                                <div style={{ 
                                    marginBottom: "1rem", 
                                    padding: "1rem", 
                                    background: "#feebc8", 
                                    borderRadius: "4px", 
                                    border: "1px solid #fbd38d",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center"
                                }}>
                                    <div style={{ color: "#c05621", fontSize: "0.9rem", fontWeight: 500 }}>
                                        ⚠️ This conversation is not claimed. Please claim it to start chatting.
                                    </div>
                                    <button
                                        onClick={() => handleClaimConversation(selectedConversation.conversationId)}
                                        style={{
                                            padding: "0.5rem 1rem",
                                            background: "#48bb78",
                                            color: "#fff",
                                            border: "none",
                                            borderRadius: "4px",
                                            fontSize: "0.85rem",
                                            fontWeight: 600,
                                            cursor: "pointer",
                                            transition: "all 0.2s",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = "#38a169";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = "#48bb78";
                                        }}
                                    >
                                        Claim Now
                                    </button>
                                </div>
                            )}

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

