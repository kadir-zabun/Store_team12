package org.example.onlinestorebackend.Service;

import org.example.onlinestorebackend.Dto.RegisterDto;
import org.example.onlinestorebackend.Entity.User;
import org.example.onlinestorebackend.Repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.UUID;

@Service
public class AuthenticationService {

    private UserRepository userRepository;

    private PasswordEncoder passwordEncoder;


    public User register(RegisterDto input) {
        if (!input.getPassword().equals(input.getConfirmPassword())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Password and confirm password do not match"
            );
        }

        if (userRepository.findByUsername(input.getUsername()).isPresent()) {
            // 403 (frontend'in beklentisini bozmayalım)
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "username already taken"
            );
            // (doğrusu 409 Conflict olurdu ama frontend şu an 403 bekliyor)
        }

        if (userRepository.findByEmail(input.getEmail()).isPresent()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "email already taken"
            );
        }

        User user = new User();
        user.setUserId(UUID.randomUUID().toString());
        user.setUsername(input.getUsername());
        user.setEmail(input.getEmail());
        user.setPassword(passwordEncoder.encode(input.getPassword()));
        user.setName(input.getName());
        user.setOrderNo(new ArrayList<>());

        return userRepository.save(user);
    }


}
