package com.skinshelf.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.skinshelf.backend.entity.AssistantMessage;
import com.skinshelf.backend.entity.Product;
import com.skinshelf.backend.entity.SkinLog;
import com.skinshelf.backend.entity.UserProfile;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ShellyPromptServiceTest {

    private final ShellyPromptService service = new ShellyPromptService(new IngredientKnowledgeBase());

    @Test
    void chatPromptIncludesPersonalProfileShelfAndSafetyContext() {
        UserProfile profile = profile();
        Product product = product();
        SkinLog skinLog = new SkinLog();
        skinLog.setSkinFeeling("Biraz kuru");
        skinLog.setDrynessLevel("medium");
        skinLog.setRednessLevel("low");
        skinLog.setUserNote("Yeni serum kullandım");

        String prompt = service.buildChatPrompt(
                profile,
                List.of(product),
                List.of(skinLog),
                List.of(),
                "Bugünkü rutinim ağır mı?");

        assertTrue(prompt.contains("nickname: Ceren"));
        assertTrue(prompt.contains("skinType: Karma Cilt"));
        assertTrue(prompt.contains("mainGoal: Leke görünümünü azaltmak"));
        assertTrue(prompt.contains("allergens: Parfüm"));
        assertTrue(prompt.contains("id: 42 | marka: SkinShelf Lab | isim: BHA Serum"));
        assertTrue(prompt.contains("Ilk cumlede kullanicinin adini"));
        assertTrue(prompt.contains("En fazla 2 takip sorusu"));
        assertTrue(prompt.contains("yalnizca userProducts icindeki gercek ID'leri"));
    }

    @Test
    void chatPromptFiltersKnowledgeBaseToConversationAndShelf() {
        String prompt = service.buildChatPrompt(
                profile(),
                List.of(product()),
                List.of(),
                List.of(),
                "Bugünkü rutinim ağır mı?");

        assertTrue(prompt.contains("- BHA:"));
        assertFalse(prompt.contains("- retinol:"));
        assertTrue(prompt.contains("Shelly cevap standardi"));
    }

    @Test
    void conversationStateCarriesLatestDetectedIssue() {
        AssistantMessage earlier = messageWithIssue("Kuruluk");
        AssistantMessage latest = messageWithIssue("Kızarıklık");

        String prompt = service.buildChatPrompt(
                profile(),
                List.of(product()),
                List.of(),
                List.of(earlier, latest),
                "Bugün nasıl ilerleyeyim?");

        assertTrue(prompt.contains("aktif cilt derdi/hedefi: Kızarıklık"));
        assertFalse(prompt.contains("aktif cilt derdi/hedefi: Kuruluk"));
        assertTrue(prompt.contains("bastan sorma"));
    }

    @Test
    void responseSchemaKeepsThePersonalizedAnswerContract() {
        JsonNode schema = service.buildChatResponseSchema();
        JsonNode properties = schema.path("properties");

        assertEquals("OBJECT", schema.path("type").asText());
        assertTrue(properties.has("suggestion"));
        assertTrue(properties.has("warning"));
        assertEquals("INTEGER",
                properties.path("recommendedProducts").path("items")
                        .path("properties").path("id").path("type").asText());
        assertTrue(schema.path("required").toString().contains("\"suggestion\""));
        assertTrue(schema.path("required").toString().contains("\"warning\""));
    }

    @Test
    void extendedKnowledgeBaseUsesFilteredAndSafeRules() {
        IngredientKnowledgeBase knowledgeBase = new IngredientKnowledgeBase();
        Map<String, List<String>> matched = knowledgeBase.matchRules(
                "tretinoin, azelaik asit, peptit, zinc pca ve spf50");

        assertTrue(matched.keySet().containsAll(
                List.of("tretinoin", "azelaic acid", "peptide", "zinc", "SPF")));
        String tretinoinFacts = String.join(" ", matched.get("tretinoin"));
        assertTrue(tretinoinFacts.contains("sağlık profesyoneli"));
        assertFalse(tretinoinFacts.contains("zorunludur"));
        assertFalse(tretinoinFacts.contains("beklenen bir yan etkidir"));
    }

    @Test
    void chatHistoryIsBoundedToKeepResponsesFocused() {
        AssistantMessage message = new AssistantMessage();
        message.setPrompt("Rutinimi değerlendir " + "p".repeat(500));
        message.setAiResponse("Uzun yanıt " + "a".repeat(1_200));

        String prompt = service.buildChatPrompt(
                profile(),
                List.of(product()),
                List.of(),
                List.of(message),
                "Devam edelim");

        assertTrue(prompt.contains("Sohbet Gecmisi (Hafiza)"));
        assertTrue(prompt.contains("…"));
        assertTrue(prompt.length() < 11_000);
    }

    @Test
    void detectsGoldenDemoModesConsistently() {
        assertEquals(ShellyPromptService.ShellyMode.ROUTINE_CHECK,
                service.detectMode("Bugünkü rutinim ağır mı?"));
        assertEquals(ShellyPromptService.ShellyMode.INGREDIENT_ANALYSIS,
                service.detectMode("Bu iki ürün birlikte kullanılır mı?"));
        assertEquals(ShellyPromptService.ShellyMode.SKIN_REACTION,
                service.detectMode("Cildim kızardı ve yanıyor"));
        assertEquals(ShellyPromptService.ShellyMode.WEEKLY_PLAN,
                service.detectMode("Aktifleri haftaya yay"));
        assertEquals(ShellyPromptService.ShellyMode.PRODUCT_ANALYSIS,
                service.detectMode("Bu yeni ürün bana uygun mu?"));
    }

    @Test
    void skinPhotoPromptUsesTheSamePersonalizationContract() {
        String prompt = service.buildSkinPhotoPrompt(
                profile(),
                List.of(product()),
                List.of(),
                "Kuru ve hassas",
                true,
                "Dün yeni serum kullandım");

        assertTrue(prompt.contains("nickname: Ceren"));
        assertTrue(prompt.contains("Son 24 saatte yeni urun: Evet"));
        assertTrue(prompt.contains("Fotograftaki cilt gorunumunu degerlendir"));
        assertTrue(prompt.contains("Teshis koyma"));
    }

    private AssistantMessage messageWithIssue(String issue) {
        AssistantMessage message = new AssistantMessage();
        message.setPrompt("Cildimde değişiklik var");
        message.setAiResponse("Takip edelim");
        message.setDetectedIssue(issue);
        return message;
    }

    private UserProfile profile() {
        UserProfile profile = new UserProfile();
        profile.setNickname("Ceren");
        profile.setSkinTypeGuess("Karma Cilt");
        profile.setMainGoal("Leke görünümünü azaltmak");
        profile.setSensitivity("Bazen hassas");
        profile.setExperience("Aktif içerikleri biliyorum");
        profile.setAgeRange("25-34");
        profile.setCurrentRoutine(List.of("Temizleyici", "Nemlendirici", "Güneş kremi"));
        profile.setRecentActives(List.of("BHA"));
        profile.setConcerns(List.of("Leke", "Kuruluk"));
        profile.setAllergens(List.of("Parfüm"));
        profile.setConditions(List.of());
        profile.setPregnant(false);
        return profile;
    }

    private Product product() {
        Product product = new Product();
        product.setId(42L);
        product.setBrand("SkinShelf Lab");
        product.setName("BHA Serum");
        product.setCategory("Serum");
        product.setTimeOfDay("evening");
        product.setActiveIngredients(List.of("Salicylic Acid"));
        product.setIsActive(true);
        return product;
    }
}
