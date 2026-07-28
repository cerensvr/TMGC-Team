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

@Service
public class SkinAnalysisService {

    private static final Logger log = LoggerFactory.getLogger(SkinAnalysisService.class);
    private static final List<String> LEVELS = List.of("low", "medium", "high", "unknown");

    private final SkinLogRepository skinLogRepository;
    private final GeminiApiClient geminiApiClient;
    private final ShellyPromptService shellyPromptService;
    private final ProductRepository productRepository;
    private final UserProfileRepository userProfileRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public SkinAnalysisService(
            SkinLogRepository skinLogRepository,
            GeminiApiClient geminiApiClient,
            ShellyPromptService shellyPromptService,
            ProductRepository productRepository,
            UserProfileRepository userProfileRepository) {
        this.skinLogRepository = skinLogRepository;
        this.geminiApiClient = geminiApiClient;
        this.shellyPromptService = shellyPromptService;
        this.productRepository = productRepository;
        this.userProfileRepository = userProfileRepository;
    }

    public SkinAnalysisResponse analyzeAndSave(User user, SkinAnalysisRequest request) {
        UserProfile profile = userProfileRepository.findByUserId(user.getId()).orElse(null);
        List<Product> products = productRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        List<SkinLog> recentLogs = skinLogRepository.findTop30ByUserOrderByCreatedAtDesc(user);

        SkinAnalysisResponse analysis = runAnalysis(profile, products, recentLogs, request);

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
                analysis.getRoutineConnection(),
                analysis.getSuggestion(),
                analysis.getWarning(),
                analysis.getRiskLevel(),
                analysis.getTags(),
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
        LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);
        List<SkinLog> weekLogs = skinLogRepository.findByUserAndCreatedAtAfterOrderByCreatedAtDesc(user, weekAgo);
        List<Product> newProducts = productRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .filter(product -> product.getCreatedAt() != null && product.getCreatedAt().isAfter(weekAgo))
                .toList();

        Map<String, String> trends = new LinkedHashMap<>();
        trends.put("dryness", trend(weekLogs, SkinLog::getDrynessLevel));
        trends.put("redness", trend(weekLogs, SkinLog::getRednessLevel));
        trends.put("oiliness", trend(weekLogs, SkinLog::getOilinessLevel));
        trends.put("blemish", trend(weekLogs, SkinLog::getBlemishLevel));

        List<String> newProductNames = newProducts.stream()
                .limit(5)
                .map(product -> product.getBrand() + " " + product.getName())
                .toList();

        return new SkinWeeklySummaryResponse(
                weekLogs.size(),
                trends,
                newProductNames,
                buildWeeklyComment(weekLogs.size(), trends, newProductNames));
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
        Map<String, String> visibleChanges = new LinkedHashMap<>();
        JsonNode changes = json.path("visibleChanges");
        visibleChanges.put("redness", normalizeLevel(changes.path("redness").asText("unknown")));
        visibleChanges.put("dryness", normalizeLevel(changes.path("dryness").asText("unknown")));
        visibleChanges.put("oiliness", normalizeLevel(changes.path("oiliness").asText("unknown")));
        visibleChanges.put("blemishAppearance", normalizeLevel(changes.path("blemishAppearance").asText("unknown")));
        visibleChanges.put("irritationAppearance", normalizeLevel(changes.path("irritationAppearance").asText("unknown")));

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
                textOrDefault(json.path("routineConnection"), "Rutinle belirgin bir bağlantı kurmak için birkaç kayıt daha faydalı olur."),
                textOrDefault(json.path("suggestion"), "Bugün rutini sade tutup nemlendirici ve SPF'e odaklanabilirsin."),
                textOrDefault(json.path("warning"), "Şiddetli yanma, şişlik, su toplama veya göz çevresinde reaksiyon varsa dermatoloğa danışman daha güvenli olur."),
                normalizeRisk(json.path("riskLevel").asText("low")),
                tags,
                null);
    }

    private SkinAnalysisResponse fallbackAnalysis(SkinAnalysisRequest request, boolean rateLimited) {
        String feeling = request.getSkinFeeling() == null ? "" : request.getSkinFeeling().toLowerCase(Locale.forLanguageTag("tr-TR"));

        Map<String, String> visibleChanges = new LinkedHashMap<>();
        visibleChanges.put("redness", feeling.contains("hassas") || feeling.contains("kızarık") ? "medium" : "unknown");
        visibleChanges.put("dryness", feeling.contains("kuru") || feeling.contains("gergin") ? "medium" : "unknown");
        visibleChanges.put("oiliness", feeling.contains("yağlı") || feeling.contains("parlak") ? "medium" : "unknown");
        visibleChanges.put("blemishAppearance", feeling.contains("sivilce") ? "medium" : "unknown");
        visibleChanges.put("irritationAppearance", feeling.contains("hassas") ? "medium" : "unknown");

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
                Boolean.TRUE.equals(request.getUsedNewProduct())
                        ? "Son 24 saatte yeni ürün kullanmışsın; cildinde değişim hissedersen önce bu ürünü gözlemlemek iyi olur."
                        : "Rutinle bağlantı kurmak için düzenli kayıt eklemeye devam et.",
                "Bugün rutini sade tutup nemlendirici ve SPF'e odaklanabilirsin.",
                "Şiddetli yanma, şişlik, su toplama veya göz çevresinde reaksiyon varsa dermatoloğa danışman daha güvenli olur.",
                "low",
                List.of("Cilt günlüğü"),
                null);
    }

    private String buildWeeklyComment(int logCount, Map<String, String> trends, List<String> newProducts) {
        if (logCount == 0) {
            return "Bu hafta henüz cilt kaydın yok. Birkaç kayıt eklersen haftalık değişimi birlikte yorumlayabiliriz.";
        }

        StringBuilder comment = new StringBuilder();
        boolean mentioned = false;

        if ("increased".equals(trends.get("dryness"))) {
            comment.append("Bu hafta kuruluk bildirimin arttı. ");
            mentioned = true;
        }
        if ("increased".equals(trends.get("redness"))) {
            comment.append("Kızarıklık görünümünde artış var. ");
            mentioned = true;
        }
        if ("increased".equals(trends.get("blemish"))) {
            comment.append("Sivilce benzeri görünümde artış kaydettin. ");
            mentioned = true;
        }

        if (!newProducts.isEmpty()) {
            comment.append("Aynı dönemde yeni ürün eklemişsin (")
                    .append(String.join(", ", newProducts))
                    .append("). Birkaç gün kullanım sıklığını azaltıp gözlemlemek iyi olabilir.");
        } else if (mentioned) {
            comment.append("Rutinini birkaç gün sade tutup değişimi gözlemlemek iyi olabilir.");
        } else {
            comment.append("Kayıtların dengeli görünüyor; rutinini aynı şekilde sürdürebilirsin.");
        }

        return comment.toString().trim();
    }

    private String trend(List<SkinLog> logs, java.util.function.Function<SkinLog, String> levelGetter) {
        if (logs.size() < 2) {
            return "unknown";
        }

        // Kayıtlar yeniden eskiye sıralı: son yarı ile ilk yarıyı karşılaştır.
        int midpoint = logs.size() / 2;
        double recentAvg = averageLevel(logs.subList(0, midpoint), levelGetter);
        double olderAvg = averageLevel(logs.subList(midpoint, logs.size()), levelGetter);

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
