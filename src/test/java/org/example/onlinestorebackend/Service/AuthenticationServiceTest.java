package org.example.onlinestorebackend.Service;

import org.example.onlinestorebackend.Dto.AuthenticationResponse;
import org.example.onlinestorebackend.Dto.LoginDto;
import org.example.onlinestorebackend.Dto.RegisterDto;
import org.example.onlinestorebackend.Entity.User;
import org.example.onlinestorebackend.Repository.UserRepository;
import org.example.onlinestorebackend.Util.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthenticationServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private UserDetailsServiceImpl userDetailsService;

    @InjectMocks
    private AuthenticationService authenticationService;

    private RegisterDto registerDto;
    private User user;
    private LoginDto loginDto;

    @BeforeEach
    void setUp() {
        registerDto = new RegisterDto();
        registerDto.setName("Test User");
        registerDto.setUsername("testuser");
        registerDto.setEmail("test@example.com");
        registerDto.setPassword("password123");
        registerDto.setConfirmPassword("password123");
        registerDto.setRole("CUSTOMER");

        user = new User();
        user.setUserId(UUID.randomUUID().toString());
        user.setUsername("testuser");
        user.setEmail("test@example.com");
        user.setPassword("encodedPassword");
        user.setName("Test User");
        user.setRole("CUSTOMER");
        user.setOrderNo(new ArrayList<>());

        loginDto = new LoginDto();
        loginDto.setUsernameOrEmail("test@example.com");
        loginDto.setPassword("password123");
    }

    @Test
    void register_validInput_returnsUser() {
        // Given
        when(userRepository.findByUsername(registerDto.getUsername())).thenReturn(Optional.empty());
        when(userRepository.findByEmail(registerDto.getEmail())).thenReturn(Optional.empty());
        when(passwordEncoder.encode(registerDto.getPassword())).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User savedUser = invocation.getArgument(0);
            savedUser.setUserId(UUID.randomUUID().toString());
            return savedUser;
        });

        // When
        User result = authenticationService.register(registerDto);

        // Then
        assertNotNull(result);
        assertEquals(registerDto.getUsername(), result.getUsername());
        assertEquals(registerDto.getEmail(), result.getEmail());
        assertEquals("CUSTOMER", result.getRole());
        verify(userRepository).findByUsername(registerDto.getUsername());
        verify(userRepository).findByEmail(registerDto.getEmail());
        verify(passwordEncoder).encode(registerDto.getPassword());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void register_passwordMismatch_throwsException() {
        // Given
        registerDto.setConfirmPassword("differentPassword");

        // When & Then
        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            authenticationService.register(registerDto);
        });

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertTrue(exception.getMessage().contains("Password and confirm password do not match"));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void register_usernameAlreadyTaken_throwsException() {
        // Given
        when(userRepository.findByUsername(registerDto.getUsername())).thenReturn(Optional.of(user));

        // When & Then
        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            authenticationService.register(registerDto);
        });

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
        assertTrue(exception.getMessage().contains("username already taken"));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void register_emailAlreadyTaken_throwsException() {
        // Given
        when(userRepository.findByUsername(registerDto.getUsername())).thenReturn(Optional.empty());
        when(userRepository.findByEmail(registerDto.getEmail())).thenReturn(Optional.of(user));

        // When & Then
        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            authenticationService.register(registerDto);
        });

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
        assertTrue(exception.getMessage().contains("email already taken"));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void authenticate_validCredentials_returnsAuthenticationResponse() {
        // Given
        when(userRepository.findByEmail(loginDto.getUsernameOrEmail())).thenReturn(Optional.of(user));
        when(userDetailsService.loadUserByUsername(user.getUsername())).thenReturn(mock(UserDetails.class));
        when(jwtUtil.generateToken(any(UserDetails.class))).thenReturn("jwt-token");

        // When
        AuthenticationResponse result = authenticationService.authenticate(loginDto);

        // Then
        assertNotNull(result);
        assertEquals("jwt-token", result.getToken());
        assertEquals("CUSTOMER", result.getRole());
        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(jwtUtil).generateToken(any(UserDetails.class));
    }

    @Test
    void authenticate_invalidCredentials_throwsException() {
        // Given
        when(userRepository.findByEmail(loginDto.getUsernameOrEmail())).thenReturn(Optional.empty());
        when(userRepository.findByUsername(loginDto.getUsernameOrEmail())).thenReturn(Optional.empty());

        // When & Then
        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            authenticationService.authenticate(loginDto);
        });

        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatusCode());
        assertTrue(exception.getMessage().contains("Kullanıcı bulunamadı"));
    }

    @Test
    void authenticate_badCredentials_throwsException() {
        // Given
        when(userRepository.findByEmail(loginDto.getUsernameOrEmail())).thenReturn(Optional.of(user));
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        // When & Then
        assertThrows(BadCredentialsException.class, () -> {
            authenticationService.authenticate(loginDto);
        });

        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(jwtUtil, never()).generateToken(any(UserDetails.class));
    }
}

