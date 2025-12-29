import { useState, useRef, useEffect } from "react";

export default function CustomSelect({ 
    value, 
    onChange, 
    options, 
    placeholder = "Select...",
    style = {},
    minWidth = "150px"
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [hoveredIndex, setHoveredIndex] = useState(-1);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setHoveredIndex(-1);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const selectedOption = options.find(opt => opt.value === value) || { label: placeholder, value: "" };

    const handleSelect = (optionValue) => {
        onChange({ target: { value: optionValue } });
        setIsOpen(false);
        setHoveredIndex(-1);
    };

    return (
        <div ref={dropdownRef} style={{ position: "relative", minWidth, ...style }}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "4px",
                    border: "2px solid #e2e8f0",
                    fontSize: "0.85rem",
                    outline: "none",
                    cursor: "pointer",
                    background: "#fff",
                    color: "#2d3748",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "all 0.2s",
                    textAlign: "left",
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#667eea";
                }}
                onMouseLeave={(e) => {
                    if (!isOpen) {
                        e.currentTarget.style.borderColor = "#e2e8f0";
                    }
                }}
            >
                <span>{selectedOption.label}</span>
                <span style={{ fontSize: "0.7rem", marginLeft: "0.5rem" }}>
                    {isOpen ? "▲" : "▼"}
                </span>
            </button>

            {isOpen && (
                <div
                    style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        marginTop: "0.25rem",
                        background: "#fff",
                        border: "2px solid #e2e8f0",
                        borderRadius: "4px",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                        zIndex: 1000,
                        maxHeight: "300px",
                        overflowY: "auto",
                    }}
                >
                    {options.map((option, index) => (
                        <div
                            key={option.value}
                            onClick={() => !option.disabled && handleSelect(option.value)}
                            style={{
                                padding: "0.6rem 0.75rem",
                                cursor: option.disabled ? "not-allowed" : "pointer",
                                background: option.disabled 
                                    ? "#f7fafc" 
                                    : hoveredIndex === index 
                                        ? "#667eea" 
                                        : value === option.value 
                                            ? "#f0f4ff" 
                                            : "#fff",
                                color: option.disabled
                                    ? "#a0aec0"
                                    : hoveredIndex === index 
                                        ? "#fff" 
                                        : value === option.value 
                                            ? "#667eea" 
                                            : "#2d3748",
                                borderBottom: index < options.length - 1 ? "1px solid #f1f5f9" : "none",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                transition: "all 0.2s",
                                fontWeight: value === option.value ? 600 : 400,
                                opacity: option.disabled ? 0.6 : 1,
                                fontSize: "0.85rem",
                            }}
                            onMouseEnter={() => !option.disabled && setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(-1)}
                        >
                            {value === option.value && !option.disabled && (
                                <span style={{ fontSize: "0.8rem" }}>✓</span>
                            )}
                            <span>{option.label}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

