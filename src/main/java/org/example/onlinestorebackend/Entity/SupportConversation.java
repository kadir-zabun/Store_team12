package org.example.onlinestorebackend.Entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Document(collection = "support_conversations")
public class SupportConversation {

    @Id
    private String conversationId;

    /**
     * CUSTOMER userId (if logged-in), otherwise null and guestToken is used.
     */
    @Indexed
    private String customerUserId;

    /**
     * Guest token (random) for unauthenticated customers.
     */
    @Indexed
    private String guestToken;

    /**
     * SUPPORT_AGENT userId who claimed the conversation.
     */
    @Indexed
    private String claimedByAgentId;

    @Indexed
    private String status; // OPEN, CLAIMED, CLOSED

    private LocalDateTime createdAt;
    private LocalDateTime lastMessageAt;
}

