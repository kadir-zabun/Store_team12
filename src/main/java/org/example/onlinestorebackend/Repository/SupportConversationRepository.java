package org.example.onlinestorebackend.Repository;

import org.example.onlinestorebackend.Entity.SupportConversation;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SupportConversationRepository extends MongoRepository<SupportConversation, String> {
    List<SupportConversation> findByStatus(String status);
    List<SupportConversation> findByClaimedByAgentId(String agentId);
    List<SupportConversation> findByCustomerUserIdAndStatusIn(String customerUserId, List<String> statuses);
    List<SupportConversation> findByGuestTokenAndStatusIn(String guestToken, List<String> statuses);
}