package org.example.onlinestorebackend.Controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.onlinestorebackend.Dto.PasswordResetRequestDto;
import org.example.onlinestorebackend.Dto.PasswordResetDto;
import org.example.onlinestorebackend.Dto.PasswordResetResponseDto;
import org.example.onlinestorebackend.Service.PasswordResetService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class PasswordResetController {

    private final PasswordResetService passwordResetService;

    @PostMapping("/password-reset")
    public ResponseEntity<PasswordResetResponseDto> requestPasswordReset(
            @Valid @RequestBody PasswordResetRequestDto dto) {

        String resetLink = passwordResetService.requestReset(dto.getEmail());
        PasswordResetResponseDto response = new PasswordResetResponseDto(
                resetLink,
                "Password reset link generated. Check your email or use the link below."
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(
            @Valid @RequestBody PasswordResetDto dto) {

        passwordResetService.resetPassword(dto.getToken(), dto.getNewPassword());
        return ResponseEntity.noContent().build();
    }
}
