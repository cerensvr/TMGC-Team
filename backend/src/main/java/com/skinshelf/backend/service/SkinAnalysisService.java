package com.skinshelf.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.skinshelf.backend.dto.SkinAnalysisRequest;
import com.skinshelf.backend.dto.SkinAnalysisResponse;
import com.skinshelf.backend.dto.SkinLogResponse;
import com.skinshelf.backend.dto.SkinWeeklySummaryResponse;
import com.skinshelf.backend.entity.Product;
import com.skinshelf.backend.entity.SkinLog;
import com.skinshelf.backend.entity.User;
import com.skinshelf.backend.entity.UserProfile;
import com.skinshelf.backend.repository.ProductRepository;
import com.skinshelf.backend.repository.SkinLogRepository;
import com.skinshelf.backend.repository.UserProfileRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class SkinAnalysisService {

    private static final Logger log = LoggerFactory.getLogger(SkinAnalysisService.class);
    private static final List<String> LEVELS = List.of("low", "medium", "high", "unknown");
    private static final Set<String> PHOTO_QUALITIES = Set.of("good", "acceptable", "poor", "unknown");
    private static final Set<String> TRACKED_ACID_RULES = Set.of("AHA", "BHA", "azelaic acid", "PHA");

    private final SkinLogRepository skinLogRepository;
    private final GeminiApiClient geminiApiClient;
    private final ShellyPromptService shellyPromptService;
    private final IngredientKnowledgeBase ingredientKnowledgeBase;
    private final ProductRepository productRepository;
    private final UserProfileRepository userProfileRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public SkinAnalysisService(
            SkinLogRepository skinLogRepository,
            GeminiApiClient geminiApiClient,
            ShellyPromptService shellyPromptService,
            IngredientKnowledgeBase ingredientKnowledgeBase,
            ProductRepository productRepository,
            UserProfileRepository userProfileRepository) {
        this.skinLogRepository = skinLogRepository;
        this.geminiApiClient = geminiApiClient;
        this.shellyPromptService = shellyPromptService;
        this.ingredientKnowledgeBase = ingredientKnowledgeBase;
        this.productRepository = productRepository;
        this.userProfileRepository = userProfileRepository;
    }

    public SkinAnalysisResponse analyzeAndSave(User user, SkinAnalysisRequest request) {
        UserProfile profile = userProfileRepository.findByUserId(user.getId()).orElse(null);
        List<Product> products = productRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        List<SkinLog> recentLogs = skinLogRepository.findTop30ByUserOrderByCreatedAtDesc(user);

        SkinAnalysisResponse rawAnalysis = runAnalysis(profile, products, recentLogs, request);
        boolean hasComparablePrevious = recentLogs.stream().anyMatch(this::isTrendEligible);
        boolean analysisComparable = isAnalysisComparable(rawAnalysis);
        Map<String, String> comparison = analysisComparable
                ? compareWithPrevious(rawAnalysis.getVisibleChanges(), recentLogs)
                : unknownComparison();
        String comparisonSummary = analysisComparable
                ? buildComparisonSummary(comparison, !hasComparablePrevious)
                : buildNonComparableSummary(rawAnalysis);
        SkinAnalysisResponse analysis = new SkinAnalysisResponse(
                null,
                rawAnalysis.getTitle(),
                rawAnalysis.getSummary(),
                rawAnalysis.getVisibleChanges(),
                rawAnalysis.getPhotoQuality(),
                rawAnalysis.getPhotoQualityNote(),
                rawAnalysis.getRoutineConnection(),
                rawAnalysis.getSuggestion(),
                rawAnalysis.getWarning(),
                rawAnalysis.getRiskLevel(),
                rawAnalysis.getTags(),
                comparison,
                comparisonSummary,
                buildAnalysisContext(profile, products, recentLogs, request),
                rawAnalysis.isFallbackUsed(),
                null);

        SkinLog skinLog = new SkinLog();
        skinLog.setUser(user);
        // Gizlilik: fotoğraf varsayılan olarak saklanmaz (discardPhoto=false açıkça gönderilmedikçe).
        skinLog.setPhotoUrl(null);
        skinLog.setSkinFeeling(request.getSkinFeeling());
        skinLog.setUsedNewProduct(request.getUsedNewProduct());
        skinLog.setUserNote(request.getUserNote());
        skinLog.setDrynessLevel(analysis.getVisibleChanges().get("dryness"));
        skinLog.setRednessLevel(analysis.getVisibleChanges().get("redness"));
        skinLog.setOilinessLevel(analysis.getVisibleChanges().get("oiliness"));
        skinLog.setBlemishLevel(analysis.getVisibleChanges().get("blemishAppearance"));
        skinLog.setIrritationLevel(analysis.getVisibleChanges().get("irritationAppearance"));
        skinLog.setAnalysisJson(toJson(analysis));
        SkinLog saved = skinLogRepository.save(skinLog);

        return new SkinAnalysisResponse(
                saved.getId(),
                analysis.getTitle(),
                analysis.getSummary(),
                analysis.getVisibleChanges(),
                analysis.getPhotoQuality(),
                analysis.getPhotoQualityNote(),
                analysis.getRoutineConnection(),
                analysis.getSuggestion(),
                analysis.getWarning(),
                analysis.getRiskLevel(),
                analysis.getTags(),
                analysis.getComparedToPrevious(),
                analysis.getComparisonSummary(),
                analysis.getUsedContext(),
                analysis.isFallbackUsed(),
                saved.getCreatedAt() == null
                        ? LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                        : saved.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
    }

    @Transactional(readOnly = true)
    public List<SkinLogResponse> listLogs(User user) {
        return skinLogRepository.findTop30ByUserOrderByCreatedAtDesc(user).stream()
                .map(SkinLogResponse::from)
                .toList();
    }

    public void deleteLog(User user, Long logId) {
        skinLogRepository.findByIdAndUser(logId, user).ifPresent(skinLogRepository::delete);
    }

    @Transactional(readOnly = true)
    public SkinWeeklySummaryResponse weeklySummary(User user) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime currentWeekStart = now.minusDays(7);
        LocalDateTime previousWeekStart = now.minusDays(14);
        List<SkinLog> twoWeekLogs = skinLogRepository
                .findByUserAndCreatedAtAfterOrderByCreatedAtDesc(user, previousWeekStart);
        List<SkinLog> weekLogs = twoWeekLogs.stream()
                .filter(item -> item.getCreatedAt() != null && !item.getCreatedAt().isBefore(currentWeekStart))
                .toList();
        List<SkinLog> previousWeekLogs = twoWeekLogs.stream()
                .filter(item -> item.getCreatedAt() != null
                        && !item.getCreatedAt().isBefore(previousWeekStart)
                        && item.getCreatedAt().isBefore(currentWeekStart))
                .toList();
        List<SkinLog> comparableWeekLogs = weekLogs.stream().filter(this::isTrendEligible).toList();
        List<SkinLog> comparablePreviousWeekLogs = previousWeekLogs.stream().filter(this::isTrendEligible).toList();

        List<Product> products = productRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        List<Product> newProducts = products.stream()
                .filter(product -> product.getCreatedAt() != null && product.getCreatedAt().isAfter(currentWeekStart))
                .toList();

        Map<String, String> trends = new LinkedHashMap<>();
        trends.put("dryness", trend(comparableWeekLogs, comparablePreviousWeekLogs, SkinLog::getDrynessLevel));
        trends.put("redness", trend(comparableWeekLogs, comparablePreviousWeekLogs, SkinLog::getRednessLevel));
        trends.put("oiliness", trend(comparableWeekLogs, comparablePreviousWeekLogs, SkinLog::getOilinessLevel));
        trends.put("blemish", trend(comparableWeekLogs, comparablePreviousWeekLogs, SkinLog::getBlemishLevel));
        trends.put("irritation", trend(
                comparableWeekLogs, comparablePreviousWeekLogs, SkinLog::getIrritationLevel));

        List<String> newProductNames = newProducts.stream()
                .limit(5)
                .map(product -> product.getBrand() + " " + product.getName())
                .toList();
        List<Product> monitoredAcidProducts = products.stream()
                .filter(product -> product.getIsActive() == null || product.getIsActive())
                .filter(this::isTrackedAcidProduct)
                .toList();
        List<String> monitoredActives = monitoredAcidProducts.stream()
                .limit(5)
                .map(product -> product.getBrand() + " " + product.getName())
                .toList();
        boolean hasNewAcidProduct = newProducts.stream().anyMatch(this::isTrackedAcidProduct);
        SkinLog latestComparableLog = comparableWeekLogs.isEmpty() ? null : comparableWeekLogs.get(0);
        ActiveGuidance activeGuidance = buildActiveGuidance(
                monitoredActives,
                hasNewAcidProduct,
                comparableWeekLogs.size(),
                comparablePreviousWeekLogs.size(),
                trends,
                latestComparableLog);

        return new SkinWeeklySummaryResponse(
                weekLogs.size(),
                comparableWeekLogs.size(),
                comparablePreviousWeekLogs.size(),
                trends,
                newProductNames,
                monitoredActives,
                activeGuidance.status(),
                activeGuidance.text(),
                buildWeeklyComment(
                        weekLogs.size(),
                        comparableWeekLogs.size(),
                        comparablePreviousWeekLogs.size(),
                        trends,
                        newProductNames));
    }

    private SkinAnalysisResponse runAnalysis(
            UserProfile profile,
            List<Product> products,
            List<SkinLog> recentLogs,
            SkinAnalysisRequest request) {
        boolean rateLimited = false;

        if (geminiApiClient.isConfigured() && request.getImageBase64() != null && !request.getImageBase64().isBlank()) {
            String prompt = shellyPromptService.buildSkinPhotoPrompt(
                    profile, products, recentLogs,
                    request.getSkinFeeling(), request.getUsedNewProduct(), request.getUserNote());

            var result = geminiApiClient.generateJsonWithStatus(
                    ShellyPromptService.SYSTEM_PROMPT,
                    prompt,
                    request.getImageBase64(),
                    request.getImageMimeType(),
                    shellyPromptService.buildSkinPhotoResponseSchema());
            if (result.json().isPresent()) {
                return parseAnalysis(result.json().get());
            }
            rateLimited = result.isRateLimited();
            log.warn("Gemini fotoğraf analizi başarısız; fallback yanıt kullanılacak.");
        }

        return fallbackAnalysis(request, rateLimited);
    }

    private SkinAnalysisResponse parseAnalysis(JsonNode json) {
        String photoQuality = normalizePhotoQuality(json.path("photoQuality").asText("unknown"));
        String photoQualityNote = textOrDefault(
                json.path("photoQualityNote"),
                "Fotoğraf kalitesi kesin olarak değerlendirilemedi.");
        Map<String, String> visibleChanges = new LinkedHashMap<>();
        JsonNode changes = json.path("visibleChanges");
        visibleChanges.put("redness", normalizeLevel(changes.path("redness").asText("unknown")));
        visibleChanges.put("dryness", normalizeLevel(changes.path("dryness").asText("unknown")));
        visibleChanges.put("oiliness", normalizeLevel(changes.path("oiliness").asText("unknown")));
        visibleChanges.put("blemishAppearance", normalizeLevel(changes.path("blemishAppearance").asText("unknown")));
        visibleChanges.put("irritationAppearance", normalizeLevel(changes.path("irritationAppearance").asText("unknown")));
        if ("poor".equals(photoQuality)) {
            visibleChanges.replaceAll((key, value) -> "unknown");
        }

        List<String> tags = new ArrayList<>();
        json.path("tags").forEach(tag -> {
            String value = tag.asText("").trim();
            if (!value.isBlank() && tags.size() < 5) {
                tags.add(value);
            }
        });

        return new SkinAnalysisResponse(
                null,
                textOrDefault(json.path("title"), "Shelly'nin Cilt Yorumu"),
                textOrDefault(json.path("summary"), "Cilt görünümün kaydedildi; belirgin bir değişim işareti görünmüyor."),
                visibleChanges,
                photoQuality,
                photoQualityNote,
                textOrDefault(json.path("routineConnection"), "Rutinle belirgin bir bağlantı kurmak için birkaç kayıt daha faydalı olur."),
                textOrDefault(json.path("suggestion"), "Bugün rutini sade tutup nemlendirici ve SPF'e odaklanabilirsin."),
                textOrDefault(json.path("warning"), "Şiddetli yanma, şişlik, su toplama veya göz çevresinde reaksiyon varsa dermatoloğa danışman daha güvenli olur."),
                normalizeRisk(json.path("riskLevel").asText("low")),
                tags,
                Map.of(),
                "",
                List.of(),
                false,
                null);
    }

    private SkinAnalysisResponse fallbackAnalysis(SkinAnalysisRequest request, boolean rateLimited) {
        String feeling = request.getSkinFeeling() == null ? "" : request.getSkinFeeling().toLowerCase(Locale.forLanguageTag("tr-TR"));

        Map<String, String> visibleChanges = new LinkedHashMap<>();
        visibleChanges.put("redness", "unknown");
        visibleChanges.put("dryness", "unknown");
        visibleChanges.put("oiliness", "unknown");
        visibleChanges.put("blemishAppearance", "unknown");
        visibleChanges.put("irritationAppearance", "unknown");

        String reasonText = rateLimited
                ? "Shelly şu an çok yoğun olduğu için görsel analiz yapılamadı; birazdan tekrar deneyebilirsin."
                : "Görsel analiz şu anda yapılamadı.";
        String summary = feeling.isBlank()
                ? "Kaydın alındı. " + reasonText + " Bugünkü hissiyatını not ettim."
                : "Kaydın alındı. Bugünkü hissiyatın (" + request.getSkinFeeling() + ") not edildi. " + reasonText;

        return new SkinAnalysisResponse(
                null,
                "Shelly'nin Cilt Yorumu",
                summary,
                visibleChanges,
                "unknown",
                "Görsel analiz tamamlanamadığı için bu kayıt haftalık fotoğraf karşılaştırmasına eklenmeyecek.",
                Boolean.TRUE.equals(request.getUsedNewProduct())
                        ? "Son 24 saatte yeni ürün kullanmışsın; cildinde değişim hissedersen önce bu ürünü gözlemlemek iyi olur."
                        : "Rutinle bağlantı kurmak için düzenli kayıt eklemeye devam et.",
                "Bugün rutini sade tutup nemlendirici ve SPF'e odaklanabilirsin.",
                "Şiddetli yanma, şişlik, su toplama veya göz çevresinde reaksiyon varsa dermatoloğa danışman daha güvenli olur.",
                "low",
                List.of("Cilt günlüğü"),
                Map.of(),
                "",
                List.of(),
                true,
                null);
    }

    private Map<String, String> compareWithPrevious(
            Map<String, String> current,
            List<SkinLog> recentLogs) {
        Map<String, String> comparison = new LinkedHashMap<>();
        SkinLog previous = recentLogs == null
                ? null
                : recentLogs.stream().filter(this::isTrendEligible).findFirst().orElse(null);
        comparison.put("redness", compareLevel(
                current.get("redness"), previous == null ? null : previous.getRednessLevel()));
        comparison.put("dryness", compareLevel(
                current.get("dryness"), previous == null ? null : previous.getDrynessLevel()));
        comparison.put("oiliness", compareLevel(
                current.get("oiliness"), previous == null ? null : previous.getOilinessLevel()));
        comparison.put("blemishAppearance", compareLevel(
                current.get("blemishAppearance"), previous == null ? null : previous.getBlemishLevel()));
        comparison.put("irritationAppearance", compareLevel(
                current.get("irritationAppearance"), previous == null ? null : previous.getIrritationLevel()));
        return comparison;
    }

    private Map<String, String> unknownComparison() {
        Map<String, String> comparison = new LinkedHashMap<>();
        comparison.put("redness", "unknown");
        comparison.put("dryness", "unknown");
        comparison.put("oiliness", "unknown");
        comparison.put("blemishAppearance", "unknown");
        comparison.put("irritationAppearance", "unknown");
        return comparison;
    }

    private String compareLevel(String current, String previous) {
        int currentScore = levelScore(current);
        int previousScore = levelScore(previous);
        if (currentScore < 0 || previousScore < 0) {
            return "unknown";
        }
        if (currentScore > previousScore) {
            return "increased";
        }
        if (currentScore < previousScore) {
            return "decreased";
        }
        return "stable";
    }

    private String buildComparisonSummary(Map<String, String> comparison, boolean firstRecord) {
        if (firstRecord) {
            return "Bu ilk karşılaştırılabilir kaydın. Düzenli kayıt ekledikçe görünür değişimleri önceki günlerle birlikte yorumlayacağım.";
        }

        List<String> increased = new ArrayList<>();
        List<String> decreased = new ArrayList<>();
        List<String> stable = new ArrayList<>();
        comparison.forEach((key, trend) -> {
            String label = changeLabel(key);
            if ("increased".equals(trend)) increased.add(label);
            if ("decreased".equals(trend)) decreased.add(label);
            if ("stable".equals(trend)) stable.add(label);
        });

        List<String> sentences = new ArrayList<>();
        if (!increased.isEmpty()) {
            sentences.add(String.join(", ", increased) + " görünümünde artış kaydedildi");
        }
        if (!decreased.isEmpty()) {
            sentences.add(String.join(", ", decreased) + " görünümünde azalma kaydedildi");
        }
        if (sentences.isEmpty() && !stable.isEmpty()) {
            sentences.add("Karşılaştırılabilir görünür işaretler önceki kayda göre dengeli");
        }
        if (sentences.isEmpty()) {
            return "Önceki kayıtla güvenilir karşılaştırma için henüz yeterli ortak görünür işaret yok.";
        }
        return String.join(". ", sentences) + ". Bu bir tıbbi teşhis değildir.";
    }

    private String buildNonComparableSummary(SkinAnalysisResponse analysis) {
        if (analysis.isFallbackUsed()) {
            return "Görsel analiz tamamlanamadığı için bu kayıt fotoğraf değişimi karşılaştırmasına eklenmedi.";
        }
        return "Fotoğraf kalitesi güvenilir karşılaştırma için yeterli değildi. Aynı açı, mesafe ve ışıkta net, "
                + "filtresiz bir fotoğrafla tekrar deneyebilirsin.";
    }

    private boolean isAnalysisComparable(SkinAnalysisResponse analysis) {
        return analysis != null
                && !analysis.isFallbackUsed()
                && ("good".equals(analysis.getPhotoQuality()) || "acceptable".equals(analysis.getPhotoQuality()))
                && hasComparableSignal(analysis.getVisibleChanges());
    }

    private boolean isTrendEligible(SkinLog skinLog) {
        if (skinLog == null || !hasComparableSignal(Map.of(
                "redness", valueOrUnknown(skinLog.getRednessLevel()),
                "dryness", valueOrUnknown(skinLog.getDrynessLevel()),
                "oiliness", valueOrUnknown(skinLog.getOilinessLevel()),
                "blemish", valueOrUnknown(skinLog.getBlemishLevel()),
                "irritation", valueOrUnknown(skinLog.getIrritationLevel())))) {
            return false;
        }
        if (skinLog.getAnalysisJson() == null || skinLog.getAnalysisJson().isBlank()) {
            return false;
        }
        try {
            JsonNode analysis = objectMapper.readTree(skinLog.getAnalysisJson());
            if (analysis.path("fallbackUsed").asBoolean(false)) {
                return false;
            }
            if (analysis.has("photoQuality")) {
                String photoQuality = normalizePhotoQuality(analysis.path("photoQuality").asText("unknown"));
                return "good".equals(photoQuality) || "acceptable".equals(photoQuality);
            }
            // Yeni kalite alanından önce oluşturulmuş, gerçek Gemini analizleri geriye dönük olarak kullanılabilir.
            return true;
        } catch (Exception exception) {
            log.debug("Cilt kaydı karşılaştırma uygunluğu okunamadı: {}", exception.getMessage());
            return false;
        }
    }

    private boolean hasComparableSignal(Map<String, String> signals) {
        return signals != null && signals.values().stream().anyMatch(value -> levelScore(value) >= 0);
    }

    private String valueOrUnknown(String value) {
        return value == null ? "unknown" : value;
    }

    private boolean isTrackedAcidProduct(Product product) {
        if (product == null) {
            return false;
        }
        String ingredients = product.getActiveIngredients() == null
                ? ""
                : String.join(" ", product.getActiveIngredients());
        String searchable = String.join(" ",
                valueOrEmpty(product.getName()),
                valueOrEmpty(product.getDescription()),
                ingredients);
        return ingredientKnowledgeBase.matchRules(searchable).keySet().stream().anyMatch(TRACKED_ACID_RULES::contains);
    }

    private String valueOrEmpty(String value) {
        return value == null ? "" : value;
    }

    private List<String> buildAnalysisContext(
            UserProfile profile,
            List<Product> products,
            List<SkinLog> recentLogs,
            SkinAnalysisRequest request) {
        List<String> context = new ArrayList<>();
        if (request.getImageBase64() != null && !request.getImageBase64().isBlank()) {
            context.add("Güncel cilt fotoğrafı");
        }
        if (request.getSkinFeeling() != null && !request.getSkinFeeling().isBlank()) {
            context.add("Bugünkü hissiyat: " + request.getSkinFeeling().trim());
        }
        if (Boolean.TRUE.equals(request.getUsedNewProduct())) {
            context.add("Son 24 saatte yeni ürün kullanımı");
        }
        if (profile != null) {
            List<String> profileSignals = new ArrayList<>();
            if (profile.getSkinTypeGuess() != null && !profile.getSkinTypeGuess().isBlank()) {
                profileSignals.add(profile.getSkinTypeGuess());
            }
            if (profile.getSensitivity() != null && !profile.getSensitivity().isBlank()) {
                profileSignals.add(profile.getSensitivity());
            }
            if (!profileSignals.isEmpty()) {
                context.add("Cilt profili: " + String.join(" • ", profileSignals));
            }
        }
        long activeProducts = products == null ? 0 : products.stream()
                .filter(product -> product.getIsActive() == null || product.getIsActive())
                .count();
        if (activeProducts > 0) {
            context.add("Aktif rutin: " + activeProducts + " dolap ürünü");
        }
        if (recentLogs != null && !recentLogs.isEmpty()) {
            context.add("Önceki cilt kaydıyla karşılaştırma");
        }
        return context.stream().limit(6).toList();
    }

    private String changeLabel(String key) {
        return switch (key) {
            case "redness" -> "Kızarıklık";
            case "dryness" -> "Kuruluk";
            case "oiliness" -> "Yağlanma";
            case "blemishAppearance" -> "Sivilce benzeri";
            case "irritationAppearance" -> "Hassasiyet";
            default -> "Cilt";
        };
    }

    private String buildWeeklyComment(
            int logCount,
            int comparableLogCount,
            int previousWeekComparableLogCount,
            Map<String, String> trends,
            List<String> newProducts) {
        if (logCount == 0) {
            return "Bu hafta henüz cilt kaydın yok. Birkaç kayıt eklersen haftalık değişimi birlikte yorumlayabiliriz.";
        }
        if (comparableLogCount == 0) {
            return "Bu haftaki kayıtların görsel karşılaştırmaya uygun değildi. Net, filtresiz ve önceki kayıtla "
                    + "aynı açı ile ışıkta yeni bir fotoğraf ekleyebilirsin.";
        }
        if (previousWeekComparableLogCount == 0) {
            return "Bu hafta " + comparableLogCount + " karşılaştırılabilir kayıt oluştu. Önceki haftada uygun kayıt "
                    + "olmadığı için değişim yönü henüz söylenemez; bu hafta yeni başlangıç noktan olacak.";
        }

        List<String> increased = new ArrayList<>();
        List<String> decreased = new ArrayList<>();
        trends.forEach((metric, trend) -> {
            if ("increased".equals(trend)) increased.add(weeklyMetricLabel(metric));
            if ("decreased".equals(trend)) decreased.add(weeklyMetricLabel(metric));
        });

        StringBuilder comment = new StringBuilder();
        if (!decreased.isEmpty()) {
            comment.append(String.join(", ", decreased)).append(" görünümünde önceki haftaya göre azalma var. ");
        }
        if (!increased.isEmpty()) {
            comment.append(String.join(", ", increased)).append(" görünümünde önceki haftaya göre artış var. ");
        }
        if (decreased.isEmpty() && increased.isEmpty()) {
            comment.append("Karşılaştırılabilir görünür işaretler önceki haftaya göre dengeli. ");
        }
        if (!newProducts.isEmpty()) {
            comment.append("Bu dönemde yeni ürün de eklenmiş (")
                    .append(String.join(", ", newProducts))
                    .append("); tek başına fotoğraf bu ürünün neden olduğunu göstermez. ");
        }
        comment.append("Bu, görünüm takibidir; tıbbi teşhis değildir.");
        return comment.toString().trim();
    }

    private ActiveGuidance buildActiveGuidance(
            List<String> monitoredActives,
            boolean hasNewAcidProduct,
            int comparableLogCount,
            int previousWeekComparableLogCount,
            Map<String, String> trends,
            SkinLog latestLog) {
        if (monitoredActives.isEmpty()) {
            return new ActiveGuidance("not_applicable", "");
        }

        String productNames = String.join(", ", monitoredActives);
        if (comparableLogCount == 0 || previousWeekComparableLogCount == 0) {
            return new ActiveGuidance(
                    "observe",
                    "Dolabındaki asit/peeling ürünleri (" + productNames + ") için haftalar arası yeterli görsel "
                            + "veri yok. Şimdilik kullanım sıklığını artırma; aynı koşullarda kayıt toplamaya devam et.");
        }

        if (hasLatestSafetyLevel(latestLog, "high")) {
            return new ActiveGuidance(
                    "pause",
                    "Son karşılaştırılabilir kayıtta belirgin kızarıklık, kuruluk veya tahriş görünümü var. "
                            + "Asit/peeling ürünlerine (" + productNames + ") şimdilik ara verip rutini sadeleştir; "
                            + "ağrı, şişlik veya yayılma varsa dermatoloğa danış.");
        }

        boolean safetyIncreased = "increased".equals(trends.get("redness"))
                || "increased".equals(trends.get("dryness"))
                || "increased".equals(trends.get("irritation"));
        if (safetyIncreased) {
            return new ActiveGuidance(
                    "reduce",
                    "Kızarıklık, kuruluk veya tahriş görünümünden en az biri arttı. " + productNames
                            + " için sıklığı artırma; birkaç kullanım azaltıp cildin sakinleşmesini gözlemle.");
        }

        if (hasNewAcidProduct) {
            return new ActiveGuidance(
                    "observe",
                    "Bu hafta yeni bir asit/peeling ürünü eklenmiş. Değişimi tek ürüne bağlamak için erken; yeni ürünü "
                            + "düşük sıklıkta, tek başına ve etiketiyle uyumlu kullanarak gözlemle.");
        }

        if (hasLatestSafetyLevel(latestLog, "medium")) {
            return new ActiveGuidance(
                    "observe",
                    "Son kayıtta hâlâ orta düzey kızarıklık, kuruluk veya tahriş görünümü var. " + productNames
                            + " için mevcut sıklığı artırma; yanma veya gerginlik varsa kullanıma ara ver.");
        }

        boolean hasSafetyEvidence = isKnownTrend(trends.get("redness"))
                || isKnownTrend(trends.get("dryness"))
                || isKnownTrend(trends.get("irritation"));
        if (!hasSafetyEvidence) {
            return new ActiveGuidance(
                    "observe",
                    "Sivilce görünümü izlenebilse de kızarıklık, kuruluk ve tahriş için yeterli ortak veri yok. "
                            + "Asit sıklığını değiştirmeden önce birkaç karşılaştırılabilir kayıt daha ekle.");
        }

        if ("decreased".equals(trends.get("blemish")) || "stable".equals(trends.get("blemish"))) {
            String progress = "decreased".equals(trends.get("blemish"))
                    ? "Sivilce benzeri görünüm azalırken"
                    : "Sivilce benzeri görünüm dengeliyken";
            return new ActiveGuidance(
                    "continue",
                    progress + " kızarıklık, kuruluk ve tahrişte artış görünmüyor. Yanma veya gerginlik de yoksa "
                            + productNames + " için mevcut kullanım sıklığını artırmadan sürdürebilirsin; ürün etiketi "
                            + "ve dermatolog önerisi her zaman önceliklidir.");
        }

        if ("increased".equals(trends.get("blemish"))) {
            return new ActiveGuidance(
                    "observe",
                    "Sivilce benzeri görünüm artmış; bu tek başına daha sık asit kullanmak için yeterli değil. "
                            + productNames + " sıklığını artırma ve birkaç hafta aynı düzenle takip et.");
        }

        return new ActiveGuidance(
                "observe",
                "Asit/peeling ürünlerinin sıklığını değiştirmek için henüz yeterli ortak görünür işaret yok; mevcut "
                        + "düzeni artırmadan izlemeye devam et.");
    }

    private String weeklyMetricLabel(String metric) {
        return switch (metric) {
            case "dryness" -> "Kuruluk";
            case "redness" -> "Kızarıklık";
            case "oiliness" -> "Yağlanma";
            case "blemish" -> "Sivilce benzeri";
            case "irritation" -> "Tahriş";
            default -> "Cilt";
        };
    }

    private boolean isKnownTrend(String trend) {
        return trend != null && !"unknown".equals(trend);
    }

    private boolean hasLatestSafetyLevel(SkinLog log, String level) {
        return log != null && (level.equals(log.getRednessLevel())
                || level.equals(log.getDrynessLevel())
                || level.equals(log.getIrritationLevel()));
    }

    private String trend(
            List<SkinLog> recentLogs,
            List<SkinLog> previousLogs,
            java.util.function.Function<SkinLog, String> levelGetter) {
        if (recentLogs.isEmpty() || previousLogs.isEmpty()) {
            return "unknown";
        }

        double recentAvg = averageLevel(recentLogs, levelGetter);
        double olderAvg = averageLevel(previousLogs, levelGetter);

        if (recentAvg < 0 || olderAvg < 0) {
            return "unknown";
        }
        if (recentAvg - olderAvg > 0.3) {
            return "increased";
        }
        if (olderAvg - recentAvg > 0.3) {
            return "decreased";
        }
        return "stable";
    }

    private record ActiveGuidance(String status, String text) {
    }

    private double averageLevel(List<SkinLog> logs, java.util.function.Function<SkinLog, String> levelGetter) {
        List<Integer> scores = logs.stream()
                .map(levelGetter)
                .map(this::levelScore)
                .filter(score -> score >= 0)
                .toList();
        if (scores.isEmpty()) {
            return -1;
        }
        return scores.stream().mapToInt(Integer::intValue).average().orElse(-1);
    }

    private int levelScore(String level) {
        return switch (level == null ? "" : level.trim().toLowerCase(Locale.ROOT)) {
            case "low" -> 0;
            case "medium" -> 1;
            case "high" -> 2;
            default -> -1;
        };
    }

    private String normalizeLevel(String level) {
        String normalized = level == null ? "" : level.trim().toLowerCase(Locale.ROOT);
        return LEVELS.contains(normalized) ? normalized : "unknown";
    }

    private String normalizePhotoQuality(String quality) {
        String normalized = quality == null ? "" : quality.trim().toLowerCase(Locale.ROOT);
        return PHOTO_QUALITIES.contains(normalized) ? normalized : "unknown";
    }

    private String normalizeRisk(String risk) {
        return switch (risk == null ? "" : risk.trim().toLowerCase(Locale.ROOT)) {
            case "high" -> "high";
            case "medium" -> "medium";
            default -> "low";
        };
    }

    private String textOrDefault(JsonNode node, String fallback) {
        String value = node.asText("").trim();
        return value.isBlank() ? fallback : value;
    }

    private String toJson(SkinAnalysisResponse analysis) {
        try {
            return objectMapper.writeValueAsString(analysis);
        } catch (Exception exception) {
            log.warn("Analiz JSON'a çevrilemedi: {}", exception.getMessage());
            return null;
        }
    }
}
