package org.example.onlinestorebackend.Service;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Service;

import java.lang.reflect.Method;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Slf4j
@Service
public class MailService {

    private final String frontendBaseUrl;
    private final String mailFrom;
    private final ApplicationContext applicationContext;
    private Object mailSender;

    public MailService(
            @Value("${app.frontend-base-url:http://localhost:5173}") String frontendBaseUrl,
            @Value("${spring.mail.username:}") String mailFrom,
            ApplicationContext applicationContext) {
        this.frontendBaseUrl = frontendBaseUrl;
        this.mailFrom = mailFrom;
        this.applicationContext = applicationContext;
    }

    @PostConstruct
    public void init() {
        try {
            Class<?> mailSenderClass = Class.forName("org.springframework.mail.javamail.JavaMailSender");
            String[] beanNames = applicationContext.getBeanNamesForType(mailSenderClass);
            if (beanNames.length > 0) {
                mailSender = applicationContext.getBean(beanNames[0]);
                log.info("JavaMailSender initialized successfully - Email sending enabled");
            } else {
                log.warn("JavaMailSender bean not found. Check email configuration in application.properties");
                log.warn("Required properties: spring.mail.host, spring.mail.port, spring.mail.username, spring.mail.password");
            }
        } catch (Exception e) {
            log.warn("Failed to initialize JavaMailSender: {}", e.getMessage());
        }
    }

    public String sendPasswordResetLink(String email, String token) {
        String link = frontendBaseUrl + "/reset-password?token=" +
                URLEncoder.encode(token, StandardCharsets.UTF_8);

        if (mailSender != null) {
            try {
                log.info("Attempting to send password reset email to: {}", email);
                
                Class<?> simpleMailMessageClass = Class.forName("org.springframework.mail.SimpleMailMessage");
                Object msg = simpleMailMessageClass.getDeclaredConstructor().newInstance();
                
                Method setFrom = simpleMailMessageClass.getMethod("setFrom", String.class);
                Method setTo = simpleMailMessageClass.getMethod("setTo", String.class);
                Method setSubject = simpleMailMessageClass.getMethod("setSubject", String.class);
                Method setText = simpleMailMessageClass.getMethod("setText", String.class);
                
                String fromEmail = mailFrom != null && !mailFrom.isEmpty() ? mailFrom : "noreply@store.com";
                setFrom.invoke(msg, fromEmail);
                setTo.invoke(msg, email);
                setSubject.invoke(msg, "Reset Your Password - Store");
                setText.invoke(msg, "Hello,\n\n" +
                        "You requested to reset your password. Click the link below to reset it:\n\n" +
                        link + "\n\n" +
                        "Or copy and paste the link into your browser if the link doesn't work.\n\n" +
                        "This link will expire in 1 hour.\n\n" +
                        "If you didn't request this, please ignore this email.\n\n" +
                        "Best regards,\nStore Team");
                
                log.info("Sending email via JavaMailSender...");
                Class<?> mailSenderInterface = Class.forName("org.springframework.mail.javamail.JavaMailSender");
                Method sendMethod = mailSenderInterface.getMethod("send", simpleMailMessageClass);
                sendMethod.invoke(mailSender, msg);
                
                log.info("Password reset email sent successfully to: {}", email);
            } catch (Exception e) {
                log.error("Failed to send email to {}: {}", email, e.getMessage());
                log.error("Exception details: ", e);
                if (e.getCause() != null) {
                    log.error("Caused by: {}", e.getCause().getMessage());
                }
                log.info("[FALLBACK] Password reset link for {} -> {}", email, link);
            }
        } else {
            log.warn("JavaMailSender not configured. Password reset link for {} -> {}", email, link);
        }
        
        return link;
    }
}
