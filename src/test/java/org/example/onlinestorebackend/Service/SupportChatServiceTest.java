package org.example.onlinestorebackend.Service;

import org.example.onlinestorebackend.Entity.SupportConversation;
import org.example.onlinestorebackend.Entity.SupportMessage;
import org.example.onlinestorebackend.Entity.User;
import org.example.onlinestorebackend.Repository.CartRepository;
import org.example.onlinestorebackend.Repository.DeliveryRepository;
import org.example.onlinestorebackend.Repository.OrderRepository;
import org.example.onlinestorebackend.Repository.SupportAttachmentRepository;
import org.example.onlinestorebackend.Repository.SupportConversationRepository;
import org.example.onlinestorebackend.Repository.SupportMessageRepository;
import org.example.onlinestorebackend.Repository.UserRepository;
import org.example.onlinestorebackend.Repository.WishListRepository;
import org.example.onlinestorebackend.exception.InvalidRequestException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SupportChatServiceTest {

    @Mock private SupportConversationRepository conversationRepository;
    @Mock private SupportMessageRepository messageRepository;
    @Mock private SupportAttachmentRepository attachmentRepository;
    @Mock private UserRepository userRepository;
    @Mock private CartRepository cartRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private DeliveryRepository deliveryRepository;
    @Mock private WishListRepository wishListRepository;

    @InjectMocks
    private SupportChatService supportChatService;

    @Test
    void startForGuest_createsConversationWithGuestToken() {
        when(conversationRepository.save(any(SupportConversation.class))).thenAnswer(invocation -> invocation.getArgument(0));
        SupportConversation c = supportChatService.startForGuest(null);
        assertNotNull(c.getConversationId());
        assertNotNull(c.getGuestToken());
        assertEquals(SupportChatService.STATUS_OPEN, c.getStatus());
    }

    @Test
    void claim_alreadyClaimedByOtherAgent_throws() {
        SupportConversation c = new SupportConversation();
        c.setConversationId("c1");
        c.setStatus(SupportChatService.STATUS_OPEN);
        c.setClaimedByAgentId("agent1");

        when(conversationRepository.findById("c1")).thenReturn(Optional.of(c));
        User agent2 = new User();
        agent2.setUserId("agent2");
        agent2.setUsername("agent2");
        when(userRepository.findByUsername("agent2")).thenReturn(Optional.of(agent2));

        assertThrows(InvalidRequestException.class, () -> supportChatService.claim("c1", "agent2"));
    }

    @Test
    void sendTextAsCustomerOrGuest_requiresText() {
        assertThrows(InvalidRequestException.class, () ->
                supportChatService.sendTextAsCustomerOrGuest("c1", null, "gt", " ")
        );
    }

    @Test
    void sendTextAsCustomerOrGuest_guestTokenMismatch_throws() {
        SupportConversation c = new SupportConversation();
        c.setConversationId("c1");
        c.setGuestToken("gt1");
        c.setStatus(SupportChatService.STATUS_OPEN);
        when(conversationRepository.findById("c1")).thenReturn(Optional.of(c));

        assertThrows(InvalidRequestException.class, () ->
                supportChatService.sendTextAsCustomerOrGuest("c1", null, "gt2", "hi")
        );
    }

    @Test
    void sendTextAsCustomerOrGuest_guestHappyPath_savesMessage() {
        SupportConversation c = new SupportConversation();
        c.setConversationId("c1");
        c.setGuestToken("gt");
        c.setStatus(SupportChatService.STATUS_OPEN);
        when(conversationRepository.findById("c1")).thenReturn(Optional.of(c));
        when(messageRepository.save(any(SupportMessage.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(conversationRepository.save(any(SupportConversation.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SupportMessage m = supportChatService.sendTextAsCustomerOrGuest("c1", null, "gt", "hello");
        assertEquals("c1", m.getConversationId());
        assertEquals(SupportChatService.SENDER_GUEST, m.getSenderType());
        assertEquals("gt", m.getSenderId());
        assertEquals(SupportChatService.MESSAGE_TEXT, m.getType());
        verify(messageRepository).save(any(SupportMessage.class));
    }
}


