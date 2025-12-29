import { useState, useEffect } from "react";

/**
 * Hook to get and manage user role from localStorage
 * @returns {string|null} The user's role (CUSTOMER, PRODUCT_MANAGER) or null if not logged in
 */
export function useUserRole() {
    const [role, setRole] = useState(() => {
        return localStorage.getItem("user_role") || null;
    });

    useEffect(() => {
        // Immediately check localStorage on mount
        const currentRole = localStorage.getItem("user_role");
        if (currentRole !== role) {
            setRole(currentRole);
        }

        const handleStorageChange = (e) => {
            if (e.key === "user_role" || e.key === null) {
                setRole(localStorage.getItem("user_role") || null);
            }
        };

        const handleTokenSet = () => {
            const newRole = localStorage.getItem("user_role");
            setRole(newRole);
        };

        window.addEventListener("storage", handleStorageChange);
        window.addEventListener("tokenSet", handleTokenSet);

        // Also check periodically to catch any changes
        const intervalId = setInterval(() => {
            const currentRole = localStorage.getItem("user_role");
            if (currentRole !== role) {
                setRole(currentRole);
            }
        }, 500);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("tokenSet", handleTokenSet);
            clearInterval(intervalId);
        };
    }, [role]);

    return role;
}

