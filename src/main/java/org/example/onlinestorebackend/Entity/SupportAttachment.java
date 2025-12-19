package org.example.onlinestorebackend.Entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Document(collection = "support_attachments")
public class SupportAttachment {

    @Id
    private String attachmentId;

    @Indexed
    private String conversationId;

    private String uploadedByType; // CUSTOMER / SUPPORT_AGENT / GUEST
    private String uploadedById;   // userId or guestToken

    private String fileName;
    private String contentType;
    private long size;
    private byte[] data;

    @Indexed
    private LocalDateTime createdAt;
}