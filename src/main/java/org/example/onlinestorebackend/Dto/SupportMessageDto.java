package org.example.onlinestorebackend.Dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SupportMessageDto {
    private String messageId;
    private String conversationId;
    private String senderType;
    private String senderId;
    private String senderName; // Username for authenticated users, null for guests
    private String type;
    private String text;
    private String attachmentId;
    private LocalDateTime createdAt;
}


