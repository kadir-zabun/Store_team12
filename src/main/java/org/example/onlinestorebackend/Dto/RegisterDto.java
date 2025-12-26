package org.example.onlinestorebackend.Dto;

import lombok.Data;

@Data
public class RegisterDto {
    private String name;
    private String password;
    private String confirmPassword;
    private String email;
    private String username;
    private String taxId;
    private String homeAddress;

    /**
     * İsteğe bağlı kullanıcı tipi:
     * - "CUSTOMER" (varsayılan)
     * - "PRODUCT_MANAGER"
     * - "SALES_MANAGER"
     * - "SUPPORT_AGENT"
     *
     * Backwards compatibility:
     * - "PRODUCT_OWNER" -> "PRODUCT_MANAGER"
     */
    private String role;
}