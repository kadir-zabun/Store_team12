import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext();

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = "info", duration = 4000) => {
        // Ensure message is always a string
        let messageStr;
        if (typeof message === 'string') {
            messageStr = message;
        } else if (message === null || message === undefined) {
            messageStr = 'Notification';
        } else if (typeof message === 'object') {
            // Log warning if object is passed
            console.warn("Toast received object instead of string:", message);
            messageStr = JSON.stringify(message);
        } else {
            messageStr = String(message);
        }
        
        const id = Date.now() + Math.random();
        const toast = { id, message: messageStr, type, duration };
        
        setToasts((prev) => [...prev, toast]);

        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }

        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const success = useCallback((message, duration) => {
        // Ensure message is always a string
        const messageStr = typeof message === 'string' ? message : String(message || 'Success');
        return showToast(messageStr, "success", duration);
    }, [showToast]);

    const error = useCallback((message, duration) => {
        // Ensure message is always a string
        const messageStr = typeof message === 'string' ? message : String(message || 'An error occurred');
        return showToast(messageStr, "error", duration);
    }, [showToast]);

    const info = useCallback((message, duration) => {
        // Ensure message is always a string
        const messageStr = typeof message === 'string' ? message : String(message || 'Info');
        return showToast(messageStr, "info", duration);
    }, [showToast]);

    const warning = useCallback((message, duration) => {
        // Ensure message is always a string
        const messageStr = typeof message === 'string' ? message : String(message || 'Warning');
        return showToast(messageStr, "warning", duration);
    }, [showToast]);

    return (
        <ToastContext.Provider value={{ toasts, showToast, removeToast, success, error, info, warning }}>
            {children}
        </ToastContext.Provider>
    );
};

