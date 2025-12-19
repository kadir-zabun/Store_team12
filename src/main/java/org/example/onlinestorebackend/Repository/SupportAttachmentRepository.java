package org.example.onlinestorebackend.Repository;

import org.example.onlinestorebackend.Entity.SupportAttachment;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SupportAttachmentRepository extends MongoRepository<SupportAttachment, String> {
    List<SupportAttachment> findByConversationId(String conversationId);
}