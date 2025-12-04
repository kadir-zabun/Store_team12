import { useState, useEffect } from "react";

/**
 * Hook to get and manage user role from localStorage
 * @returns {string|null} The user's role (CUSTOMER, PRODUCT_OWNER) or null if not logged in
 */
export function useUserRole() {
    const [role, setRole] = useState(() => {
        return localStorage.getItem("user_role") || null;
    });

    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === "user_role" || e.key === null) {
                setRole(localStorage.getItem("user_role") || null);
            }
        };

        const handleTokenSet = () => {
            setRole(localStorage.getItem("user_role") || null);
        };

        window.addEventListener("storage", handleStorageChange);
        window.addEventListener("tokenSet", handleTokenSet);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("tokenSet", handleTokenSet);
        };
    }, []);

    return role;
}

