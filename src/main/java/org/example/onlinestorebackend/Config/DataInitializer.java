package org.example.onlinestorebackend.Config;

import lombok.RequiredArgsConstructor;
import org.example.onlinestorebackend.Entity.User;
import org.example.onlinestorebackend.Repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.UUID;

/**
 * Uygulama başladığında gerekli default kullanıcıları oluşturur.
 */
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        createSalesManagerIfNotExists();
    }

    private void createSalesManagerIfNotExists() {
        String email = "salesmanager@gmail.com";
        String username = "salesmanager";

        // Eğer kullanıcı zaten varsa, oluşturma
        if (userRepository.findByEmail(email).isPresent() || 
            userRepository.findByUsername(username).isPresent()) {
            System.out.println("Sales Manager kullanıcısı zaten mevcut: " + email);
            return;
        }

        // Yeni Sales Manager kullanıcısı oluştur
        User salesManager = new User();
        salesManager.setUserId(UUID.randomUUID().toString());
        salesManager.setName("Sales Manager");
        salesManager.setUsername(username);
        salesManager.setEmail(email);
        salesManager.setPassword(passwordEncoder.encode("sale123"));
        salesManager.setRole("SALES_MANAGER");
        salesManager.setOrderNo(new ArrayList<>());

        userRepository.save(salesManager);
        System.out.println("Sales Manager kullanıcısı oluşturuldu:");
        System.out.println("  Email: " + email);
        System.out.println("  Username: " + username);
        System.out.println("  Password: sale123");
        System.out.println("  Role: SALES_MANAGER");
    }
}

