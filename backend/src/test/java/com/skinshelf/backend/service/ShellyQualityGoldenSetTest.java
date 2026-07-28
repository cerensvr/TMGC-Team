package com.skinshelf.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.skinshelf.backend.service.ShellyPromptService.ShellyMode;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ShellyQualityGoldenSetTest {

    private static final Pattern EXAMPLE_JSON = Pattern.compile(
            "<assistant_json>(.*?)</assistant_json>",
            Pattern.DOTALL);

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ShellyPromptService promptService = new ShellyPromptService(new IngredientKnowledgeBase());

    @Test
    void classifiesAllGoldenConversationScenarios() throws Exception {
        List<GoldenCase> cases;
        try (InputStream stream = getClass().getResourceAsStream("/shelly-golden-cases.json")) {
            assertNotNull(stream);
            cases = objectMapper.readValue(stream, new TypeReference<>() {
            });
        }

        assertEquals(42, cases.size());
        assertAll(cases.stream()
                .map(testCase -> () -> assertEquals(
                        testCase.expectedMode(),
                        promptService.detectMode(testCase.message()).name(),
                        testCase.message())));
    }

    @Test
    void everyChatModeHasTwoValidAndCompleteExamples() throws Exception {
        ShellyFewShotLibrary library = new ShellyFewShotLibrary();
        for (ShellyMode mode : ShellyMode.values()) {
            if (mode == ShellyMode.SKIN_PHOTO_ANALYSIS) {
                continue;
            }
            String section = library.examplesFor(mode);
            Matcher matcher = EXAMPLE_JSON.matcher(section);
            int count = 0;
            while (matcher.find()) {
                JsonNode json = objectMapper.readTree(matcher.group(1));
                assertEquals(mode.name(), json.path("mode").asText());
                assertTrue(json.has("summary"));
                assertTrue(json.has("analysis"));
                assertTrue(json.path("recommendedProducts").isArray());
                assertTrue(json.path("avoidProducts").isArray());
                assertTrue(json.path("followUpQuestions").isArray());
                assertTrue(json.path("tags").isArray());
                count++;
            }
            assertEquals(2, count, mode + " için iki örnek olmalı");
        }
    }

    @Test
    void shortIngredientAliasesDoNotMatchInsideUnrelatedWords() {
        IngredientKnowledgeBase knowledgeBase = new IngredientKnowledgeBase();

        assertFalse(knowledgeBase.matchRules("Daha sade bir rutin istiyorum").containsKey("AHA"));
        assertFalse(knowledgeBase.matchRules("Sabah bakımımı anlat").containsKey("BHA"));
        assertTrue(knowledgeBase.matchRules("AHA ve BHA kullanıyorum").keySet()
                .containsAll(List.of("AHA", "BHA")));
    }

    private record GoldenCase(String message, String expectedMode) {
    }
}
