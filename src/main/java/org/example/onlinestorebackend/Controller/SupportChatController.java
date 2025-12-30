package org.example.onlinestorebackend.Controller;

import lombok.RequiredArgsConstructor;
import org.example.onlinestorebackend.Dto.StartConversationResponse;
import org.example.onlinestorebackend.Dto.SupportContextDto;
import org.example.onlinestorebackend.Dto.SupportConversationDto;
import org.example.onlinestorebackend.Dto.SupportMessageDto;
import org.example.onlinestorebackend.Entity.SupportAttachment;
import org.example.onlinestorebackend.Entity.SupportConversation;
import org.example.onlinestorebackend.Entity.SupportMessage;
import org.example.onlinestorebackend.Entity.User;
import org.example.onlinestorebackend.Repository.UserRepository;
import org.example.onlinestorebackend.Service.SupportChatService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/support")
@RequiredArgsConstructor
public class SupportChatController {

    private final SupportChatService supportChatService;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    // --- Customer / Guest ---

    @PostMapping("/conversations/start")
    public ResponseEntity<StartConversationResponse> start(@AuthenticationPrincipal UserDetails userDetails,
                                                           @RequestParam(required = false) String guestToken) {
        SupportConversation c = (userDetails != null)
                ? supportChatService.startForUser(userDetails.getUsername())
                : supportChatService.startForGuest(guestToken);

        // Notify agents about new conversation
        SupportConversationDto convDto = toDto(c);
        messagingTemplate.convertAndSend("/topic/support/queue", convDto);

        return ResponseEntity.ok(new StartConversationResponse(
                c.getConversationId(),
                c.getCustomerUserId() == null ? c.getGuestToken() : null,
                c.getStatus()
        ));
    }

    @GetMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<List<SupportMessageDto>> listMessages(@PathVariable String conversationId,
                                                                @AuthenticationPrincipal UserDetails userDetails,
                                                                @RequestHeader(value = "X-Guest-Token", required = false) String guestToken) {
        List<SupportMessage> messages = supportChatService.listMessages(
                conversationId,
                userDetails != null ? userDetails.getUsername() : null,
                userDetails == null ? guestToken : null,
                null,
                false
        );
        return ResponseEntity.ok(messages.stream().map(this::toDto).toList());
    }

    @PostMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<SupportMessageDto> sendText(@PathVariable String conversationId,
                                                      @RequestParam String text,
                                                      @AuthenticationPrincipal UserDetails userDetails,
                                                      @RequestHeader(value = "X-Guest-Token", required = false) String guestToken) {
        SupportMessage saved = supportChatService.sendTextAsCustomerOrGuest(
                conversationId,
                userDetails != null ? userDetails.getUsername() : null,
                userDetails == null ? guestToken : null,
                text
        );
        SupportMessageDto dto = toDto(saved);
        messagingTemplate.convertAndSend("/topic/support/" + conversationId, dto);
        return ResponseEntity.ok(dto);
    }

