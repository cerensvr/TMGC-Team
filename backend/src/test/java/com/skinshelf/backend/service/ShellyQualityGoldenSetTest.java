package com.skinshelf.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.skinshelf.backend.service.ShellyPromptService.ShellyMode;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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

        assertEquals(100, cases.size());

        int correct = 0;
        Map<String, ModeMetric> modeMetrics = new LinkedHashMap<>();
        List<EvaluationMismatch> mismatches = new ArrayList<>();
        for (GoldenCase testCase : cases) {
            String actualMode = promptService.detectMode(testCase.message()).name();
            ModeMetric metric = modeMetrics.computeIfAbsent(testCase.expectedMode(), ignored -> new ModeMetric());
            metric.total++;
            if (testCase.expectedMode().equals(actualMode)) {
                correct++;
                metric.correct++;
            } else {
                mismatches.add(new EvaluationMismatch(testCase.message(), testCase.expectedMode(), actualMode));
            }
        }

        writeEvaluationArtifact(cases.size(), correct, modeMetrics, mismatches);
        assertTrue(mismatches.isEmpty(), "Yanlış sınıflanan senaryolar: " + mismatches);
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

    private void writeEvaluationArtifact(
            int total,
            int correct,
            Map<String, ModeMetric> metrics,
            List<EvaluationMismatch> mismatches) throws Exception {
        var report = objectMapper.createObjectNode();
        report.put("schemaVersion", 1);
        report.put("generatedAt", Instant.now().toString());
        report.put("dataset", "shelly-golden-cases.json");
        report.put("totalScenarios", total);
        report.put("correctScenarios", correct);
        report.put("routingAccuracy", total == 0 ? 0 : (double) correct / total);

        var byMode = report.putObject("byMode");
        metrics.forEach((mode, metric) -> {
            var value = byMode.putObject(mode);
            value.put("total", metric.total);
            value.put("correct", metric.correct);
            value.put("accuracy", metric.total == 0 ? 0 : (double) metric.correct / metric.total);
        });
        report.set("mismatches", objectMapper.valueToTree(mismatches));

        Path output = Path.of("target", "shelly-eval-report.json");
        Files.createDirectories(output.getParent());
        objectMapper.writerWithDefaultPrettyPrinter().writeValue(output.toFile(), report);
    }

    private static final class ModeMetric {
        private int total;
        private int correct;
    }

    private record EvaluationMismatch(String message, String expectedMode, String actualMode) {
    }
}
