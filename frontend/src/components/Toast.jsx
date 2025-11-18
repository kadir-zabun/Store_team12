import { useEffect } from "react";
import { useToast } from "../contexts/ToastContext";

export default function Toast() {
    const { toasts, removeToast } = useToast();

    return (
        <div
            style={{
                position: "fixed",
                top: "20px",
                right: "20px",
                zIndex: 10000,
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                maxWidth: "400px",
            }}
        >
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
            ))}
        </div>
    );
}

function ToastItem({ toast, onClose }) {
    useEffect(() => {
        if (toast.duration > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, toast.duration);
            return () => clearTimeout(timer);
        }
    }, [toast.duration, onClose]);

    const getStyles = () => {
        const baseStyle = {
            padding: "1rem 1.25rem",
            borderRadius: "12px",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            minWidth: "300px",
            maxWidth: "400px",
            animation: "slideInRight 0.3s ease-out",
            cursor: "pointer",
            transition: "all 0.2s",
        };

        switch (toast.type) {
            case "success":
                return {
                    ...baseStyle,
                    background: "#c6f6d5",
                    color: "#22543d",
                    border: "1px solid #9ae6b4",
                };
            case "error":
                return {
                    ...baseStyle,
                    background: "#fed7d7",
                    color: "#c53030",
                    border: "1px solid #fc8181",
                };
            case "warning":
                return {
                    ...baseStyle,
                    background: "#feebc8",
                    color: "#c05621",
                    border: "1px solid #fbd38d",
                };
            case "info":
            default:
                return {
                    ...baseStyle,
                    background: "#bee3f8",
                    color: "#2c5282",
                    border: "1px solid #90cdf4",
                };
        }
    };

    const getIcon = () => {
        switch (toast.type) {
            case "success":
                return "✅";
            case "error":
                return "❌";
            case "warning":
                return "⚠️";
            case "info":
            default:
                return "ℹ️";
        }
    };

    return (
        <>
            <style>{`
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `}</style>
            <div
                style={getStyles()}
                onClick={onClose}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateX(-5px)";
                    e.currentTarget.style.boxShadow = "0 12px 30px rgba(0, 0, 0, 0.25)";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateX(0)";
                    e.currentTarget.style.boxShadow = "0 10px 25px rgba(0, 0, 0, 0.2)";
                }}
            >
                <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>{getIcon()}</span>
                <span style={{ flex: 1, fontSize: "0.95rem", fontWeight: 500, lineHeight: "1.4" }}>
                    {toast.message}
                </span>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    style={{
                        background: "transparent",
                        border: "none",
                        color: "inherit",
                        fontSize: "1.25rem",
                        cursor: "pointer",
                        padding: "0",
                        width: "24px",
                        height: "24px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: 0.7,
                        transition: "opacity 0.2s",
                        flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = "1";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = "0.7";
                    }}
                >
                    ×
                </button>
            </div>
        </>
    );
}

