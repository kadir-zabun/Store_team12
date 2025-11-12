// src/main/java/org/example/onlinestorebackend/exception/GlobalExceptionHandler.java
package org.example.onlinestorebackend.exception;

import org.example.onlinestorebackend.common.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.*;

@RestControllerAdvice(basePackages = "org.example.onlinestorebackend")
public class GlobalExceptionHandler {

    // @Valid body hataları
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex,
                                                              HttpServletRequest req) {
        Map<String, List<String>> fields = new LinkedHashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            fields.computeIfAbsent(fe.getField(), k -> new ArrayList<>()).add(fe.getDefaultMessage());
        }
        var body = ApiResponse.<Void>fail(
                "VALIDATION_ERROR",
                "Invalid request.",
                fields,
                (String) req.getAttribute("X-Request-Id")
        );
        return ResponseEntity.badRequest().body(body);
    }

    // @Validated parametre hataları
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraint(ConstraintViolationException ex,
                                                              HttpServletRequest req) {
        Map<String, String> details = new LinkedHashMap<>();
        ex.getConstraintViolations().forEach(v ->
                details.put(v.getPropertyPath().toString(), v.getMessage())
        );
        var body = ApiResponse.<Void>fail(
                "VALIDATION_ERROR",
                "Invalid parameters.",
                details,
                (String) req.getAttribute("X-Request-Id")
        );
        return ResponseEntity.badRequest().body(body);
    }

    // 404
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(ResourceNotFoundException ex,
                                                            HttpServletRequest req) {
        var body = ApiResponse.<Void>fail(
                "NOT_FOUND",
                ex.getMessage() != null ? ex.getMessage() : "Resource not found.",
                null,
                (String) req.getAttribute("X-Request-Id")
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
    }

    // İş kuralı (stok vb.)
    @ExceptionHandler(InsufficientStockException.class)
    public ResponseEntity<ApiResponse<Void>> handleStock(InsufficientStockException ex,
                                                         HttpServletRequest req) {
        var body = ApiResponse.<Void>fail(
                "BUSINESS_RULE_VIOLATION",
                ex.getMessage(),
                null, // exception'da details yoksa null bırak
                (String) req.getAttribute("X-Request-Id")
        );
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }

    // Geçersiz istek
    @ExceptionHandler(InvalidRequestException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalid(InvalidRequestException ex,
                                                           HttpServletRequest req) {
        var body = ApiResponse.<Void>fail(
                "INVALID_REQUEST",
                ex.getMessage(),
                null,
                (String) req.getAttribute("X-Request-Id")
        );
        return ResponseEntity.badRequest().body(body);
    }

    // Fallback
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleOther(Exception ex, HttpServletRequest req) {
        var body = ApiResponse.<Void>fail(
                "INTERNAL_ERROR",
                "Unexpected error.",
                Map.of("reason", ex.getClass().getSimpleName()),
                (String) req.getAttribute("X-Request-Id")
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }
}
