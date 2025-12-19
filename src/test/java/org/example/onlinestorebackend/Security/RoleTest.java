package org.example.onlinestorebackend.Security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class RoleTest {

    @Test
    void from_nullOrBlank_defaultsToCustomer() {
        assertEquals(Role.CUSTOMER, Role.from(null));
        assertEquals(Role.CUSTOMER, Role.from(""));
        assertEquals(Role.CUSTOMER, Role.from("   "));
    }

    @Test
    void from_productOwner_mapsToProductManager() {
        assertEquals(Role.PRODUCT_MANAGER, Role.from("PRODUCT_OWNER"));
        assertEquals(Role.PRODUCT_MANAGER, Role.from("product_owner"));
    }

    @Test
    void from_validRole_parses() {
        assertEquals(Role.SALES_MANAGER, Role.from("SALES_MANAGER"));
        assertEquals(Role.SUPPORT_AGENT, Role.from("support_agent"));
    }
}


