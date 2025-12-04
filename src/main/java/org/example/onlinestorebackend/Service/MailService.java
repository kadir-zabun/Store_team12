package org.example.onlinestorebackend.Service;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
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
                
                String fromEmail = mailFrom != null && !mailFrom.isEmpty() ? mailFrom : "noreply@teknosu.com";
                setFrom.invoke(msg, fromEmail);
                setTo.invoke(msg, email);
                setSubject.invoke(msg, "Reset Your Password - TeknoSU");
                setText.invoke(msg, "Hello,\n\n" +
                        "You requested to reset your password. Click the link below to reset it:\n\n" +
                        link + "\n\n" +
                        "Or copy and paste the link into your browser if the link doesn't work.\n\n" +
                        "This link will expire in 1 hour.\n\n" +
                        "If you didn't request this, please ignore this email.\n\n" +
                        "Best regards,\nTeknoSU Team");
                
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

    public void sendInvoiceEmail(String email,
                                 String invoiceId,
                                 java.math.BigDecimal amount,
                                 java.time.LocalDateTime invoiceDate) {
        if (mailSender == null) {
            log.warn("JavaMailSender not configured. Invoice for {} -> id={}, amount={}", email, invoiceId, amount);
            return;
        }

        try {
            log.info("Attempting to send invoice email to: {}", email);

            Class<?> simpleMailMessageClass = Class.forName("org.springframework.mail.SimpleMailMessage");
            Object msg = simpleMailMessageClass.getDeclaredConstructor().newInstance();

            Method setFrom = simpleMailMessageClass.getMethod("setFrom", String.class);
            Method setTo = simpleMailMessageClass.getMethod("setTo", String.class);
            Method setSubject = simpleMailMessageClass.getMethod("setSubject", String.class);
            Method setText = simpleMailMessageClass.getMethod("setText", String.class);

            String fromEmail = mailFrom != null && !mailFrom.isEmpty() ? mailFrom : "noreply@teknosu.com";
            setFrom.invoke(msg, fromEmail);
            setTo.invoke(msg, email);
            setSubject.invoke(msg, "Your Invoice - TeknoSU");

            StringBuilder body = new StringBuilder();
            body.append("Hello,\n\n")
                .append("Thank you for your payment. Here is your invoice information:\n\n")
                .append("Invoice ID: ").append(invoiceId).append("\n")
                .append("Amount: $").append(amount != null ? amount.toPlainString() : "0").append("\n");
            if (invoiceDate != null) {
                body.append("Date: ").append(invoiceDate).append("\n");
            }
            body.append("\n")
                .append("Best regards,\nTeknoSU Team");

            setText.invoke(msg, body.toString());

            log.info("Sending invoice email via JavaMailSender...");
            Class<?> mailSenderInterface = Class.forName("org.springframework.mail.javamail.JavaMailSender");
            Method sendMethod = mailSenderInterface.getMethod("send", simpleMailMessageClass);
            sendMethod.invoke(mailSender, msg);

            log.info("Invoice email sent successfully to: {}", email);
        } catch (Exception e) {
            log.error("Failed to send invoice email to {}: {}", email, e.getMessage());
            log.error("Exception details: ", e);
        }
    }

    public void sendInvoiceEmailWithPdf(String email,
                                       String invoiceId,
                                       java.math.BigDecimal amount,
                                       java.time.LocalDateTime invoiceDate,
                                       byte[] pdfBytes) {
        if (mailSender == null) {
            log.error("JavaMailSender not configured. Cannot send invoice email to: {}", email);
            log.error("Check if MAIL_USERNAME and MAIL_PASSWORD environment variables are set");
            return;
        }

        if (pdfBytes == null || pdfBytes.length == 0) {
            log.warn("PDF bytes are null or empty. Sending email without PDF attachment.");
            sendInvoiceEmail(email, invoiceId, amount, invoiceDate);
            return;
        }

        try {
            log.info("Attempting to send invoice email with PDF to: {}", email);
            log.info("PDF size: {} bytes", pdfBytes.length);

            Class<?> mimeMessageHelperClass = Class.forName("org.springframework.mail.javamail.MimeMessageHelper");
            Class<?> mimeMessageClass = Class.forName("jakarta.mail.internet.MimeMessage");
            Class<?> mailSenderInterface = Class.forName("org.springframework.mail.javamail.JavaMailSender");
            
            Method createMimeMessageMethod = mailSenderInterface.getMethod("createMimeMessage");
            Object mimeMessage = createMimeMessageMethod.invoke(mailSender);
            
            Object helper = mimeMessageHelperClass.getConstructor(mimeMessageClass, boolean.class)
                    .newInstance(mimeMessage, true);

            String fromEmail = mailFrom != null && !mailFrom.isEmpty() ? mailFrom : "noreply@teknosu.com";
            Method setFrom = mimeMessageHelperClass.getMethod("setFrom", String.class);
            Method setTo = mimeMessageHelperClass.getMethod("setTo", String.class);
            Method setSubject = mimeMessageHelperClass.getMethod("setSubject", String.class);
            Method setText = mimeMessageHelperClass.getMethod("setText", String.class, boolean.class);
            Class<?> inputStreamSourceClass = Class.forName("org.springframework.core.io.InputStreamSource");
            Method addAttachment = mimeMessageHelperClass.getMethod("addAttachment", String.class, inputStreamSourceClass);

            setFrom.invoke(helper, fromEmail);
            setTo.invoke(helper, email);
            setSubject.invoke(helper, "Your Invoice - TeknoSU");

            StringBuilder body = new StringBuilder();
            body.append("Hello,\n\n")
                .append("Thank you for your payment. Please find your invoice attached.\n\n")
                .append("Invoice ID: ").append(invoiceId).append("\n")
                .append("Amount: $").append(amount != null ? amount.toPlainString() : "0").append("\n");
            if (invoiceDate != null) {
                body.append("Date: ").append(invoiceDate).append("\n");
            }
            body.append("\n")
                .append("Best regards,\nTeknoSU Team");

            setText.invoke(helper, body.toString(), false);

            Object pdfSource = new ByteArrayInputStream(pdfBytes);
            addAttachment.invoke(helper, "invoice_" + invoiceId + ".pdf", pdfSource);

            Method sendMethod = mailSenderInterface.getMethod("send", mimeMessageClass);
            sendMethod.invoke(mailSender, mimeMessage);

            log.info("Invoice email with PDF sent successfully to: {}", email);
        } catch (Exception e) {
            log.error("Failed to send invoice email with PDF to {}: {}", email, e.getMessage());
            log.error("Exception class: {}", e.getClass().getName());
            if (e.getCause() != null) {
                log.error("Caused by: {}", e.getCause().getMessage());
            }
            log.error("Exception details: ", e);
            
            // Fallback: try to send email without PDF
            log.info("Attempting to send email without PDF as fallback...");
            try {
                sendInvoiceEmail(email, invoiceId, amount, invoiceDate);
            } catch (Exception e2) {
                log.error("Fallback email also failed: {}", e2.getMessage());
            }
        }
    }
}
