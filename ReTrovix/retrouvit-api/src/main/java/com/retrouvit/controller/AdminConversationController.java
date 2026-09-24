package com.retrouvit.controller;

import com.retrouvit.dto.ConversationResponse;
import com.retrouvit.service.MessageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/conversations")
@RequiredArgsConstructor
@Tag(name = "Admin Conversations", description = "API admin pour les conversations")
public class AdminConversationController {

    private final MessageService messageService;

    @GetMapping
    @Operation(summary = "Lister toutes les conversations (admin)")
    public ResponseEntity<List<ConversationResponse>> getAllConversations() {
        // Get all conversations - this would need a new method in MessageService
        // For now, return empty list as placeholder
        return ResponseEntity.ok(List.of());
    }

    @GetMapping("/stats")
    @Operation(summary = "Statistiques des conversations (admin)")
    public ResponseEntity<Map<String, Object>> getConversationStats() {
        // Placeholder stats
        return ResponseEntity.ok(Map.of(
                "total", 0,
                "active", 0,
                "archived", 0
        ));
    }
}
