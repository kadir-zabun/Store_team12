package org.example.onlinestorebackend.Dto;

import lombok.Data;

@Data
public class RegisterDto {
    private String name;
    private String password;
    private String confirmPassword;
    private String email;
    private String username;

    /**
     * İsteğe bağlı kullanıcı tipi:
     * - "CUSTOMER" (varsayılan)
     * - "PRODUCT_OWNER"
     * Frontend giriş ekranında seçilecektir.
     */
    private String role;
}
