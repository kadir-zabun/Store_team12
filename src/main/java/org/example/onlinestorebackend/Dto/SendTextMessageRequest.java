package org.example.onlinestorebackend.Dto;

import lombok.Data;

@Data
public class SendTextMessageRequest {
    private String conversationId;
    private String text;
    private String guestToken;
}