package org.example.onlinestorebackend.Security;

import java.util.Locale;

/**
 * System roles (Spring Security authority format: ROLE_{ROLE_NAME}).
 */
public enum Role {
    CUSTOMER,
    SALES_MANAGER,
    PRODUCT_MANAGER,
    SUPPORT_AGENT;

    /**
     * Accepts legacy aliases (e.g. PRODUCT_OWNER) and normalizes to a Role.
     */
    public static Role from(String raw) {
        if (raw == null || raw.isBlank()) {
            return CUSTOMER;
        }
        String normalized = raw.trim().toUpperCase(Locale.ROOT);

        // Backwards compatibility with existing frontend/backend naming
        if ("PRODUCT_OWNER".equals(normalized)) {
            return PRODUCT_MANAGER;
        }

        return Role.valueOf(normalized);
    }
}


