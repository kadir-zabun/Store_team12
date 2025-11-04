package org.example.onlinestorebackend.Dto;

import lombok.Data;

@Data
public class RegisterDto {
    private String name;
    private String password;
    private String confirmPassword;
    private String email;
    private String username;
}
