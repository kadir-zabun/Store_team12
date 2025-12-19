package org.example.onlinestorebackend.Dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SupportConversationDto {
    private String conversationId;
    private String customerUserId;
    private String guestToken;
    private String claimedByAgentId;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime lastMessageAt;
}