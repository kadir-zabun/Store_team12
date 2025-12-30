package org.example.onlinestorebackend.Service;

import lombok.RequiredArgsConstructor;
import org.example.onlinestorebackend.Dto.SupportContextDto;
import org.example.onlinestorebackend.Entity.Cart;
import org.example.onlinestorebackend.Entity.Delivery;
import org.example.onlinestorebackend.Entity.Order;
import org.example.onlinestorebackend.Entity.SupportAttachment;
import org.example.onlinestorebackend.Entity.SupportConversation;
import org.example.onlinestorebackend.Entity.SupportMessage;
import org.example.onlinestorebackend.Entity.User;
import org.example.onlinestorebackend.Entity.WishList;
import org.example.onlinestorebackend.Repository.CartRepository;
import org.example.onlinestorebackend.Repository.DeliveryRepository;
import org.example.onlinestorebackend.Repository.OrderRepository;
import org.example.onlinestorebackend.Repository.SupportAttachmentRepository;
import org.example.onlinestorebackend.Repository.SupportConversationRepository;
import org.example.onlinestorebackend.Repository.SupportMessageRepository;
import org.example.onlinestorebackend.Repository.UserRepository;
import org.example.onlinestorebackend.Repository.WishListRepository;
import org.example.onlinestorebackend.exception.InvalidRequestException;
import org.example.onlinestorebackend.exception.ResourceNotFoundException;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SupportChatService {

    public static final String STATUS_OPEN = "OPEN";
    public static final String STATUS_CLAIMED = "CLAIMED";
    public static final String STATUS_CLOSED = "CLOSED";

    public static final String SENDER_CUSTOMER = "CUSTOMER";
    public static final String SENDER_SUPPORT_AGENT = "SUPPORT_AGENT";
    public static final String SENDER_GUEST = "GUEST";

    public static final String MESSAGE_TEXT = "TEXT";
    public static final String MESSAGE_ATTACHMENT = "ATTACHMENT";

    private static final long MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10MB

    private final SupportConversationRepository conversationRepository;
    private final SupportMessageRepository messageRepository;
    private final SupportAttachmentRepository attachmentRepository;

    private final UserRepository userRepository;
    private final CartRepository cartRepository;
    private final OrderRepository orderRepository;
    private final DeliveryRepository deliveryRepository;
    private final WishListRepository wishListRepository;

    @Transactional
    public SupportConversation startForGuest(String existingGuestToken) {
        if (existingGuestToken != null && !existingGuestToken.isBlank()) {
            // Check for existing active conversation
            List<SupportConversation> active = conversationRepository
                    .findByGuestTokenAndStatusNot(existingGuestToken.trim(), STATUS_CLOSED);
            if (!active.isEmpty()) {
                return active.get(0);
            }
        }

        // Create new
        SupportConversation c = new SupportConversation();
        c.setConversationId(UUID.randomUUID().toString());
        c.setGuestToken(existingGuestToken != null && !existingGuestToken.isBlank()
                ? existingGuestToken.trim()
                : UUID.randomUUID().toString());
        c.setStatus(STATUS_OPEN);
        c.setCreatedAt(LocalDateTime.now());
        c.setLastMessageAt(LocalDateTime.now());
        return conversationRepository.save(c);
    }

    @Transactional
    public SupportConversation startForUser(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        // Check for existing active conversation
        List<SupportConversation> active = conversationRepository.findByCustomerUserIdAndStatusNot(user.getUserId(),
                STATUS_CLOSED);
        if (!active.isEmpty()) {
            return active.get(0);
        }

        SupportConversation c = new SupportConversation();
        c.setConversationId(UUID.randomUUID().toString());
        c.setCustomerUserId(user.getUserId());
        c.setStatus(STATUS_OPEN);
        c.setCreatedAt(LocalDateTime.now());
        c.setLastMessageAt(LocalDateTime.now());
        return conversationRepository.save(c);
    }

    public SupportConversation getConversation(String conversationId) {
        return conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found: " + conversationId));
    }

    public void assertCustomerOrGuestAccess(SupportConversation c, String usernameOrNull, String guestTokenOrNull) {
        if (usernameOrNull != null) {
            User user = userRepository.findByUsername(usernameOrNull)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found: " + usernameOrNull));
            if (c.getCustomerUserId() == null || !c.getCustomerUserId().equals(user.getUserId())) {
                throw new InvalidRequestException("Access denied for this conversation");
            }
            return;
        }

        if (guestTokenOrNull == null || guestTokenOrNull.isBlank()) {
            throw new InvalidRequestException("guestToken is required for guest access");
        }
        if (c.getGuestToken() == null || !c.getGuestToken().equals(guestTokenOrNull)) {
            throw new InvalidRequestException("Invalid guestToken");
        }
    }

    public void assertAgentAccess(SupportConversation c, String agentUsername) {
        User agent = userRepository.findByUsername(agentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + agentUsername));
        if (c.getClaimedByAgentId() == null || !c.getClaimedByAgentId().equals(agent.getUserId())) {
            throw new InvalidRequestException("Conversation is not claimed by this agent");
        }
    }

    @Transactional
    public SupportConversation claim(String conversationId, String agentUsername) {
        SupportConversation c = getConversation(conversationId);
        if (STATUS_CLOSED.equals(c.getStatus())) {
            throw new InvalidRequestException("Conversation is closed");
        }
        User agent = userRepository.findByUsername(agentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + agentUsername));

        // If already claimed by another agent -> reject
        if (c.getClaimedByAgentId() != null && !c.getClaimedByAgentId().equals(agent.getUserId())) {
            throw new InvalidRequestException("Conversation already claimed");
        }

        c.setClaimedByAgentId(agent.getUserId());
        c.setStatus(STATUS_CLAIMED);
        return conversationRepository.save(c);
    }

    @Transactional
    public SupportConversation close(String conversationId, String agentUsername) {
        SupportConversation c = getConversation(conversationId);
        // Only the claiming agent can close
        assertAgentAccess(c, agentUsername);
        c.setStatus(STATUS_CLOSED);
        return conversationRepository.save(c);
    }

    @Transactional
    public SupportMessage sendTextAsCustomerOrGuest(String conversationId,
            String usernameOrNull,
            String guestTokenOrNull,
            String text) {
        if (text == null || text.isBlank()) {
            throw new InvalidRequestException("text is required");
        }
        SupportConversation c = getConversation(conversationId);
        assertCustomerOrGuestAccess(c, usernameOrNull, guestTokenOrNull);
        if (STATUS_CLOSED.equals(c.getStatus())) {
            throw new InvalidRequestException("Conversation is closed");
        }

        SupportMessage m = new SupportMessage();
        m.setMessageId(UUID.randomUUID().toString());
        m.setConversationId(conversationId);
        m.setType(MESSAGE_TEXT);
        m.setText(text.trim());
        m.setCreatedAt(LocalDateTime.now());

        if (usernameOrNull != null) {
            User user = userRepository.findByUsername(usernameOrNull)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found: " + usernameOrNull));
            m.setSenderType(SENDER_CUSTOMER);
            m.setSenderId(user.getUserId());
        } else {
            m.setSenderType(SENDER_GUEST);
            m.setSenderId(guestTokenOrNull);
        }

        SupportMessage saved = messageRepository.save(m);
        c.setLastMessageAt(saved.getCreatedAt());
        conversationRepository.save(c);
        return saved;
    }

    @Transactional
    public SupportMessage sendTextAsAgent(String conversationId, String agentUsername, String text) {
        if (text == null || text.isBlank()) {
            throw new InvalidRequestException("text is required");
        }
        SupportConversation c = getConversation(conversationId);
        assertAgentAccess(c, agentUsername);
        if (STATUS_CLOSED.equals(c.getStatus())) {
            throw new InvalidRequestException("Conversation is closed");
        }

        User agent = userRepository.findByUsername(agentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + agentUsername));

        SupportMessage m = new SupportMessage();
        m.setMessageId(UUID.randomUUID().toString());
        m.setConversationId(conversationId);
        m.setSenderType(SENDER_SUPPORT_AGENT);
        m.setSenderId(agent.getUserId());
        m.setType(MESSAGE_TEXT);
        m.setText(text.trim());
        m.setCreatedAt(LocalDateTime.now());

        SupportMessage saved = messageRepository.save(m);
        c.setLastMessageAt(saved.getCreatedAt());
        conversationRepository.save(c);
        return saved;
    }

    public List<SupportMessage> listMessages(String conversationId,
            String usernameOrNull,
            String guestTokenOrNull,
            String agentUsernameOrNull,
            boolean agentAccess) {
        SupportConversation c = getConversation(conversationId);
        if (agentAccess) {
            assertAgentAccess(c, agentUsernameOrNull);
        } else {
            assertCustomerOrGuestAccess(c, usernameOrNull, guestTokenOrNull);
        }
        return messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
    }

    public List<SupportConversation> agentQueue(String status) {
        if (status == null || status.isBlank()) {
            return conversationRepository.findAll();
        }
        return conversationRepository.findByStatus(status);
    }

    @Transactional
    public SupportMessage uploadAttachmentAsCustomerOrGuest(String conversationId,
            String usernameOrNull,
            String guestTokenOrNull,
            MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidRequestException("file is required");
        }
        if (file.getSize() > MAX_ATTACHMENT_BYTES) {
            throw new InvalidRequestException("file too large (max 10MB)");
        }

        SupportConversation c = getConversation(conversationId);
        assertCustomerOrGuestAccess(c, usernameOrNull, guestTokenOrNull);
        if (STATUS_CLOSED.equals(c.getStatus())) {
            throw new InvalidRequestException("Conversation is closed");
        }

        SupportAttachment a = new SupportAttachment();
        a.setAttachmentId(UUID.randomUUID().toString());
        a.setConversationId(conversationId);
        a.setFileName(Optional.ofNullable(file.getOriginalFilename()).orElse("attachment"));
        a.setContentType(Optional.ofNullable(file.getContentType()).orElse(MediaType.APPLICATION_OCTET_STREAM_VALUE));
        a.setSize(file.getSize());
        a.setCreatedAt(LocalDateTime.now());

        try {
            a.setData(file.getBytes());
        } catch (Exception e) {
            throw new InvalidRequestException("Failed to read file bytes");
        }

        if (usernameOrNull != null) {
            User user = userRepository.findByUsername(usernameOrNull)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found: " + usernameOrNull));
            a.setUploadedByType(SENDER_CUSTOMER);
            a.setUploadedById(user.getUserId());
        } else {
            a.setUploadedByType(SENDER_GUEST);
            a.setUploadedById(guestTokenOrNull);
        }

        attachmentRepository.save(a);

        SupportMessage m = new SupportMessage();
        m.setMessageId(UUID.randomUUID().toString());
        m.setConversationId(conversationId);
        m.setType(MESSAGE_ATTACHMENT);
        m.setAttachmentId(a.getAttachmentId());
        m.setCreatedAt(LocalDateTime.now());
        m.setSenderType(a.getUploadedByType());
        m.setSenderId(a.getUploadedById());

        SupportMessage savedMsg = messageRepository.save(m);
        c.setLastMessageAt(savedMsg.getCreatedAt());
        conversationRepository.save(c);
        return savedMsg;
    }

    @Transactional
    public SupportMessage uploadAttachmentAsAgent(String conversationId,
            String agentUsername,
            MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidRequestException("file is required");
        }
        if (file.getSize() > MAX_ATTACHMENT_BYTES) {
            throw new InvalidRequestException("file too large (max 10MB)");
        }

        SupportConversation c = getConversation(conversationId);
        assertAgentAccess(c, agentUsername);
        if (STATUS_CLOSED.equals(c.getStatus())) {
            throw new InvalidRequestException("Conversation is closed");
        }

        User agent = userRepository.findByUsername(agentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + agentUsername));

        SupportAttachment a = new SupportAttachment();
        a.setAttachmentId(UUID.randomUUID().toString());
        a.setConversationId(conversationId);
        a.setFileName(Optional.ofNullable(file.getOriginalFilename()).orElse("attachment"));
        a.setContentType(Optional.ofNullable(file.getContentType()).orElse(MediaType.APPLICATION_OCTET_STREAM_VALUE));
        a.setSize(file.getSize());
        a.setCreatedAt(LocalDateTime.now());
        a.setUploadedByType(SENDER_SUPPORT_AGENT);
        a.setUploadedById(agent.getUserId());

        try {
            a.setData(file.getBytes());
        } catch (Exception e) {
            throw new InvalidRequestException("Failed to read file bytes");
        }

        attachmentRepository.save(a);

        SupportMessage m = new SupportMessage();
        m.setMessageId(UUID.randomUUID().toString());
        m.setConversationId(conversationId);
        m.setType(MESSAGE_ATTACHMENT);
        m.setAttachmentId(a.getAttachmentId());
        m.setCreatedAt(LocalDateTime.now());
        m.setSenderType(SENDER_SUPPORT_AGENT);
        m.setSenderId(agent.getUserId());

        SupportMessage savedMsg = messageRepository.save(m);
        c.setLastMessageAt(savedMsg.getCreatedAt());
        conversationRepository.save(c);
        return savedMsg;
    }

    public SupportAttachment getAttachment(String attachmentId) {
        return attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Attachment not found: " + attachmentId));
    }

    public SupportContextDto getContextForAgent(String conversationId, String agentUsername) {
        SupportConversation c = getConversation(conversationId);
        assertAgentAccess(c, agentUsername);
        if (c.getCustomerUserId() == null) {
            return new SupportContextDto(null, null, List.of(), List.of(), List.of());
        }
        return buildContextForUserId(c.getCustomerUserId());
    }

    public SupportContextDto getContextForCustomer(String conversationId, String username, String guestToken) {
        SupportConversation c = getConversation(conversationId);
        assertCustomerOrGuestAccess(c, username, guestToken);
        if (c.getCustomerUserId() == null) {
            return new SupportContextDto(null, null, List.of(), List.of(), List.of());
        }
        return buildContextForUserId(c.getCustomerUserId());
    }

    private SupportContextDto buildContextForUserId(String userId) {
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with userId: " + userId));

        SupportContextDto.UserProfile profile = new SupportContextDto.UserProfile(
                user.getUserId(),
                user.getUsername(),
                user.getName(),
                user.getEmail(),
                user.getRole());

        Cart cart = cartRepository.findByUserId(userId).orElse(null);
        List<Order> orders = orderRepository.findByCustomerId(userId);
        List<Delivery> deliveries = deliveryRepository.findByCustomerId(userId);

        List<String> wishIds = wishListRepository.findByUserId(userId)
                .map(WishList::getProductIds)
                .orElse(List.of());

        SupportContextDto dto = new SupportContextDto();
        dto.setUser(profile);
        dto.setCart(cart);
        dto.setOrders(orders != null ? orders : List.of());
        dto.setDeliveries(deliveries != null ? deliveries : List.of());
        dto.setWishListProductIds(wishIds);
        return dto;
    }
}