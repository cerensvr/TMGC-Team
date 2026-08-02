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
                knowledgeBase,
                new RoutinePolicyEngine());

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

    @Test
    void fallbackUsesInactiveOwnedProductBeforeSuggestingANewPurchase() {
        IngredientKnowledgeBase knowledgeBase = new IngredientKnowledgeBase();
        AssistantService service = service(knowledgeBase);
        User user = user();
        UserProfile profile = profile();
        Product moisturizer = product(77L, "Bariyer Nemlendirici", "Nemlendirici", false, "Ceramide");

        stubFallbackContext(user, profile, List.of(moisturizer));

        AssistantChatRequest request = new AssistantChatRequest();
        request.setMessage("Yeni bir nemlendirici almalı mıyım?");
        AssistantChatResponse response = service.chat(user, request);

        assertEquals("PRODUCT_ANALYSIS", response.getMode());
        assertTrue(response.getSummary().contains("zaten dolabında"));
        assertTrue(response.getSuggestion().contains("Yeni ürün almadan önce"));
        assertTrue(response.getSuggestion().contains("Bariyer Nemlendirici"));
        assertTrue(response.getTags().contains("Rutinde pasif"));
        assertFalse(response.getAiResponse().contains("satın almanı öneririm"));
    }

    @Test
    void generalFallbackDoesNotBecomeIngredientAnalysisBecauseShelfContainsBha() {
        IngredientKnowledgeBase knowledgeBase = new IngredientKnowledgeBase();
        AssistantService service = service(knowledgeBase);
        User user = user();
        UserProfile profile = profile();
        Product bha = product(78L, "BHA Serum", "Serum", true, "Salicylic Acid");

        stubFallbackContext(user, profile, List.of(bha));

        AssistantChatRequest request = new AssistantChatRequest();
        request.setMessage("Merhaba Shelly, nasılsın?");
        AssistantChatResponse response = service.chat(user, request);

        assertEquals("GENERAL_CHAT", response.getMode());
        assertEquals("Shelly'nin Yorumu", response.getTitle());
        assertFalse(response.getAiResponse().contains("İçerik Analizi"));
        assertTrue(response.getReason().contains("gereksiz bir öneri"));
    }

    @Test
    void routineResponseCannotRecommendAnInactiveShelfProduct() throws Exception {
        IngredientKnowledgeBase knowledgeBase = new IngredientKnowledgeBase();
        AssistantService service = service(knowledgeBase);
        User user = user();
        UserProfile profile = profile();
        Product activeCleanser = product(81L, "Nazik Temizleyici", "Temizleyici", true, "Glycerin");
        Product inactiveRetinol = product(82L, "Retinol Serum", "Serum", false, "Retinol");

        JsonNode modelJson = new ObjectMapper().readTree("""
                {
                  "intentType": "INFO",
                  "detectedIssue": "Sabah rutini",
                  "mode": "GENERAL_CHAT",
                  "title": "Sabah rutini",
                  "summary": "Sabah rutinini sade tutabiliriz.",
                  "analysis": "Ürünlerini kullanım zamanına göre değerlendirdim.",
                  "recommendedProducts": [
                    {"id": 81, "reason": "İlk temizleme adımı."},
                    {"id": 82, "reason": "Model pasif ürünü yanlışlıkla önerdi."}
                  ],
                  "avoidProducts": [],
                  "followUpQuestions": [],
                  "suggestion": "Nazik bir sıra uygula.",
                  "warning": "",
                  "riskLevel": "low",
                  "tags": ["Sabah"]
                }
                """);

        when(safetyGuard.isRisky(anyString())).thenReturn(false);
        when(userProfileRepository.findByUserId(anyLong())).thenReturn(Optional.of(profile));
        when(productRepository.findByUserIdOrderByCreatedAtDesc(anyLong()))
                .thenReturn(List.of(activeCleanser, inactiveRetinol));
        when(skinLogRepository.findTop30ByUserOrderByCreatedAtDesc(user)).thenReturn(List.of());
        when(assistantMessageRepository.findTop50ByUserOrderByCreatedAtDesc(user)).thenReturn(List.of());
        when(geminiApiClient.isConfigured()).thenReturn(true);
        when(geminiApiClient.generateJsonWithStatus(
                anyString(), anyString(), isNull(), isNull(), any(JsonNode.class)))
                .thenReturn(new GeminiApiClient.GeminiJsonResult(
                        Optional.of(modelJson),
                        GeminiApiClient.FailureReason.NONE));
        when(assistantMessageRepository.save(any(AssistantMessage.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        AssistantChatRequest request = new AssistantChatRequest();
        request.setMessage("Sabah rutinimin sırası nasıl olmalı?");
        AssistantChatResponse response = service.chat(user, request);

        assertEquals("ROUTINE_CHECK", response.getMode());
        assertTrue(response.getAiResponse().contains("Nazik Temizleyici"));
        assertFalse(response.getAiResponse().contains("Retinol Serum"));

        ArgumentCaptor<String> userPrompt = ArgumentCaptor.forClass(String.class);
        verify(geminiApiClient).generateJsonWithStatus(
                anyString(), userPrompt.capture(), isNull(), isNull(), any(JsonNode.class));
        assertTrue(userPrompt.getValue().contains("Retinol Serum"));
        assertTrue(userPrompt.getValue().contains("durum: rutinde_pasif"));
    }

    @Test
    void modelPurchaseSuggestionIsReplacedWhenUserAlreadyOwnsAMatchingProduct() throws Exception {
        IngredientKnowledgeBase knowledgeBase = new IngredientKnowledgeBase();
        AssistantService service = service(knowledgeBase);
        User user = user();
        UserProfile profile = profile();
        Product moisturizer = product(91L, "Seramid Nemlendirici", "Nemlendirici", false, "Ceramide");

        JsonNode modelJson = new ObjectMapper().readTree("""
                {
                  "intentType": "INFO",
                  "detectedIssue": "Kuruluk",
                  "mode": "PRODUCT_ANALYSIS",
                  "title": "Nemlendirici seçimi",
                  "summary": "Hassas cildin için nem desteği düşünebiliriz.",
                  "analysis": "Seramid içeren ürünler bariyer desteğine yardımcı olabilir.",
                  "recommendedProducts": [],
                  "avoidProducts": [],
                  "followUpQuestions": [],
                  "suggestion": "Yeni bir seramidli krem satın alabilirsin.",
                  "warning": "",
                  "riskLevel": "low",
                  "tags": ["Nem"]
                }
                """);

        when(safetyGuard.isRisky(anyString())).thenReturn(false);
        when(userProfileRepository.findByUserId(anyLong())).thenReturn(Optional.of(profile));
        when(productRepository.findByUserIdOrderByCreatedAtDesc(anyLong())).thenReturn(List.of(moisturizer));
        when(skinLogRepository.findTop30ByUserOrderByCreatedAtDesc(user)).thenReturn(List.of());
        when(assistantMessageRepository.findTop50ByUserOrderByCreatedAtDesc(user)).thenReturn(List.of());
        when(geminiApiClient.isConfigured()).thenReturn(true);
        when(geminiApiClient.generateJsonWithStatus(
                anyString(), anyString(), isNull(), isNull(), any(JsonNode.class)))
                .thenReturn(new GeminiApiClient.GeminiJsonResult(
                        Optional.of(modelJson),
                        GeminiApiClient.FailureReason.NONE));
        when(assistantMessageRepository.save(any(AssistantMessage.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        AssistantChatRequest request = new AssistantChatRequest();
        request.setMessage("Yeni bir nemlendirici almalı mıyım?");
        AssistantChatResponse response = service.chat(user, request);

        assertTrue(response.getSuggestion().contains("rafındaki SkinShelf Seramid Nemlendirici"));
        assertTrue(response.getSuggestion().contains("rutinlerinde şu anda pasif"));
        assertFalse(response.getSuggestion().contains("satın al"));
    }

    @Test
    void fallbackRoutineExposesEvidenceMissingStepsAndSeparatesStrongActives() {
        IngredientKnowledgeBase knowledgeBase = new IngredientKnowledgeBase();
        AssistantService service = service(knowledgeBase);
        User user = user();
        UserProfile profile = profile();
        Product retinol = product(101L, "Retinol Serum", "Serum", true, "Retinol");
        Product bha = product(102L, "BHA Tonik", "Tonik", true, "Salicylic Acid");

        stubFallbackContext(user, profile, List.of(retinol, bha));

        AssistantChatRequest request = new AssistantChatRequest();
        request.setMessage("Dolabımdan haftalık rutin planı oluşturur musun?");
        AssistantChatResponse response = service.chat(user, request);

        assertEquals("WEEKLY_PLAN", response.getMode());
        assertTrue(response.isFallbackUsed());
        assertTrue(response.getUsedContext().stream().anyMatch(item -> item.type().equals("PROFILE")));
        assertTrue(response.getUsedContext().stream().anyMatch(item -> item.type().equals("SHELF")));
        assertEquals(2, response.getShelfProducts().size());
        assertEquals(3, response.getMissingCategories().size());
        assertTrue(response.getRoutineSteps().stream().anyMatch(step -> step.period().equals("MONDAY_EVENING")));
        assertTrue(response.getRoutineSteps().stream().anyMatch(step -> step.period().equals("THURSDAY_EVENING")));
        assertTrue(response.getRoutineSteps().stream().anyMatch(step -> step.status().equals("MISSING")));
        assertTrue(response.getSafetyWarnings().stream().noneMatch(warning -> warning.contains("aynı gece")));
        assertTrue(response.getWarning() == null || response.getWarning().isBlank());
        assertEquals("low", response.getRiskLevel());
    }

    @Test
    void purchaseFallbackNamesMissingCategoryWithoutInventingBrand() {
        IngredientKnowledgeBase knowledgeBase = new IngredientKnowledgeBase();
        AssistantService service = service(knowledgeBase);
        User user = user();
        UserProfile profile = profile();
        stubFallbackContext(user, profile, List.of());

        AssistantChatRequest request = new AssistantChatRequest();
        request.setMessage("Yeni bir nemlendirici almalı mıyım?");
        AssistantChatResponse response = service.chat(user, request);

        assertTrue(response.isFallbackUsed());
        assertTrue(response.getShelfProducts().isEmpty());
        assertEquals(1, response.getMissingCategories().size());
        assertTrue(response.getMissingCategories().get(0).startsWith("Nemlendirici"));
        assertFalse(response.getAiResponse().contains("marka satın al"));
    }

    @Test
    void clearHistoryDeletesPersistentConversationMemory() {
        IngredientKnowledgeBase knowledgeBase = new IngredientKnowledgeBase();
        AssistantService service = service(knowledgeBase);
        User user = user();

        service.clearHistory(user);

        verify(assistantMessageRepository).deleteByUser(user);
    }

    private AssistantService service(IngredientKnowledgeBase knowledgeBase) {
        return new AssistantService(
                assistantMessageRepository,
                geminiApiClient,
                productRepository,
                userProfileRepository,
                skinLogRepository,
                new ShellyPromptService(knowledgeBase),
                safetyGuard,
                knowledgeBase,
                new RoutinePolicyEngine());
    }

    private void stubFallbackContext(User user, UserProfile profile, List<Product> products) {
        when(safetyGuard.isRisky(anyString())).thenReturn(false);
        when(userProfileRepository.findByUserId(anyLong())).thenReturn(Optional.of(profile));
        when(productRepository.findByUserIdOrderByCreatedAtDesc(anyLong())).thenReturn(products);
        when(skinLogRepository.findTop30ByUserOrderByCreatedAtDesc(user)).thenReturn(List.of());
        when(assistantMessageRepository.findTop50ByUserOrderByCreatedAtDesc(user)).thenReturn(List.of());
        when(geminiApiClient.isConfigured()).thenReturn(false);
        when(assistantMessageRepository.save(any(AssistantMessage.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    private User user() {
        User user = new User();
        user.setId(7L);
        return user;
    }

    private UserProfile profile() {
        UserProfile profile = new UserProfile();
        profile.setNickname("Ceren");
        profile.setSkinTypeGuess("Hassas Cilt");
        profile.setMainGoal("Bariyeri korumak");
        profile.setSensitivity("Hassas");
        return profile;
    }

    private Product product(
            Long id,
            String name,
            String category,
            boolean active,
            String... ingredients) {
        Product product = new Product();
        product.setId(id);
        product.setBrand("SkinShelf");
        product.setName(name);
        product.setCategory(category);
        product.setTimeOfDay("both");
        product.setActiveIngredients(List.of(ingredients));
        product.setIsActive(active);
        return product;
    }
}
