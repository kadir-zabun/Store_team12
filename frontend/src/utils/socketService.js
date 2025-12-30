import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

class SocketService {
    constructor() {
        this.client = null;
        this.connected = false;
        this.subscriptions = new Map();
    }

    connect(token = null, onConnect = () => { }, onError = () => { }) {
        if (this.client && this.client.active) {
            onConnect();
            return;
        }

        const socketUrl = 'http://localhost:8080/ws';

        this.client = new Client({
            webSocketFactory: () => new SockJS(socketUrl),
            connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
            debug: function (str) {
                // console.log(str);
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        this.client.onConnect = (frame) => {
            this.connected = true;
            console.log('Connected: ' + frame);
            onConnect();

            // Resubscribe to existing subscriptions if any (after reconnect)
            this.subscriptions.forEach((callback, topic) => {
                this.subscribe(topic, callback);
            });
        };

        this.client.onStompError = (frame) => {
            console.error('Broker reported error: ' + frame.headers['message']);
            console.error('Additional details: ' + frame.body);
            onError(frame);
        };

        this.client.activate();
    }

    disconnect() {
        if (this.client) {
            this.client.deactivate();
            this.connected = false;
            this.client = null;
        }
    }

    subscribe(topic, callback) {
        if (!this.client || !this.connected) {
            // If not connected, store the subscription to process later or throw error
            // For now we just return null, but could queue it.
            // Better strategy: Add to map, and subscribe in onConnect.
            this.subscriptions.set(topic, callback);
            return null;
        }

        const subscription = this.client.subscribe(topic, (message) => {
            const body = JSON.parse(message.body);
            callback(body);
        });

        return subscription;
    }

    sendMessage(destination, body, headers = {}) {
        if (!this.client || !this.connected) {
            console.error('Cannot send message: not connected');
            return;
        }

        this.client.publish({
            destination: destination,
            body: JSON.stringify(body),
            headers: headers
        });
    }
}

const socketService = new SocketService();
export default socketService;
