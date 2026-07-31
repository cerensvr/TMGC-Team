package com.skinshelf.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.skinshelf.backend.dto.SkinAnalysisRequest;
import com.skinshelf.backend.dto.SkinAnalysisResponse;
import com.skinshelf.backend.entity.SkinLog;
import com.skinshelf.backend.entity.User;
import com.skinshelf.backend.repository.ProductRepository;
import com.skinshelf.backend.repository.SkinLogRepository;
import com.skinshelf.backend.repository.UserProfileRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SkinAnalysisServiceVisionPolicyTest {

    @Mock
    private SkinLogRepository skinLogRepository;
    @Mock
    private GeminiApiClient geminiApiClient;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private UserProfileRepository userProfileRepository;

    @Test
    void poorPhotoQualityCannotCreateVisibleTrendEvidence() throws Exception {
        SkinAnalysisService service = serviceWithModelResponse("poor");

        SkinAnalysisResponse response = service.analyzeAndSave(user(), request());

        assertEquals("poor", response.getPhotoQuality());
        assertTrue(response.getVisibleChanges().values().stream().allMatch("unknown"::equals));
        assertTrue(response.getComparedToPrevious().values().stream().allMatch("unknown"::equals));
        assertTrue(response.getComparisonSummary().toLowerCase().contains("aynı açı, mesafe ve ışıkta"));
        assertFalse(response.isFallbackUsed());
    }

    @Test
    void goodPhotoCreatesComparableBaselineWithoutClaimingWeekOverWeekChange() throws Exception {
        SkinAnalysisService service = serviceWithModelResponse("good");

        SkinAnalysisResponse response = service.analyzeAndSave(user(), request());

        assertEquals("good", response.getPhotoQuality());
        assertEquals("medium", response.getVisibleChanges().get("redness"));
        assertEquals("high", response.getVisibleChanges().get("blemishAppearance"));
        assertTrue(response.getComparisonSummary().contains("ilk karşılaştırılabilir kaydın"));
    }

    private SkinAnalysisService serviceWithModelResponse(String photoQuality) throws Exception {
        IngredientKnowledgeBase knowledgeBase = new IngredientKnowledgeBase();
        ShellyPromptService promptService = new ShellyPromptService(knowledgeBase);
        SkinAnalysisService service = new SkinAnalysisService(
                skinLogRepository,
                geminiApiClient,
                promptService,
                knowledgeBase,
                productRepository,
                userProfileRepository);

        JsonNode modelJson = new ObjectMapper().readTree("""
                {
                  "title": "Shelly'nin Cilt Yorumu",
                  "summary": "Yanakta görünür değişimler var.",
                  "visibleChanges": {
                    "redness": "medium",
                    "dryness": "low",
                    "oiliness": "low",
                    "blemishAppearance": "high",
                    "irritationAppearance": "medium"
                  },
                  "photoQuality": "%s",
                  "photoQualityNote": "Işık ve netlik kontrol edildi.",
                  "routineConnection": "Tek fotoğraf kesin neden göstermez.",
                  "suggestion": "Rutini sade tut.",
                  "warning": "Belirtiler artarsa dermatoloğa danış.",
                  "riskLevel": "medium",
                  "tags": ["Fotoğraf analizi"]
                }
                """.formatted(photoQuality));

        when(userProfileRepository.findByUserId(anyLong())).thenReturn(Optional.empty());
        when(productRepository.findByUserIdOrderByCreatedAtDesc(anyLong())).thenReturn(List.of());
        when(skinLogRepository.findTop30ByUserOrderByCreatedAtDesc(any(User.class))).thenReturn(List.of());
        when(geminiApiClient.isConfigured()).thenReturn(true);
        when(geminiApiClient.generateJsonWithStatus(
                anyString(), anyString(), anyString(), anyString(), any(JsonNode.class)))
                .thenReturn(new GeminiApiClient.GeminiJsonResult(
                        Optional.of(modelJson),
                        GeminiApiClient.FailureReason.NONE));
        when(skinLogRepository.save(any(SkinLog.class))).thenAnswer(invocation -> {
            SkinLog saved = invocation.getArgument(0);
            saved.setId(41L);
            saved.setCreatedAt(LocalDateTime.now());
            return saved;
        });
        return service;
    }

    private User user() {
        User user = new User();
        user.setId(7L);
        user.setEmail("vision-policy@example.com");
        return user;
    }

    private SkinAnalysisRequest request() {
        SkinAnalysisRequest request = new SkinAnalysisRequest();
        request.setImageBase64("dGVzdA==");
        request.setImageMimeType("image/png");
        request.setSkinFeeling("Normal");
        request.setUsedNewProduct(false);
        return request;
    }
}
