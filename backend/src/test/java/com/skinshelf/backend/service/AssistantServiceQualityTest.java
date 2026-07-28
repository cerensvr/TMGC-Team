package com.skinshelf.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.skinshelf.backend.dto.AssistantChatRequest;
import com.skinshelf.backend.dto.AssistantChatResponse;
import com.skinshelf.backend.entity.AssistantMessage;
import com.skinshelf.backend.entity.Product;
import com.skinshelf.backend.entity.User;
import com.skinshelf.backend.entity.UserProfile;
import com.skinshelf.backend.repository.AssistantMessageRepository;
import com.skinshelf.backend.repository.ProductRepository;
import com.skinshelf.backend.repository.SkinLogRepository;
import com.skinshelf.backend.repository.UserProfileRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AssistantServiceQualityTest {

    @Mock
    private AssistantMessageRepository assistantMessageRepository;
    @Mock
    private GeminiApiClient geminiApiClient;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private UserProfileRepository userProfileRepository;
    @Mock
    private SkinLogRepository skinLogRepository;
    @Mock
    private SafetyGuard safetyGuard;

    @Test
    void enforcesBackendModeShelfIdsConflictSafetyAndSystemInstruction() throws Exception {
        IngredientKnowledgeBase knowledgeBase = new IngredientKnowledgeBase();
        ShellyPromptService promptService = new ShellyPromptService(knowledgeBase);
        AssistantService service = new AssistantService(
                assistantMessageRepository,
                geminiApiClient,
                productRepository,
                userProfileRepository,
                skinLogRepository,
                promptService,
                safetyGuard,
                knowledgeBase);

        User user = new User();
        user.setId(7L);
        UserProfile profile = new UserProfile();
        profile.setNickname("Ceren");
        profile.setSkinTypeGuess("Hassas Cilt");
        profile.setMainGoal("Kızarıklık görünümünü azaltmak");

        Product product = new Product();
        product.setId(42L);
        product.setBrand("SkinShelf");
        product.setName("Bariyer Kremi");
        product.setCategory("Nemlendirici");
        product.setTimeOfDay("both");
        product.setActiveIngredients(List.of("Ceramide"));
        product.setIsActive(true);

        JsonNode modelJson = new ObjectMapper().readTree("""
                {
                  "intentType": "ISSUE",
                  "detectedIssue": "Kızarıklık",
                  "mode": "GENERAL_CHAT",
                  "title": "Model modu yanlış seçti",
                  "summary": "Rafını değerlendirdim.",
                  "analysis": "Bariyer desteği düşünülebilir.",
                  "recommendedProducts": [
                    {"id": 42, "reason": "Bunu öneriyorum."},
                    {"id": 999, "reason": "Bu ürün kullanıcının rafında değil."}
                  ],
                  "avoidProducts": [
                    {"id": 42, "reason": "Mevcut reaksiyon geçene kadar ara ver."}
                  ],
                  "followUpQuestions": [],
                  "suggestion": "Rutini sadeleştir.",
                  "warning": "",
                  "riskLevel": "high",
                  "tags": ["Bariyer"]
                }
                """);

        when(safetyGuard.isRisky(anyString())).thenReturn(false);
        when(userProfileRepository.findByUserId(anyLong())).thenReturn(Optional.of(profile));
        when(productRepository.findByUserIdOrderByCreatedAtDesc(anyLong())).thenReturn(List.of(product));
        when(skinLogRepository.findTop30ByUserOrderByCreatedAtDesc(user)).thenReturn(List.of());
        when(assistantMessageRepository.findTop50ByUserOrderByCreatedAtDesc(user)).thenReturn(List.of());
        when(geminiApiClient.isConfigured()).thenReturn(true);
        when(geminiApiClient.generateJsonWithStatus(
                anyString(),
                anyString(),
                isNull(),
                isNull(),
                any(JsonNode.class)))
                .thenReturn(new GeminiApiClient.GeminiJsonResult(
                        Optional.of(modelJson),
                        GeminiApiClient.FailureReason.NONE));
        when(assistantMessageRepository.save(any(AssistantMessage.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        AssistantChatRequest request = new AssistantChatRequest();
        request.setMessage("Dolabımdaki ürün hassas cildime uygun mu?");
        AssistantChatResponse response = service.chat(user, request);

        assertEquals("PRODUCT_ANALYSIS", response.getMode());
        assertTrue(response.getSummary().contains("Ceren"));
        assertTrue(response.getAiResponse().contains("Kaçın: SkinShelf Bariyer Kremi"));
        assertFalse(response.getAiResponse().contains("Önerilen: SkinShelf Bariyer Kremi"));
        assertFalse(response.getAiResponse().contains("999"));
        assertTrue(response.getWarning().contains("sağlık profesyoneline"));

        ArgumentCaptor<String> systemInstruction = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> userPrompt = ArgumentCaptor.forClass(String.class);
        verify(geminiApiClient).generateJsonWithStatus(
                systemInstruction.capture(),
                userPrompt.capture(),
                isNull(),
                isNull(),
                any(JsonNode.class));
        assertEquals(ShellyPromptService.SYSTEM_PROMPT, systemInstruction.getValue());
        assertTrue(userPrompt.getValue().contains("Secilmis cevap modu: PRODUCT_ANALYSIS"));
        verify(assistantMessageRepository).save(any(AssistantMessage.class));
    }
}