    @PostMapping(value = "/conversations/{conversationId}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<SupportMessageDto> uploadAttachment(@PathVariable String conversationId,
                                                              @RequestPart("file") MultipartFile file,
                                                              @AuthenticationPrincipal UserDetails userDetails,
                                                              @RequestHeader(value = "X-Guest-Token", required = false) String guestToken) {
        SupportMessage saved = supportChatService.uploadAttachmentAsCustomerOrGuest(
                conversationId,
                userDetails != null ? userDetails.getUsername() : null,
                userDetails == null ? guestToken : null,
                file
        );
        SupportMessageDto dto = toDto(saved);
        messagingTemplate.convertAndSend("/topic/support/" + conversationId, dto);
        
        // Notify agents about new message in conversation queue
        SupportConversation conv = supportChatService.getConversation(conversationId);
        SupportConversationDto convDto = toDto(conv);
        messagingTemplate.convertAndSend("/topic/support/queue", convDto);
        
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/attachments/{attachmentId}")
    public ResponseEntity<byte[]> downloadAttachment(@PathVariable String attachmentId,
                                                     @AuthenticationPrincipal UserDetails userDetails,
                                                     @RequestHeader(value = "X-Guest-Token", required = false) String guestToken) {
        SupportAttachment a = supportChatService.getAttachment(attachmentId);
        SupportConversation c = supportChatService.getConversation(a.getConversationId());
        supportChatService.assertCustomerOrGuestAccess(
                c,
                userDetails != null ? userDetails.getUsername() : null,
                userDetails == null ? guestToken : null
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(a.getContentType()));
        headers.setContentDispositionFormData("attachment", a.getFileName());
        headers.setContentLength(a.getSize());
        return ResponseEntity.ok().headers(headers).body(a.getData());
    }

    @GetMapping("/conversations/{conversationId}/context")
    public ResponseEntity<SupportContextDto> customerContext(@PathVariable String conversationId,
                                                             @AuthenticationPrincipal UserDetails userDetails,
                                                             @RequestHeader(value = "X-Guest-Token", required = false) String guestToken) {
        return ResponseEntity.ok(
                supportChatService.getContextForCustomer(
                        conversationId,
                        userDetails != null ? userDetails.getUsername() : null,
                        userDetails == null ? guestToken : null
                )
        );
    }

    // --- Support Agent ---

    @GetMapping("/agent/queue")
    @PreAuthorize("hasRole('SUPPORT_AGENT')")
    public ResponseEntity<List<SupportConversationDto>> agentQueue(@RequestParam(required = false) String status) {
        List<SupportConversation> list = supportChatService.agentQueue(status);
        return ResponseEntity.ok(list.stream().map(this::toDto).toList());
    }

    @PostMapping("/agent/conversations/{conversationId}/claim")
    @PreAuthorize("hasRole('SUPPORT_AGENT')")
    public ResponseEntity<SupportConversationDto> claim(@PathVariable String conversationId,
                                                        @AuthenticationPrincipal UserDetails userDetails) {
        SupportConversation c = supportChatService.claim(conversationId, userDetails.getUsername());
        SupportConversationDto dto = toDto(c);
        // Notify all agents about conversation status change
        messagingTemplate.convertAndSend("/topic/support/queue", dto);
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/agent/conversations/{conversationId}/close")
    @PreAuthorize("hasRole('SUPPORT_AGENT')")
    public ResponseEntity<SupportConversationDto> close(@PathVariable String conversationId,
                                                        @AuthenticationPrincipal UserDetails userDetails) {
        SupportConversation c = supportChatService.close(conversationId, userDetails.getUsername());
        SupportConversationDto dto = toDto(c);
        // Notify all agents about conversation status change
        messagingTemplate.convertAndSend("/topic/support/queue", dto);
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/agent/conversations/{conversationId}/messages")
    @PreAuthorize("hasRole('SUPPORT_AGENT')")
    public ResponseEntity<SupportMessageDto> agentSendText(@PathVariable String conversationId,
                                                           @RequestParam String text,
                                                           @AuthenticationPrincipal UserDetails userDetails) {
        SupportMessage saved = supportChatService.sendTextAsAgent(conversationId, userDetails.getUsername(), text);
        SupportMessageDto dto = toDto(saved);
        messagingTemplate.convertAndSend("/topic/support/" + conversationId, dto);
        
        // Update conversation in queue
        SupportConversation conv = supportChatService.getConversation(conversationId);
        SupportConversationDto convDto = toDto(conv);
        messagingTemplate.convertAndSend("/topic/support/queue", convDto);
        
        return ResponseEntity.ok(dto);
    }

    @PostMapping(value = "/agent/conversations/{conversationId}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('SUPPORT_AGENT')")
    public ResponseEntity<SupportMessageDto> agentUploadAttachment(@PathVariable String conversationId,
                                                                   @RequestPart("file") MultipartFile file,
                                                                   @AuthenticationPrincipal UserDetails userDetails) {
        SupportMessage saved = supportChatService.uploadAttachmentAsAgent(conversationId, userDetails.getUsername(), file);
        SupportMessageDto dto = toDto(saved);
        messagingTemplate.convertAndSend("/topic/support/" + conversationId, dto);
        
        // Update conversation in queue
        SupportConversation conv = supportChatService.getConversation(conversationId);
        SupportConversationDto convDto = toDto(conv);
        messagingTemplate.convertAndSend("/topic/support/queue", convDto);
        
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/agent/conversations/{conversationId}/messages")
    @PreAuthorize("hasRole('SUPPORT_AGENT')")
    public ResponseEntity<List<SupportMessageDto>> agentListMessages(@PathVariable String conversationId,
                                                                     @AuthenticationPrincipal UserDetails userDetails) {
        List<SupportMessage> messages = supportChatService.listMessages(
                conversationId,
                null,
                null,
                userDetails.getUsername(),
                true
        );
        return ResponseEntity.ok(messages.stream().map(this::toDto).toList());
    }

    @GetMapping("/agent/attachments/{attachmentId}")
    @PreAuthorize("hasRole('SUPPORT_AGENT')")
    public ResponseEntity<byte[]> agentDownloadAttachment(@PathVariable String attachmentId,
                                                          @AuthenticationPrincipal UserDetails userDetails) {
        SupportAttachment a = supportChatService.getAttachment(attachmentId);
        SupportConversation c = supportChatService.getConversation(a.getConversationId());
        supportChatService.assertAgentAccess(c, userDetails.getUsername());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(a.getContentType()));
        headers.setContentDispositionFormData("attachment", a.getFileName());
        headers.setContentLength(a.getSize());
        return ResponseEntity.ok().headers(headers).body(a.getData());
    }

    @GetMapping("/agent/conversations/{conversationId}/context")
    @PreAuthorize("hasRole('SUPPORT_AGENT')")
    public ResponseEntity<SupportContextDto> agentContext(@PathVariable String conversationId,
                                                          @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(supportChatService.getContextForAgent(conversationId, userDetails.getUsername()));
    }

    private SupportMessageDto toDto(SupportMessage m) {
        String senderName = null;
        // Get sender name if sender is a user (not guest)
        if (m.getSenderType() != null && (m.getSenderType().equals("CUSTOMER") || m.getSenderType().equals("SUPPORT_AGENT"))) {
            try {
                User user = userRepository.findByUserId(m.getSenderId()).orElse(null);
                if (user != null) {
                    senderName = user.getName() != null ? user.getName() : user.getUsername();
                }
            } catch (Exception e) {
                // Ignore if user not found
            }
        }
        return new SupportMessageDto(
                m.getMessageId(),
                m.getConversationId(),
                m.getSenderType(),
                m.getSenderId(),
                senderName,
                m.getType(),
                m.getText(),
                m.getAttachmentId(),
                m.getCreatedAt()
        );
    }

    private SupportConversationDto toDto(SupportConversation c) {
        return new SupportConversationDto(
                c.getConversationId(),
                c.getCustomerUserId(),
                c.getGuestToken(),
                c.getClaimedByAgentId(),
                c.getStatus(),
                c.getCreatedAt(),
                c.getLastMessageAt()
        );
    }
}