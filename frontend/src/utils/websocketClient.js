import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

let client = null;

export const connectWebSocket = (onMessage, onError, token = null) => {
    if (client && client.connected) {
        return client;
    }

    // If client exists but not connected, deactivate it first
    if (client) {
        client.deactivate();
        client = null;
    }

    // Get base URL from axios client or use default
    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
    const socket = new SockJS(`${baseURL}/ws`);
    client = new Client({
        webSocketFactory: () => socket,
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        connectHeaders: token ? {
            Authorization: `Bearer ${token}`,
        } : {},
        onConnect: () => {
            console.log('WebSocket connected');
        },
        onStompError: (frame) => {
            console.error('STOMP error:', frame);
            if (onError) onError(frame);
        },
        onWebSocketClose: () => {
            console.log('WebSocket closed');
        },
        onDisconnect: () => {
            console.log('WebSocket disconnected');
        },
    });

    client.activate();
    return client;
};

export const disconnectWebSocket = () => {
    if (client && client.connected) {
        client.deactivate();
        client = null;
    }
};

export const subscribeToConversation = (client, conversationId, onMessage) => {
    if (!client || !client.connected) {
        console.error('WebSocket client not connected');
        return null;
    }

    const subscription = client.subscribe(`/topic/support/${conversationId}`, (message) => {
        try {
            const data = JSON.parse(message.body);
            onMessage(data);
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    });

    return subscription;
};

export const subscribeToQueue = (client, onMessage) => {
    if (!client || !client.connected) {
        console.error('WebSocket client not connected');
        return null;
    }

    const subscription = client.subscribe('/topic/support/queue', (message) => {
        try {
            const data = JSON.parse(message.body);
            onMessage(data);
        } catch (error) {
            console.error('Error parsing WebSocket queue message:', error);
        }
    });

    return subscription;
};

export const sendMessageViaWebSocket = (client, conversationId, text, guestToken = null) => {
    if (!client || !client.connected) {
        console.error('WebSocket client not connected');
        return false;
    }

    const destination = '/app/support/send-text';
    const payload = {
        conversationId,
        text,
        guestToken,
    };

    client.publish({
        destination,
        body: JSON.stringify(payload),
    });

    return true;
};

export const sendAgentMessageViaWebSocket = (client, conversationId, text) => {
    if (!client || !client.connected) {
        console.error('WebSocket client not connected');
        return false;
    }

    const destination = '/app/support/agent/send-text';
    const payload = {
        conversationId,
        text,
    };

    client.publish({
        destination,
        body: JSON.stringify(payload),
    });

    return true;
};

