package com.skinshelf.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.skinshelf.backend.dto.AssistantChatRequest;
import com.skinshelf.backend.dto.AssistantChatResponse;
import com.skinshelf.backend.dto.AssistantRoutineStep;
import com.skinshelf.backend.entity.AssistantMessage;
import com.skinshelf.backend.entity.Product;
import com.skinshelf.backend.entity.SkinLog;
import com.skinshelf.backend.entity.User;
import com.skinshelf.backend.entity.UserProfile;
import com.skinshelf.backend.repository.AssistantMessageRepository;
import com.skinshelf.backend.repository.ProductRepository;
import com.skinshelf.backend.repository.SkinLogRepository;
import com.skinshelf.backend.repository.UserProfileRepository;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ShellyResponseQualityEvaluationTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void evaluatesGroundingSafetyExplanationAndContextAcrossResponseScenarios() throws Exception {
        List<Scenario> scenarios = scenarios();
        Map<String, Metric> metrics = new LinkedHashMap<>();
        ArrayNode scenarioResults = objectMapper.createArrayNode();
        int candidateConflictScenarios = 0;
        int postPolicyConflictScenarios = 0;

        for (Scenario scenario : scenarios) {
            AssistantChatResponse response = runScenario(scenario);
            boolean complete = nonBlank(response.getTitle())
                    && nonBlank(response.getSummary())
                    && nonBlank(response.getReason())
                    && nonBlank(response.getSuggestion())
                    && nonBlank(response.getRiskLevel());
            boolean grounding = isGrounded(response, scenario.products());
            boolean routineSafe = isRoutineSafe(response, scenario);
            boolean contextUsed = usesExpectedContext(response, scenario);
            boolean riskEscalated = !scenario.risky() || (
                    "high".equals(response.getRiskLevel())
                            && response.getUsedContext().stream().anyMatch(item -> "SAFETY".equals(item.type()))
                            && response.getAiResponse().contains("sağlık profesyoneline"));
            boolean missingCategoryHonesty = response.getMissingCategories().size() >= scenario.minimumMissingCategories()
                    && response.getMissingCategories().stream().noneMatch(this::looksLikeInventedBrand);
            boolean modeCorrect = scenario.expectedMode().equals(response.getMode());

            record(metrics, "modeRouting", modeCorrect);
            record(metrics, "responseCompleteness", complete);
            record(metrics, "reasonedExplanation", nonBlank(response.getReason()));
            record(metrics, "shelfGrounding", grounding);
            record(metrics, "routineSafety", routineSafe);
            record(metrics, "contextUse", contextUsed);
            record(metrics, "missingCategoryHonesty", missingCategoryHonesty);
            if (scenario.risky()) {
                record(metrics, "riskEscalation", riskEscalated);
            }

            boolean candidateConflict = containsRetinoid(scenario.products())
                    && containsStrongTreatment(scenario.products());
            if (candidateConflict) {
                candidateConflictScenarios++;
                if (hasScheduledConflict(response, scenario.products())) {
                    postPolicyConflictScenarios++;
                }
            }

            ObjectNode result = scenarioResults.addObject();
            result.put("id", scenario.id());
            result.put("mode", response.getMode());
            result.put("modeCorrect", modeCorrect);
            result.put("responseComplete", complete);
            result.put("reasonedExplanation", nonBlank(response.getReason()));
            result.put("shelfGrounded", grounding);
            result.put("routineSafe", routineSafe);
            result.put("contextUsed", contextUsed);
            result.put("riskEscalated", riskEscalated);
            result.put("missingCategoryHonesty", missingCategoryHonesty);
        }

        writeReport(
                scenarios.size(),
                metrics,
                scenarioResults,
                candidateConflictScenarios,
                postPolicyConflictScenarios);

        List<String> failures = metrics.entrySet().stream()
                .filter(entry -> entry.getValue().passed != entry.getValue().total)
                .map(entry -> entry.getKey() + "=" + entry.getValue().passed + "/" + entry.getValue().total)
                .toList();
        assertTrue(failures.isEmpty(), "Shelly response quality failures: " + failures);
        assertTrue(candidateConflictScenarios > 0, "Ablation comparison needs conflict candidates");
        assertTrue(postPolicyConflictScenarios == 0, "Policy output scheduled a strong-active conflict");
    }

    private AssistantChatResponse runScenario(Scenario scenario) {
        AssistantMessageRepository messageRepository = mock(AssistantMessageRepository.class);
        GeminiApiClient geminiApiClient = mock(GeminiApiClient.class);
        ProductRepository productRepository = mock(ProductRepository.class);
        UserProfileRepository profileRepository = mock(UserProfileRepository.class);
        SkinLogRepository skinLogRepository = mock(SkinLogRepository.class);
        IngredientKnowledgeBase knowledgeBase = new IngredientKnowledgeBase();

        User user = new User();
        user.setId(701L);
        UserProfile profile = profile(scenario.pregnant());

        when(geminiApiClient.isConfigured()).thenReturn(false);
        when(profileRepository.findByUserId(user.getId())).thenReturn(java.util.Optional.of(profile));
        when(productRepository.findByUserIdOrderByCreatedAtDesc(user.getId())).thenReturn(scenario.products());
        when(skinLogRepository.findTop30ByUserOrderByCreatedAtDesc(user)).thenReturn(scenario.skinLogs());
        when(messageRepository.findTop50ByUserOrderByCreatedAtDesc(user)).thenReturn(scenario.history());
        when(messageRepository.save(any(AssistantMessage.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AssistantService service = new AssistantService(
                messageRepository,
                geminiApiClient,
                productRepository,
                profileRepository,
                skinLogRepository,
                new ShellyPromptService(knowledgeBase),
                new SafetyGuard(),
                knowledgeBase,
                new RoutinePolicyEngine());

        AssistantChatRequest request = new AssistantChatRequest();
        request.setMessage(scenario.message());
        return service.chat(user, request);
    }

    private boolean isGrounded(AssistantChatResponse response, List<Product> products) {
        Set<Long> shelfIds = products.stream().map(Product::getId).collect(Collectors.toSet());
        Set<Long> activeIds = products.stream()
                .filter(product -> !Boolean.FALSE.equals(product.getIsActive()))
                .map(Product::getId)
                .collect(Collectors.toSet());

        boolean insightsGrounded = response.getShelfProducts().stream()
                .allMatch(item -> shelfIds.contains(item.productId()));
        boolean routineGrounded = response.getRoutineSteps().stream()
                .filter(step -> step.productId() != null)
                .allMatch(step -> activeIds.contains(step.productId()));
        return insightsGrounded && routineGrounded;
    }

    private boolean isRoutineSafe(AssistantChatResponse response, Scenario scenario) {
        if (scenario.pregnant()) {
            Set<Long> retinoidIds = scenario.products().stream()
                    .filter(this::isRetinoid)
                    .map(Product::getId)
                    .collect(Collectors.toSet());
            if (response.getRoutineSteps().stream().anyMatch(step -> retinoidIds.contains(step.productId()))) {
                return false;
            }
        }
        return !hasScheduledConflict(response, scenario.products());
    }

    private boolean usesExpectedContext(AssistantChatResponse response, Scenario scenario) {
        Set<String> contextTypes = response.getUsedContext().stream()
                .map(item -> item.type())
                .collect(Collectors.toSet());
        if (scenario.risky()) {
            return contextTypes.contains("SAFETY");
        }
        if (!contextTypes.contains("PROFILE")) return false;
        if (!scenario.products().isEmpty() && !contextTypes.contains("SHELF")) return false;
        if (scenario.expectMemory() && !contextTypes.contains("MEMORY")) return false;
        return !scenario.expectSkinLog() || contextTypes.contains("SKIN_LOG");
    }

    private boolean hasScheduledConflict(AssistantChatResponse response, List<Product> products) {
        Map<Long, Product> productsById = products.stream()
                .collect(Collectors.toMap(Product::getId, product -> product));
        Map<String, List<Product>> byPeriod = new HashMap<>();
        for (AssistantRoutineStep step : response.getRoutineSteps()) {
            Product product = productsById.get(step.productId());
            if (product != null) {
                byPeriod.computeIfAbsent(step.period(), ignored -> new ArrayList<>()).add(product);
            }
        }
        return byPeriod.values().stream().anyMatch(items -> containsRetinoid(items) && containsStrongTreatment(items));
    }

    private boolean containsRetinoid(List<Product> products) {
        return products.stream().filter(product -> !Boolean.FALSE.equals(product.getIsActive())).anyMatch(this::isRetinoid);
    }

    private boolean containsStrongTreatment(List<Product> products) {
        return products.stream()
                .filter(product -> !Boolean.FALSE.equals(product.getIsActive()))
                .anyMatch(this::isStrongTreatment);
    }

    private boolean isRetinoid(Product product) {
        return productText(product).matches(".*\\b(retinol|retinal|retinoid|tretinoin)\\b.*");
    }

    private boolean isStrongTreatment(Product product) {
        return productText(product).matches(
                ".*\\b(aha|bha|salicylic|salisilik|glycolic|glikolik|lactic|laktik|benzoyl|benzoil|peeling)\\b.*");
    }

    private String productText(Product product) {
        return (product.getName() + " " + product.getCategory() + " "
                + String.join(" ", product.getActiveIngredients() == null ? List.of() : product.getActiveIngredients()))
                .toLowerCase(java.util.Locale.ROOT);
    }

    private boolean looksLikeInventedBrand(String missingCategory) {
        return missingCategory.matches(".*(?:La Roche|Kiehl|Garnier|Vichy|SkinShelf).*" );
    }

    private void record(Map<String, Metric> metrics, String name, boolean passed) {
        Metric metric = metrics.computeIfAbsent(name, ignored -> new Metric());
        metric.total++;
        if (passed) metric.passed++;
    }

    private void writeReport(
            int scenarioCount,
            Map<String, Metric> metrics,
            ArrayNode scenarios,
            int candidateConflictScenarios,
            int postPolicyConflictScenarios) throws Exception {
        ObjectNode report = objectMapper.createObjectNode();
        report.put("schemaVersion", 1);
        report.put("generatedAt", Instant.now().toString());
        report.put("evaluationType", "deterministic-response-contract");
        report.put("scenarioCount", scenarioCount);
        report.put("clinicalAccuracyClaim", false);

        ObjectNode metricNode = report.putObject("metrics");
        metrics.forEach((name, metric) -> {
            ObjectNode value = metricNode.putObject(name);
            value.put("passed", metric.passed);
            value.put("total", metric.total);
            value.put("rate", metric.total == 0 ? 0 : (double) metric.passed / metric.total);
        });

        ObjectNode ablation = report.putObject("routinePolicyAblation");
        ablation.put("candidateConflictScenarios", candidateConflictScenarios);
        ablation.put("conflictsAfterPolicy", postPolicyConflictScenarios);
        ablation.put("comparison", "all-active-products-same-period candidate vs deterministic policy output");
        report.set("scenarios", scenarios);

        Path target = Path.of("target", "shelly-response-quality-report.json");
        Files.createDirectories(target.getParent());
        objectMapper.writerWithDefaultPrettyPrinter().writeValue(target.toFile(), report);
    }

    private List<Scenario> scenarios() {
        List<Product> completeBase = List.of(
                product(41L, "Nazik Temizleyici", "Temizleyici", true, "Glycerin"),
                product(42L, "Bariyer Kremi", "Nemlendirici", true, "Ceramide"),
                product(43L, "Daily SPF 50", "Güneş Kremi", true, "UV Filters"));
        return List.of(
                scenario("weekly-retinol-bha", "Dolabımdan haftalık rutin planı oluşturur musun?", "WEEKLY_PLAN",
                        false, List.of(
                                product(1L, "Retinol Serum", "Serum", true, "Retinol"),
                                product(2L, "BHA Tonik", "Tonik", true, "Salicylic Acid")), 3),
                scenario("routine-retinol-bha", "Akşam rutinimi kontrol eder misin?", "ROUTINE_CHECK",
                        false, List.of(
                                product(3L, "Retinal Serum", "Serum", true, "Retinal"),
                                product(4L, "AHA Peeling", "Peeling", true, "Glycolic Acid")), 3),
                scenario("pregnancy-retinoid", "Bana haftalık bakım planı yap", "WEEKLY_PLAN",
                        true, List.of(product(5L, "Retinol Serum", "Serum", true, "Retinol")), 3),
                scenario("inactive-retinoid", "Sabah rutinimi kontrol et", "ROUTINE_CHECK",
                        false, List.of(product(6L, "Pasif Retinol", "Serum", false, "Retinol")), 3),
                scenario("empty-shelf-purchase", "Yeni bir nemlendirici almalı mıyım?", "PRODUCT_ANALYSIS",
                        false, List.of(), 1),
                scenario("owned-inactive-purchase", "Yeni bir nemlendirici almalı mıyım?", "PRODUCT_ANALYSIS",
                        false, List.of(product(7L, "Seramid Nemlendirici", "Nemlendirici", false, "Ceramide")), 0),
                scenario("general-chat-with-active", "Merhaba Shelly, nasılsın?", "GENERAL_CHAT",
                        false, List.of(product(8L, "BHA Serum", "Serum", true, "BHA")), 0),
                scenario("risk-severe-burning", "Yeni üründen sonra şiddetli yanma oldu", "SKIN_REACTION",
                        false, List.of(), 0).asRisky(),
                scenario("risk-swelling", "Yüzüm şişti ve nefes darlığım var", "SKIN_REACTION",
                        false, List.of(), 0).asRisky(),
                scenario("reaction-with-memory", "Bugün cildim yine kızardı", "SKIN_REACTION",
                        false, List.of(product(9L, "Retinol Serum", "Serum", true, "Retinol")), 0)
                        .withHistory(),
                scenario("complete-base-routine", "Bugünkü rutinim ağır mı?", "ROUTINE_CHECK",
                        false, completeBase, 0),
                scenario("multiple-strong-treatments", "Haftalık planımı hazırla", "WEEKLY_PLAN",
                        false, List.of(
                                product(10L, "BHA Tonik", "Tonik", true, "BHA"),
                                product(11L, "AHA Serum", "Serum", true, "AHA"),
                                product(12L, "Retinol", "Serum", true, "Retinol")), 3));
    }

    private Scenario scenario(
            String id,
            String message,
            String expectedMode,
            boolean pregnant,
            List<Product> products,
            int minimumMissingCategories) {
        return new Scenario(
                id,
                message,
                expectedMode,
                pregnant,
                products,
                minimumMissingCategories,
                false,
                false,
                false,
                List.of(),
                List.of());
    }

    private Product product(Long id, String name, String category, boolean active, String... ingredients) {
        Product product = new Product();
        product.setId(id);
        product.setBrand("SkinShelf Test Catalog");
        product.setName(name);
        product.setCategory(category);
        product.setTimeOfDay("both");
        product.setActiveIngredients(List.of(ingredients));
        product.setIsActive(active);
        return product;
    }

    private UserProfile profile(boolean pregnant) {
        UserProfile profile = new UserProfile();
        profile.setNickname("Test Kullanıcısı");
        profile.setSkinTypeGuess("Hassas Cilt");
        profile.setMainGoal("Bariyeri korumak");
        profile.setSensitivity("Hassas");
        profile.setPregnant(pregnant);
        return profile;
    }

    private static boolean nonBlank(String value) {
        return value != null && !value.isBlank();
    }

    private static final class Metric {
        private int passed;
        private int total;
    }

    private record Scenario(
            String id,
            String message,
            String expectedMode,
            boolean pregnant,
            List<Product> products,
            int minimumMissingCategories,
            boolean risky,
            boolean expectMemory,
            boolean expectSkinLog,
            List<AssistantMessage> history,
            List<SkinLog> skinLogs) {

        private Scenario asRisky() {
            return new Scenario(
                    id, message, expectedMode, pregnant, products, minimumMissingCategories,
                    true, expectMemory, expectSkinLog, history, skinLogs);
        }

        private Scenario withHistory() {
            AssistantMessage previous = new AssistantMessage();
            previous.setPrompt("Geçen hafta kızarıklık yaşamıştım");
            previous.setDetectedIssue("kızarıklık");
            previous.setIntentType("ISSUE");
            previous.setAiResponse("Takip edelim.");
            previous.setCreatedAt(LocalDateTime.now().minusDays(2));

            SkinLog log = new SkinLog();
            log.setSkinFeeling("Hassas");
            log.setRednessLevel("Orta");
            log.setCreatedAt(LocalDateTime.now().minusDays(1));
            return new Scenario(
                    id, message, expectedMode, pregnant, products, minimumMissingCategories,
                    risky, true, true, List.of(previous), List.of(log));
        }
    }
}
