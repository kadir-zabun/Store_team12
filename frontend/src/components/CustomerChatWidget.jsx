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
    // Removed closingConversation state - customers cannot close conversations
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
        
        // Load conversationId from localStorage if exists (persist across page refreshes)
        const savedConversationId = localStorage.getItem("support_conversation_id");
        const savedConversationStatus = localStorage.getItem("support_conversation_status");
        if (savedConversationId && savedConversationStatus !== "CLOSED") {
            setConversationId(savedConversationId);
            setConversationStatus(savedConversationStatus || "OPEN");
            console.log("Restored conversation from localStorage:", savedConversationId, savedConversationStatus);
            
            // Load saved messages from localStorage
            const savedMessagesKey = `support_messages_${savedConversationId}`;
            const savedMessages = localStorage.getItem(savedMessagesKey);
            if (savedMessages) {
                try {
                    const parsedMessages = JSON.parse(savedMessages);
                    if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
                        setMessages(parsedMessages);
                        console.log("Restored messages from localStorage:", parsedMessages.length, "messages");
                    }
                } catch (error) {
                    console.error("Error parsing saved messages:", error);
                }
            }
        }
    }, []);

    // WebSocket connection for REAL-TIME messages (NO POLLING - push-based only)
    useEffect(() => {
        if (isOpen && conversationId && conversationStatus !== "CLOSED") {
            // Load initial messages
            loadMessages(true);
            
            // Connect to WebSocket for real-time updates (server pushes messages)
            connectWebSocket();
            
            return () => {
                disconnectWebSocket();
            };
        } else {
            disconnectWebSocket();
        }
    }, [isOpen, conversationId, conversationStatus]);

    const connectWebSocket = () => {
        if (!conversationId || conversationStatus === "CLOSED") {
            console.warn("Cannot connect WebSocket: missing conversationId or conversation is CLOSED");
            return;
        }
        
        // If already connected, don't reconnect
        if (stompClientRef.current) {
            console.log("WebSocket already connected for conversation:", conversationId);
            return;
        }
        
        try {
            // Use SockJS and STOMP from CDN
            if (!window.SockJS || !window.Stomp) {
                console.warn("SockJS or STOMP not loaded from CDN");
                return;
            }

            const baseUrl = window.location.origin;
            const wsUrl = `${baseUrl}/ws`;
            console.log("Connecting WebSocket to:", wsUrl, "for conversation:", conversationId);
            
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
                    console.log("WebSocket connected (Customer) for conversation:", conversationId);
                    
                    // Store current conversationId to avoid closure issues
                    const currentConversationId = conversationId;
                    if (!currentConversationId) {
                        console.error("No conversationId when connecting WebSocket!");
                        return;
                    }
                    
                    // Subscribe to messages
                    const messageSubscription = client.subscribe(`/topic/support/${currentConversationId}`, (message) => {
                        try {
                            console.log("WebSocket message received (Customer):", message.body);
                            const messageData = typeof message.body === 'string' ? JSON.parse(message.body) : message.body;
                            console.log("Parsed message data:", messageData);
                            
                            // Validate message structure
                            if (!messageData || !messageData.messageId) {
                                console.warn("Invalid message format received:", messageData);
                                return;
                            }
                            
                            // Add new message if it doesn't exist (real-time update)
                            // Replace temporary messages with real message if text matches
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
                                
                                const sorted = updatedMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                                // Save to localStorage
                                saveMessagesToLocalStorage(sorted, conversationId);
                                return sorted;
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
                                // Update localStorage when status changes
                                localStorage.setItem("support_conversation_status", statusData.status);
                                // If closed, clear conversationId and messages from localStorage (will create new one next time)
                                if (statusData.status === "CLOSED") {
                                    const convId = localStorage.getItem("support_conversation_id");
                                    if (convId) {
                                        localStorage.removeItem(`support_messages_${convId}`);
                                    }
                                    localStorage.removeItem("support_conversation_id");
                                    localStorage.removeItem("support_conversation_status");
                                    setMessages([]);
                                }
                            }
                        } catch (error) {
                            console.error("Error parsing WebSocket status update:", error);
                        }
                    });
                };
                
                client.onStompError = (frame) => {
                    console.error("STOMP error (Customer):", frame);
                    console.error("STOMP error headers:", frame.headers);
                    console.error("STOMP error body:", frame.body);
                    // Clear client ref on error to allow reconnection
                    stompClientRef.current = null;
                };
                
                client.onWebSocketClose = () => {
                    console.log("WebSocket closed (Customer), will attempt to reconnect");
                    stompClientRef.current = null;
                };
                
                client.onDisconnect = () => {
                    console.log("WebSocket disconnected (Customer)");
                    stompClientRef.current = null;
                };
                
                // Activate connection
                client.activate();
                console.log("WebSocket activation initiated (Customer) for conversation:", conversationId);
            } else if (window.Stomp && window.Stomp.client) {
                // Old STOMP.js API
                client = window.Stomp.client(wsUrl);
                const token = localStorage.getItem("access_token");
                const headers = {};
                if (token) {
                    headers.Authorization = `Bearer ${token}`;
                }
                
                client.connect(headers, 
                    () => {
                        // Success callback
                        console.log("WebSocket connected (Customer, old API) for conversation:", conversationId);
                        
                        // Store current conversationId to avoid closure issues
                        const currentConversationId = conversationId;
                        if (!currentConversationId) {
                            console.error("No conversationId when connecting WebSocket (old API)!");
                            return;
                        }
                        
                        // Subscribe to messages
                        client.subscribe(`/topic/support/${currentConversationId}`, (message) => {
                        try {
                            console.log("WebSocket message received (Customer, old API):", message.body);
                            const messageData = typeof message.body === 'string' ? JSON.parse(message.body) : message.body;
                            console.log("Parsed message data:", messageData);
                            
                            // Validate message structure
                            if (!messageData || !messageData.messageId) {
                                console.warn("Invalid message format received:", messageData);
                                return;
                            }
                            
                            // Add new message if it doesn't exist (real-time update)
                            // Replace temporary messages with real message if text matches
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
                                
                                const sorted = updatedMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                                // Save to localStorage
                                saveMessagesToLocalStorage(sorted, currentConversationId);
                                return sorted;
                            });
                        } catch (error) {
                            console.error("Error parsing WebSocket message:", error);
                            console.error("Message body:", message.body);
                        }
                    });
                    
                    // Subscribe to conversation status changes
                    const statusTopic = `/topic/support/${currentConversationId}/status`;
                    console.log("Subscribing to status topic:", statusTopic, "for conversation:", currentConversationId);
                    const statusSubscription = client.subscribe(statusTopic, (message) => {
                        try {
                            console.log("Status update received via WebSocket:", message.body);
                            const statusData = typeof message.body === 'string' ? JSON.parse(message.body) : message.body;
                            console.log("Parsed status data:", statusData);
                            
                            // Update conversation status in real-time
                            if (statusData && statusData.status) {
                                console.log("Updating conversation status to:", statusData.status);
                                setConversationStatus(statusData.status);
                                // Update localStorage when status changes
                                localStorage.setItem("support_conversation_status", statusData.status);
                                
                                // If closed, clear conversationId and messages from localStorage (will create new one next time)
                                if (statusData.status === "CLOSED") {
                                    console.log("Conversation closed, clearing localStorage and disconnecting WebSocket");
                                    const convId = localStorage.getItem("support_conversation_id");
                                    if (convId) {
                                        localStorage.removeItem(`support_messages_${convId}`);
                                    }
                                    localStorage.removeItem("support_conversation_id");
                                    localStorage.removeItem("support_conversation_status");
                                    setMessages([]);
                                    // Disconnect WebSocket when conversation is closed
                                    disconnectWebSocket();
                                }
                            } else {
                                console.warn("Status update received but no status field:", statusData);
                            }
                        } catch (error) {
                            console.error("Error parsing WebSocket status update:", error);
                            console.error("Message body:", message.body);
                        }
                    });
                    
                    if (statusSubscription) {
                        console.log("Status subscription successful for topic:", statusTopic);
                    } else {
                        console.error("Failed to subscribe to status topic:", statusTopic);
                    }
                    },
                    (error) => {
                        // Error callback
                        console.error("WebSocket connection error (Customer, old API):", error);
                        stompClientRef.current = null;
                    }
                );
            } else {
                console.warn("STOMP client not available");
                return;
            }
            
            stompClientRef.current = client;
            console.log("WebSocket client stored (Customer) for conversation:", conversationId);
        } catch (error) {
            console.error("Error connecting to WebSocket:", error);
        }
    };

    const disconnectWebSocket = () => {
        if (stompClientRef.current) {
            console.log("Disconnecting WebSocket (Customer) for conversation:", conversationId);
            try {
                if (stompClientRef.current.deactivate) {
                    stompClientRef.current.deactivate();
                } else if (stompClientRef.current.disconnect) {
                    stompClientRef.current.disconnect();
                }
                console.log("WebSocket disconnected successfully (Customer)");
            } catch (error) {
                console.error("Error disconnecting WebSocket:", error);
            }
            stompClientRef.current = null;
        }
    };

    // Helper function to save messages to localStorage
    const saveMessagesToLocalStorage = (messagesToSave, convId) => {
        if (!convId) return;
        try {
            // Filter out temporary messages before saving
            const messagesToStore = messagesToSave.filter(msg => !msg.isTemporary);
            const messagesKey = `support_messages_${convId}`;
            localStorage.setItem(messagesKey, JSON.stringify(messagesToStore));
            console.log("Saved messages to localStorage:", messagesToStore.length, "messages for conversation", convId);
        } catch (error) {
            console.error("Error saving messages to localStorage:", error);
            // If storage is full, try to clear old conversations
            try {
                const keys = Object.keys(localStorage);
                const oldMessageKeys = keys.filter(key => key.startsWith("support_messages_"));
                // Keep only the current conversation's messages
                oldMessageKeys.forEach(key => {
                    if (key !== `support_messages_${convId}`) {
                        localStorage.removeItem(key);
                    }
                });
                // Retry saving
                const messagesToStore = messagesToSave.filter(msg => !msg.isTemporary);
                localStorage.setItem(`support_messages_${convId}`, JSON.stringify(messagesToStore));
            } catch (retryError) {
                console.error("Error retrying save to localStorage:", retryError);
            }
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
        
        // Check localStorage first for existing conversation
        const savedConversationId = localStorage.getItem("support_conversation_id");
        const savedConversationStatus = localStorage.getItem("support_conversation_status");
        
        // If we have a saved conversation that's not closed, use it
        if (savedConversationId && savedConversationStatus !== "CLOSED") {
            setConversationId(savedConversationId);
            setConversationStatus(savedConversationStatus || "OPEN");
            
            // Load saved messages from localStorage first (instant display)
            const savedMessagesKey = `support_messages_${savedConversationId}`;
            const savedMessages = localStorage.getItem(savedMessagesKey);
            if (savedMessages) {
                try {
                    const parsedMessages = JSON.parse(savedMessages);
                    if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
                        setMessages(parsedMessages);
                        console.log("Loaded cached messages from localStorage:", parsedMessages.length, "messages");
                    }
                } catch (error) {
                    console.error("Error parsing cached messages:", error);
                }
            }
            
            // Then load fresh messages from API
            await loadMessages(true);
            return;
        }
        
        // If current conversationId is closed or doesn't exist, start/get conversation
        if (!conversationId || conversationStatus === "CLOSED") {
            try {
                const token = localStorage.getItem("access_token");
                // Backend will return existing OPEN/CLAIMED conversation or create new one
                const response = await supportApi.startConversation(token ? null : guestToken);
                const convData = response.data?.data || response.data;
                setConversationId(convData.conversationId);
                setConversationStatus(convData.status || "OPEN");
                
                // Persist conversationId to localStorage (survives page refresh)
                localStorage.setItem("support_conversation_id", convData.conversationId);
                localStorage.setItem("support_conversation_status", convData.status || "OPEN");
                
                if (convData.guestToken) {
                    setGuestToken(convData.guestToken);
                    localStorage.setItem("guest_token", convData.guestToken);
                }
                // Load messages immediately after starting conversation
                await loadMessages(true);
            } catch (error) {
                // Detailed error logging
                console.error("=== CUSTOMER CHAT WIDGET - START CONVERSATION ERROR ===");
                console.error("Error object:", error);
                console.error("Error type:", typeof error);
                console.error("Error message:", error.message);
                console.error("Error response:", error.response);
                console.error("Error response status:", error.response?.status);
                console.error("Error response data:", error.response?.data);
                console.error("Error response data type:", typeof error.response?.data);
                console.error("Full error response:", JSON.stringify(error.response, null, 2));
                
                let errorMessage = "Failed to start conversation. Please try again.";
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
                        errorMessage = String(actualErrorData.error);
                    } else if (errorData?.message) {
                        console.log("ErrorData has message property:", errorData.message);
                        errorMessage = String(errorData.message);
                    } else if (errorData?.error) {
                        console.log("ErrorData has error property:", errorData.error);
                        errorMessage = String(errorData.error);
                    } else {
                        console.log("Using fallback - converting to JSON string");
                        errorMessage = typeof actualErrorData === "object" 
                            ? JSON.stringify(actualErrorData) 
                            : String(actualErrorData || "Failed to start conversation. Please try again.");
                    }
                } else if (error.message) {
                    console.log("Using error.message:", error.message);
                    errorMessage = String(error.message);
                }
                
                console.log("Final error message:", errorMessage);
                console.log("Final error message type:", typeof errorMessage);
                console.log("=== END ERROR LOG ===");
                
                // Ensure errorMessage is always a string
                showError(String(errorMessage));
            }
        } else {
            // Load messages for existing conversation
            await loadMessages();
        }
    };

    // Note: Customers CANNOT close conversations - only support agents can close them
    // This ensures conversations remain open indefinitely until explicitly closed by an agent

    const handleStartNewConversation = async () => {
        // Clear old conversation from localStorage
        const oldConversationId = localStorage.getItem("support_conversation_id");
        if (oldConversationId) {
            localStorage.removeItem(`support_messages_${oldConversationId}`);
        }
        localStorage.removeItem("support_conversation_id");
        localStorage.removeItem("support_conversation_status");
        setConversationId(null);
        setConversationStatus(null);
        setMessages([]);
        await handleOpenChat();
    };

    const loadMessages = async (isInitialLoad = true) => {
        if (!conversationId) return;
        // Only show loading state on initial load
        if (isInitialLoad) {
            setLoadingMessages(true);
        }
        try {
            const token = localStorage.getItem("access_token");
            const response = await supportApi.getMessages(conversationId, token ? null : guestToken);
            const messagesData = response.data?.data || response.data || [];
            const allMessages = Array.isArray(messagesData) ? messagesData : [];
            
            setMessages((prevMessages) => {
                let finalMessages;
                if (prevMessages.length === 0 || isInitialLoad) {
                    // Initial load: replace all messages
                    finalMessages = allMessages;
                } else {
                    // Polling: merge only new messages (silent update)
                    // Remove temporary messages
                    const withoutTemp = prevMessages.filter(msg => !msg.isTemporary);
                    
                    // Create a map of existing message IDs for quick lookup
                    const existingIds = new Set(withoutTemp.map(msg => msg.messageId));
                    
                    // Add only new messages that don't exist in current list
                    const newMessages = allMessages.filter(msg => !existingIds.has(msg.messageId));
                    
                    if (newMessages.length === 0) {
                        return prevMessages; // No new messages, keep existing
                    }
                    
                    console.log(`Polling (Customer): Found ${newMessages.length} new message(s)`);
                    
                    // Merge: existing messages + new messages, sorted by createdAt
                    const merged = [...withoutTemp, ...newMessages];
                    finalMessages = merged.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                }
                
                // Save to localStorage whenever messages are loaded
                saveMessagesToLocalStorage(finalMessages, conversationId);
                return finalMessages;
            });
        } catch (error) {
            console.error("Error loading messages:", error);
            
            // Check if conversation not found
            const errorData = error.response?.data;
            const actualErrorData = errorData?.data || errorData;
            const errorMessage = typeof actualErrorData === "string" 
                ? actualErrorData 
                : actualErrorData?.message || actualErrorData?.error || error.message || "";
            
            const isConversationNotFound = String(errorMessage).toLowerCase().includes("conversation not found") || 
                                          String(errorMessage).toLowerCase().includes("not found");
            
            // If error says conversation is closed, update status
            if (String(errorMessage).includes("closed")) {
                setConversationStatus("CLOSED");
            }
            
            // If conversation not found, clear it and let user start new one
            if (isConversationNotFound) {
                console.log("Conversation not found in loadMessages, clearing invalid conversation");
                const oldConversationId = localStorage.getItem("support_conversation_id");
                if (oldConversationId) {
                    localStorage.removeItem(`support_messages_${oldConversationId}`);
                }
                localStorage.removeItem("support_conversation_id");
                localStorage.removeItem("support_conversation_status");
                setConversationId(null);
                setConversationStatus(null);
                setMessages([]);
            }
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        // Don't allow sending messages if conversation is CLOSED
        // For OPEN status, backend will handle the check (allows first message, blocks subsequent ones)
        if (!messageText.trim() || !conversationId || conversationStatus === "CLOSED") {
            return;
        }

        setSendingMessage(true);
        const messageToSend = messageText.trim();
        setMessageText(""); // Clear input immediately
        
        // Optimistic update: Add temporary message immediately
        const tempMessageId = `temp_${Date.now()}_${Math.random()}`;
        const optimisticMessage = {
            messageId: tempMessageId,
            conversationId: conversationId,
            senderType: localStorage.getItem("access_token") ? "CUSTOMER" : "GUEST",
            senderId: localStorage.getItem("access_token") ? null : guestToken,
            type: "TEXT",
            text: messageToSend,
            createdAt: new Date().toISOString(),
            isTemporary: true
        };
        
        setMessages((prevMessages) => {
            const updated = [...prevMessages, optimisticMessage];
            const sorted = updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            // Don't save temporary messages to localStorage, they'll be replaced by real ones
            return sorted;
        });
        
        try {
            const token = localStorage.getItem("access_token");
            const response = await supportApi.sendText(conversationId, messageToSend, token ? null : guestToken);
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
            // Remove temporary message on error
            setMessages((prevMessages) => {
                return prevMessages.filter(msg => msg.messageId !== tempMessageId);
            });
            
            // Detailed error logging
            console.error("=== CUSTOMER CHAT WIDGET - SEND MESSAGE ERROR ===");
            console.error("Error object:", error);
            console.error("Error type:", typeof error);
            console.error("Error message:", error.message);
            console.error("Error response:", error.response);
            console.error("Error response status:", error.response?.status);
            console.error("Error response data:", error.response?.data);
            console.error("Error response data type:", typeof error.response?.data);
            console.error("Full error response:", JSON.stringify(error.response, null, 2));
            
            let errorMessage = "Failed to send message. Please try again.";
            let isConversationNotFound = false;
            
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
                    if (actualErrorData.includes("closed")) {
                        setConversationStatus("CLOSED");
                    }
                    if (actualErrorData.toLowerCase().includes("conversation not found") || 
                        actualErrorData.toLowerCase().includes("not found")) {
                        isConversationNotFound = true;
                    }
                } else if (actualErrorData?.message) {
                    console.log("Error has message property:", actualErrorData.message);
                    errorMessage = String(actualErrorData.message);
                    if (String(actualErrorData.message).includes("closed")) {
                        setConversationStatus("CLOSED");
                    }
                    if (String(actualErrorData.message).toLowerCase().includes("conversation not found") || 
                        String(actualErrorData.message).toLowerCase().includes("not found")) {
                        isConversationNotFound = true;
                    }
                } else if (actualErrorData?.error) {
                    console.log("Error has error property:", actualErrorData.error);
                    // If error is an object, extract message from it
                    if (typeof actualErrorData.error === "object" && actualErrorData.error.message) {
                        errorMessage = String(actualErrorData.error.message);
                        if (String(actualErrorData.error.message).includes("closed")) {
                            setConversationStatus("CLOSED");
                        }
                        if (String(actualErrorData.error.message).toLowerCase().includes("conversation not found") || 
                            String(actualErrorData.error.message).toLowerCase().includes("not found")) {
                            isConversationNotFound = true;
                        }
                    } else {
                        errorMessage = String(actualErrorData.error);
                        if (String(actualErrorData.error).includes("closed")) {
                            setConversationStatus("CLOSED");
                        }
                        if (String(actualErrorData.error).toLowerCase().includes("conversation not found") || 
                            String(actualErrorData.error).toLowerCase().includes("not found")) {
                            isConversationNotFound = true;
                        }
                    }
                } else if (errorData?.message) {
                    console.log("ErrorData has message property:", errorData.message);
                    errorMessage = String(errorData.message);
                    if (String(errorData.message).toLowerCase().includes("conversation not found") || 
                        String(errorData.message).toLowerCase().includes("not found")) {
                        isConversationNotFound = true;
                    }
                } else if (errorData?.error) {
                    console.log("ErrorData has error property:", errorData.error);
                    // If error is an object, extract message from it
                    if (typeof errorData.error === "object" && errorData.error.message) {
                        errorMessage = String(errorData.error.message);
                        if (String(errorData.error.message).toLowerCase().includes("conversation not found") || 
                            String(errorData.error.message).toLowerCase().includes("not found")) {
                            isConversationNotFound = true;
                        }
                    } else {
                        errorMessage = String(errorData.error);
                        if (String(errorData.error).toLowerCase().includes("conversation not found") || 
                            String(errorData.error).toLowerCase().includes("not found")) {
                            isConversationNotFound = true;
                        }
                    }
                } else {
                    console.log("Using fallback - converting to JSON string");
                    // Fallback: convert object to readable string
                    errorMessage = typeof actualErrorData === "object" 
                        ? JSON.stringify(actualErrorData) 
                        : String(actualErrorData || "Failed to send message. Please try again.");
                }
            } else if (error.message) {
                console.log("Using error.message:", error.message);
                errorMessage = String(error.message);
                if (String(error.message).toLowerCase().includes("conversation not found") || 
                    String(error.message).toLowerCase().includes("not found")) {
                    isConversationNotFound = true;
                }
            }
            
            console.log("Final error message:", errorMessage);
            console.log("Final error message type:", typeof errorMessage);
            console.log("Is conversation not found:", isConversationNotFound);
            console.log("=== END ERROR LOG ===");
            
            // If conversation not found, create a new one and retry
            if (isConversationNotFound) {
                console.log("Conversation not found, creating new conversation and retrying...");
                try {
                    // Clear invalid conversation from localStorage
                    const oldConversationId = localStorage.getItem("support_conversation_id");
                    if (oldConversationId) {
                        localStorage.removeItem(`support_messages_${oldConversationId}`);
                    }
                    localStorage.removeItem("support_conversation_id");
                    localStorage.removeItem("support_conversation_status");
                    
                    // Create new conversation
                    const token = localStorage.getItem("access_token");
                    const response = await supportApi.startConversation(token ? null : guestToken);
                    const convData = response.data?.data || response.data;
                    const newConversationId = convData.conversationId;
                    
                    // Update state
                    setConversationId(newConversationId);
                    setConversationStatus(convData.status || "OPEN");
                    
                    // Persist new conversationId
                    localStorage.setItem("support_conversation_id", newConversationId);
                    localStorage.setItem("support_conversation_status", convData.status || "OPEN");
                    
                    if (convData.guestToken) {
                        setGuestToken(convData.guestToken);
                        localStorage.setItem("guest_token", convData.guestToken);
                    }
                    
                    // Retry sending the message with new conversationId
                    console.log("Retrying message send with new conversation:", newConversationId);
                    const retryResponse = await supportApi.sendText(newConversationId, messageToSend, token ? null : guestToken);
                    console.log("Message sent successfully after retry");
                    
                    // Add optimistic message again since we cleared it
                    const retryTempMessageId = `temp_${Date.now()}_${Math.random()}`;
                    const retryOptimisticMessage = {
                        messageId: retryTempMessageId,
                        conversationId: newConversationId,
                        senderType: token ? "CUSTOMER" : "GUEST",
                        senderId: token ? null : guestToken,
                        type: "TEXT",
                        text: messageToSend,
                        createdAt: new Date().toISOString(),
                        isTemporary: true
                    };
                    
                    setMessages((prevMessages) => {
                        const updated = [...prevMessages, retryOptimisticMessage];
                        const sorted = updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                        // Don't save temporary messages to localStorage, they'll be replaced by real ones
                        return sorted;
                    });
                    
                    // WebSocket will replace the temporary message with the real one
                    setTimeout(() => {
                        setMessages((prevMessages) => {
                            const stillTemp = prevMessages.find(msg => msg.messageId === retryTempMessageId);
                            if (stillTemp) {
                                console.warn("Temporary message not replaced by WebSocket, removing:", retryTempMessageId);
                                return prevMessages.filter(msg => msg.messageId !== retryTempMessageId);
                            }
                            return prevMessages;
                        });
                    }, 3000);
                    
                    // WebSocket will automatically reconnect via useEffect when conversationId changes
                    // No need to manually reconnect here
                    
                    showSuccess("Conversation recreated. Message sent!");
                    return; // Success, exit early
                } catch (retryError) {
                    console.error("Error creating new conversation and retrying:", retryError);
                    // Restore message text for user to try again
                    setMessageText(messageToSend);
                    showError("Failed to recreate conversation. Please try again.");
                }
            } else {
                // Restore message text for other errors
                setMessageText(messageToSend);
                // Ensure errorMessage is always a string
                showError(String(errorMessage));
            }
        } finally {
            setSendingMessage(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !conversationId) return;
        
        // Don't allow uploading files if conversation is CLOSED
        // For OPEN status, backend will handle the check
        if (conversationStatus === "CLOSED") {
            return;
        }

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
                    const sorted = updated.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                    // Save to localStorage
                    saveMessagesToLocalStorage(sorted, conversationId);
                    return sorted;
                });
            }
            
            showSuccess("File uploaded successfully!");
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
            // Don't reload messages - WebSocket will handle new messages
        } catch (error) {
            // Detailed error logging
            console.error("=== CUSTOMER CHAT WIDGET - FILE UPLOAD ERROR ===");
            console.error("Error object:", error);
            console.error("Error type:", typeof error);
            console.error("Error message:", error.message);
            console.error("Error response:", error.response);
            console.error("Error response status:", error.response?.status);
            console.error("Error response data:", error.response?.data);
            console.error("Error response data type:", typeof error.response?.data);
            console.error("Full error response:", JSON.stringify(error.response, null, 2));
            console.log("=== END ERROR LOG ===");
            
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
                                            {msg.senderType === "CUSTOMER" || msg.senderType === "GUEST" 
                                                ? "You" 
                                                : (msg.senderId ? "Support Agent" : "Support Team")}
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
                            <div style={{ 
                                padding: "0.75rem 1rem", 
                                background: "#fee", 
                                color: "#c53030", 
                                borderRadius: "4px", 
                                fontSize: "0.85rem",
                                textAlign: "center",
                                fontWeight: 500
                            }}>
                                This conversation has been closed by a support agent. You can start a new conversation below.
                            </div>
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
                            {/* Note: Customers cannot close conversations - only support agents can */}
                        </form>
                    )}
                </div>
            )}
        </>
    );
}
