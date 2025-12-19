package org.example.onlinestorebackend.Repository;

import org.example.onlinestorebackend.Entity.SupportMessage;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SupportMessageRepository extends MongoRepository<SupportMessage, String> {
    List<SupportMessage> findByConversationIdOrderByCreatedAtAsc(String conversationId);
}