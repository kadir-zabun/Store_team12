package org.example.onlinestorebackend.Service;

import org.example.onlinestorebackend.Dto.AuthenticationResponse;
import org.example.onlinestorebackend.Dto.LoginDto;
import org.example.onlinestorebackend.Dto.RegisterDto;
import org.example.onlinestorebackend.Entity.User;
import org.example.onlinestorebackend.Repository.UserRepository;
import org.example.onlinestorebackend.Security.Role;
import org.example.onlinestorebackend.Util.JwtUtil;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service
public class AuthenticationService {

    private final UserRepository userRepository;

    private final PasswordEncoder passwordEncoder;

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserDetailsServiceImpl userDetailsService;

    public AuthenticationService(
            UserRepository userRepository,
            AuthenticationManager authenticationManager,
            PasswordEncoder passwordEncoder,
            JwtUtil jwtUtil,
            UserDetailsServiceImpl userDetailsService) {
        this.userRepository = userRepository;
        this.authenticationManager = authenticationManager;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.userDetailsService = userDetailsService;
    }

    public User register(RegisterDto input) {
        if (!input.getPassword().equals(input.getConfirmPassword())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Password and confirm password do not match"
            );
        }

        if (userRepository.findByUsername(input.getUsername()).isPresent()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "username already taken"
            );
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
        user.setTaxId(input.getTaxId());
        user.setHomeAddress(input.getHomeAddress());

        // Role validation + backwards compatibility (e.g. PRODUCT_OWNER -> PRODUCT_MANAGER)
        try {
            Role role = Role.from(input.getRole());
            user.setRole(role.name());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid role. Allowed roles: CUSTOMER, SALES_MANAGER, PRODUCT_MANAGER, SUPPORT_AGENT"
            );
        }

        return userRepository.save(user);
    }

    public AuthenticationResponse authenticate(LoginDto request) {
        Optional<User> optionalUser = userRepository.findByEmail(request.getUsernameOrEmail());
        if (optionalUser.isEmpty()) {
            optionalUser = userRepository.findByUsername(request.getUsernameOrEmail());
        }

        if (optionalUser.isPresent()) {
            User user = optionalUser.get();

            // şifre doğrulama
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(user.getUsername(), request.getPassword())
            );

            // token üret (şimdilik JWT sadece username içeriyor; rol bilgisi ayrı field olarak döndürülüyor)
            UserDetails userDetails = userDetailsService.loadUserByUsername(user.getUsername());
            String token = jwtUtil.generateToken(userDetails); // süresiz tek token

            // refreshTokenService ve benzeri akışlar kaldırıldı
            return new AuthenticationResponse(token, user.getRole() != null ? user.getRole() : "CUSTOMER");
        }

        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Kullanıcı bulunamadı.");
    }
}