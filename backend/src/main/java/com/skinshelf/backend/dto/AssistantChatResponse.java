package com.skinshelf.backend.dto;

import lombok.Getter;

import java.util.List;

@Getter
public class AssistantChatResponse {
    private String intentType;
    private String detectedIssue;
    /** Düz metin yanıt (geriye dönük uyumluluk + sohbet balonu). */
    private String aiResponse;

    // Yapılandırılmış Shelly yanıtı
    private String mode;
    private String title;
    private String summary;
    private String reason;
    private String suggestion;
    private String warning;
    private String riskLevel;
    private List<String> tags;

    // Backend tarafından doğrulanan açıklanabilirlik ve eylem alanları.
    private List<AssistantContextEvidence> usedContext;
    private List<AssistantProductInsight> shelfProducts;
    private List<String> missingCategories;
    private List<AssistantRoutineStep> routineSteps;
    private List<String> safetyWarnings;
    private boolean fallbackUsed;

    public AssistantChatResponse(
            String intentType,
            String detectedIssue,
            String aiResponse,
            String mode,
            String title,
            String summary,
            String reason,
            String suggestion,
            String warning,
            String riskLevel,
            List<String> tags) {
        this(
                intentType,
                detectedIssue,
                aiResponse,
                mode,
                title,
                summary,
                reason,
                suggestion,
                warning,
                riskLevel,
                tags,
                List.of(),
                List.of(),
                List.of(),
                List.of(),
                List.of(),
                false);
    }

    public AssistantChatResponse(
            String intentType,
            String detectedIssue,
            String aiResponse,
            String mode,
            String title,
            String summary,
            String reason,
            String suggestion,
            String warning,
            String riskLevel,
            List<String> tags,
            List<AssistantContextEvidence> usedContext,
            List<AssistantProductInsight> shelfProducts,
            List<String> missingCategories,
            List<AssistantRoutineStep> routineSteps,
            List<String> safetyWarnings,
            boolean fallbackUsed) {
        this.intentType = intentType;
        this.detectedIssue = detectedIssue;
        this.aiResponse = aiResponse;
        this.mode = mode;
        this.title = title;
        this.summary = summary;
        this.reason = reason;
        this.suggestion = suggestion;
        this.warning = warning;
        this.riskLevel = riskLevel;
        this.tags = tags == null ? List.of() : List.copyOf(tags);
        this.usedContext = usedContext == null ? List.of() : List.copyOf(usedContext);
        this.shelfProducts = shelfProducts == null ? List.of() : List.copyOf(shelfProducts);
        this.missingCategories = missingCategories == null ? List.of() : List.copyOf(missingCategories);
        this.routineSteps = routineSteps == null ? List.of() : List.copyOf(routineSteps);
        this.safetyWarnings = safetyWarnings == null ? List.of() : List.copyOf(safetyWarnings);
        this.fallbackUsed = fallbackUsed;
    }

    public AssistantChatResponse withDecisionDetails(
            List<AssistantContextEvidence> context,
            List<AssistantProductInsight> products,
            List<String> missing,
            List<AssistantRoutineStep> routine,
            List<String> warnings,
            boolean usedFallback) {
        return new AssistantChatResponse(
                intentType,
                detectedIssue,
                aiResponse,
                mode,
                title,
                summary,
                reason,
                suggestion,
                warning,
                riskLevel,
                tags,
                context,
                products,
                missing,
                routine,
                warnings,
                usedFallback);
    }

    public static AssistantChatResponse legacy(String intentType, String detectedIssue, String aiResponse) {
        return new AssistantChatResponse(
                intentType,
                detectedIssue,
                aiResponse,
                "GENERAL_CHAT",
                "Shelly'nin Yorumu",
                aiResponse,
                null,
                null,
                null,
                "low",
                List.of());
    }
}
