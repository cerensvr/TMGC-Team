package com.skinshelf.backend.controller;

import com.skinshelf.backend.dto.AssistantChatRequest;
import com.skinshelf.backend.dto.AssistantChatResponse;
import com.skinshelf.backend.dto.AssistantMessageResponse;
import com.skinshelf.backend.dto.IngredientAnalysisRequest;
import com.skinshelf.backend.dto.IngredientAnalysisResponse;
import com.skinshelf.backend.entity.User;
import com.skinshelf.backend.service.AssistantService;
import com.skinshelf.backend.service.IngredientAnalysisService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/assistant")
public class AssistantController {

    private final AssistantService assistantService;
    private final IngredientAnalysisService ingredientAnalysisService;

    public AssistantController(AssistantService assistantService, IngredientAnalysisService ingredientAnalysisService) {
        this.assistantService = assistantService;
        this.ingredientAnalysisService = ingredientAnalysisService;
    }

    @PostMapping("/chat")
    public ResponseEntity<AssistantChatResponse> chat(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody AssistantChatRequest request) {
        return ResponseEntity.ok(assistantService.chat(currentUser, request));
    }

    @GetMapping("/history")
    public ResponseEntity<List<AssistantMessageResponse>> history(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(assistantService.history(currentUser));
    }

    @DeleteMapping("/history")
    public ResponseEntity<Void> clearHistory(@AuthenticationPrincipal User currentUser) {
        assistantService.clearHistory(currentUser);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/analyze-ingredients")
    public ResponseEntity<IngredientAnalysisResponse> analyzeIngredients(
            @AuthenticationPrincipal User currentUser,
            @RequestBody IngredientAnalysisRequest request) {
        return ResponseEntity.ok(ingredientAnalysisService.analyze(currentUser, request));
    }
}
