package org.example.onlinestorebackend.Controller;


import org.example.onlinestorebackend.Dto.AuthenticationResponse;
import org.example.onlinestorebackend.Dto.LoginDto;
import org.example.onlinestorebackend.Dto.RegisterDto;
import org.example.onlinestorebackend.Entity.User;
import org.example.onlinestorebackend.Service.AuthenticationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthenticationController {

    @Autowired
    private AuthenticationService authenticationService;

    public AuthenticationController(AuthenticationService authenticationService) {
        this.authenticationService = authenticationService;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthenticationResponse> login(@RequestBody LoginDto request) {
        return ResponseEntity.ok(authenticationService.authenticate(request));
    }

    @PostMapping("/register")
    public ResponseEntity<User> register(@RequestBody RegisterDto request) {
        User user = authenticationService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(user);
    }
}