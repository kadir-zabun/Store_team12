package org.example.onlinestorebackend.Entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Document(collection = "support_messages")
public class SupportMessage {

    @Id
    private String messageId;

    @Indexed
    private String conversationId;

    /**
     * CUSTOMER / SUPPORT_AGENT / GUEST
     */
    private String senderType;

    /**
     * userId for authenticated users, or guestToken for guests.
     */
    private String senderId;

    /**
     * TEXT / ATTACHMENT
     */
    private String type;

    private String text;
    private String attachmentId;

    @Indexed
    private LocalDateTime createdAt;
}

