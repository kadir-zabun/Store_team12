package org.example.onlinestorebackend.Dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StartConversationResponse {
    private String conversationId;
    private String guestToken; // null if logged-in user
    private String status;
}