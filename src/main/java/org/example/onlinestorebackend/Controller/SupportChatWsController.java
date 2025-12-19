package org.example.onlinestorebackend.Controller;

import lombok.RequiredArgsConstructor;
import org.example.onlinestorebackend.Dto.SendTextMessageRequest;
import org.example.onlinestorebackend.Dto.SupportMessageDto;
import org.example.onlinestorebackend.Entity.SupportMessage;
import org.example.onlinestorebackend.Service.SupportChatService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class SupportChatWsController {

    private final SupportChatService supportChatService;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * STOMP send destination: /app/support/send-text
     * Clients subscribe to: /topic/support/{conversationId}
     *
     * Guest must include guestToken in payload.
     * Authenticated users use JWT and can omit guestToken.
     */
    @MessageMapping("/support/send-text")
    public void sendText(SendTextMessageRequest request, Authentication authentication) {
        String conversationId = request != null ? request.getConversationId() : null;
        String text = request != null ? request.getText() : null;

        String username = authentication != null ? authentication.getName() : null;
        String guestToken = (username == null) ? (request != null ? request.getGuestToken() : null) : null;

        SupportMessage saved = supportChatService.sendTextAsCustomerOrGuest(conversationId, username, guestToken, text);
        SupportMessageDto dto = new SupportMessageDto(
                saved.getMessageId(),
                saved.getConversationId(),
                saved.getSenderType(),
                saved.getSenderId(),
                saved.getType(),
                saved.getText(),
                saved.getAttachmentId(),
                saved.getCreatedAt()
        );
        messagingTemplate.convertAndSend("/topic/support/" + saved.getConversationId(), dto);
    }
}