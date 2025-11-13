package org.example.onlinestorebackend.Controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.onlinestorebackend.Dto.PasswordResetRequestDto;
import org.example.onlinestorebackend.Service.PasswordResetService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class PasswordResetController {

    private final PasswordResetService passwordResetService;

    @PostMapping("/password-reset")
    public ResponseEntity<Void> requestPasswordReset(
            @Valid @RequestBody PasswordResetRequestDto dto) {

        passwordResetService.requestReset(dto.getEmail());
        return ResponseEntity.noContent().build();
    }
}
