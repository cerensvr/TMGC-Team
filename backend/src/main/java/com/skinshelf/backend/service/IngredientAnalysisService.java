package com.skinshelf.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.skinshelf.backend.dto.IngredientAnalysisRequest;
import com.skinshelf.backend.dto.IngredientAnalysisResponse;
import com.skinshelf.backend.entity.Product;
import com.skinshelf.backend.entity.User;
import com.skinshelf.backend.entity.UserProfile;
import com.skinshelf.backend.repository.ProductRepository;
import com.skinshelf.backend.repository.UserProfileRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
public class IngredientAnalysisService {

    private final GeminiApiClient geminiApiClient;
    private final ProductRepository productRepository;
    private final UserProfileRepository userProfileRepository;
    private final IngredientKnowledgeBase knowledgeBase;

    public IngredientAnalysisService(
            GeminiApiClient geminiApiClient,
            ProductRepository productRepository,
            UserProfileRepository userProfileRepository,
            IngredientKnowledgeBase knowledgeBase) {
        this.geminiApiClient = geminiApiClient;
        this.productRepository = productRepository;
        this.userProfileRepository = userProfileRepository;
        this.knowledgeBase = knowledgeBase;
    }

    public IngredientAnalysisResponse analyze(User user, IngredientAnalysisRequest request) {
        Optional<UserProfile> profile = userProfileRepository.findByUserId(user.getId());
        List<Product> shelfProducts = productRepository.findByUserIdOrderByCreatedAtDesc(user.getId());

        if (geminiApiClient.isConfigured()) {
            Optional<JsonNode> json = geminiApiClient.generateJson(buildPrompt(profile.orElse(null), shelfProducts, request));
            if (json.isPresent()) {
                return fromJson(json.get(), request, shelfProducts);
            }
        }

        return fallbackAnalysis(profile.orElse(null), shelfProducts, request);
    }

    private String buildPrompt(UserProfile profile, List<Product> shelfProducts, IngredientAnalysisRequest request) {
        String searchText = String.join(" ",
                emptyIfNull(request.getActiveIngredients())) + " " + value(request.getDescription());
        return """
                SkinShelf icin kozmetik urun icerik analizi yap.
                Tani koyma, medikal iddia uretme, dermatolog uyarisi gereken yerlerde guvenli dil kullan.
                Cevabi yalnizca JSON olarak don (doğrudan { ile basla).
                """
                + "\n" + knowledgeBase.relevantRulesAsPromptSection(searchText)
                + """

                JSON semasi:
                {
                  "summary": "Turkce kisa analiz",
                  "compatibilityLevel": "high|warning|synergy",
                  "compatibilityMessage": "Turkce uyumluluk mesaji",
                  "suggestedTimeOfDay": "morning|evening|both",
                  "notableIngredients": ["..."],
                  "clashingProducts": [
                    { "id": 12, "reason": "Bu yeni urundeki Retinol, dolabindaki 12 id'li AHA asidi ile ayni gece kullanilamaz." }
                  ],
                  "warnings": ["..."]
                }

                Kullanici profili:
                - Cilt tipi: %s
                - Ana hedef: %s
                - Hassasiyet: %s
                - Reaksiyon gecmisi: %s

                Rafindaki urunler (ID'leri kullanarak clashingProducts eslestirmesi yap):
                %s

                Analiz edilecek urun:
                - Marka: %s
                - Ad: %s
                - Kategori: %s
                - Aciklama: %s
                - One cikan icerikler: %s
                """.formatted(
                value(profile == null ? null : profile.getSkinTypeGuess()),
                value(profile == null ? null : profile.getMainGoal()),
                value(profile == null ? null : profile.getSensitivity()),
                value(profile == null ? null : profile.getReactionHistory()),
                formatShelf(shelfProducts),
                value(request.getBrand()),
                value(request.getName()),
                value(request.getCategory()),
                value(request.getDescription()),
                emptyIfNull(request.getActiveIngredients()));
    }

    private IngredientAnalysisResponse fromJson(JsonNode json, IngredientAnalysisRequest request, List<Product> shelfProducts) {
        List<String> notableIngredients = toStringList(json.path("notableIngredients"));
        if (notableIngredients.isEmpty()) {
            notableIngredients = emptyIfNull(request.getActiveIngredients());
        }

        List<String> warnings = new ArrayList<>(toStringList(json.path("warnings")));

        json.path("clashingProducts").forEach(node -> {
            Long id = node.path("id").asLong();
            String reason = node.path("reason").asText("");
            shelfProducts.stream()
                .filter(p -> p.getId().equals(id))
                .findFirst()
                .ifPresent(p -> warnings.add("Dolabındaki \"" + p.getBrand() + " " + p.getName() + "\" ürünü ile çakışıyor: " + reason));
        });

        return new IngredientAnalysisResponse(
                textOrDefault(json.path("summary"), "İçerikler cilt hedeflerinize göre dengeli şekilde değerlendirildi."),
                normalizeLevel(json.path("compatibilityLevel").asText("warning")),
                textOrDefault(json.path("compatibilityMessage"), "Bu ürünü rutine eklerken cilt toleransınızı takip edin."),
                normalizeTime(json.path("suggestedTimeOfDay").asText("both"), request.getCategory()),
                notableIngredients,
                warnings);
    }

    private IngredientAnalysisResponse fallbackAnalysis(
            UserProfile profile,
            List<Product> shelfProducts,
            IngredientAnalysisRequest request) {
        List<String> ingredients = emptyIfNull(request.getActiveIngredients());
        String joined = String.join(" ", ingredients).toLowerCase(Locale.forLanguageTag("tr-TR"));
        String category = value(request.getCategory()).toLowerCase(Locale.forLanguageTag("tr-TR"));

        // Aynı alias/kural listesini burada tekrar tanımlamak yerine tek doğrulanmış
        // kaynağa (IngredientKnowledgeBase) sorulur; retinol, AHA, BHA, C vitamini,
        // niacinamide kuralları oradan gelir.
        var matchedRules = knowledgeBase.matchRules(joined);
        boolean hasRetinoid = matchedRules.containsKey("retinol") || matchedRules.containsKey("tretinoin");
        boolean hasAcid = matchedRules.containsKey("AHA") || matchedRules.containsKey("BHA");
        boolean hasVitaminC = matchedRules.containsKey("C vitamini");
        boolean hasNiacinamide = matchedRules.containsKey("niacinamide");
        boolean sensitive = value(profile == null ? null : profile.getSensitivity())
                .toLowerCase(Locale.forLanguageTag("tr-TR"))
                .contains("sık");

        String level = hasRetinoid || (hasAcid && sensitive) ? "warning" : "synergy";
        String time = category.contains("güneş") || category.contains("spf") ? "morning" : (hasRetinoid || hasAcid ? "evening" : "both");
        List<String> warnings = new ArrayList<>();

        if (hasRetinoid && hasAcid) {
            warnings.add("Retinoid ve asitleri aynı rutinde üst üste kullanmayın; farklı günlere ayırın.");
            level = "high";
        }
        if (hasVitaminC && hasAcid) {
            warnings.add("Asit ve C vitamini hassas ciltlerde iritasyonu artırabilir; toleransı kademeli test edin.");
        }
        if (sensitive && (hasRetinoid || hasAcid)) {
            warnings.add("Hassasiyet geçmişiniz olduğu için aktif içerikleri düşük sıklıkla başlatın.");
        }

        String summary = ingredients.isEmpty()
                ? "Bu ürün için öne çıkan içerik girilmedi. Marka, kategori ve mevcut rutine göre temel uyumluluk yorumu hazırlandı."
                : "Öne çıkan içerikler: " + String.join(", ", ingredients) + ". Ürün mevcut cilt hedefleriniz ve rafınızdaki ürünlerle birlikte değerlendirildi.";

        String message = buildCompatibilityMessage(shelfProducts, hasNiacinamide, hasRetinoid, hasAcid);

        return new IngredientAnalysisResponse(
                summary,
                level,
                message,
                time,
                ingredients,
                warnings);
    }

    private String buildCompatibilityMessage(List<Product> shelfProducts, boolean hasNiacinamide, boolean hasRetinoid, boolean hasAcid) {
        if (hasRetinoid || hasAcid) {
            return "Aktif içerik yoğunluğu nedeniyle bu ürünü bariyer destekli nemlendiriciyle dengeleyin ve rafınızdaki diğer güçlü aktiflerle aynı geceye koymayın.";
        }
        if (hasNiacinamide) {
            return "Niasinamid bariyer ve sebum dengesi hedefleriyle uyumlu olabilir; çoğu temel rutinle kolay eşleşir.";
        }
        if (shelfProducts.isEmpty()) {
            return "Rafınızda karşılaştırılacak ürün yok; ürünü rutine tek tek ekleyip cilt tepkisini izleyin.";
        }
        return "Rafınızdaki ürünlerle belirgin yüksek riskli bir çakışma görünmüyor; yeni ürünleri yine kademeli ekleyin.";
    }

    private List<String> toStringList(JsonNode node) {
        if (!node.isArray()) {
            return List.of();
        }
        List<String> values = new ArrayList<>();
        node.forEach(item -> {
            String value = item.asText("").trim();
            if (!value.isBlank()) {
                values.add(value);
            }
        });
        return values;
    }

    private String normalizeLevel(String level) {
        return switch (level == null ? "" : level.trim().toLowerCase(Locale.ROOT)) {
            case "high" -> "high";
            case "synergy" -> "synergy";
            default -> "warning";
        };
    }

    private String normalizeTime(String time, String category) {
        String normalized = time == null ? "" : time.trim().toLowerCase(Locale.ROOT);
        if (normalized.equals("morning") || normalized.equals("evening") || normalized.equals("both")) {
            return normalized;
        }
        return value(category).toLowerCase(Locale.forLanguageTag("tr-TR")).contains("güneş") ? "morning" : "both";
    }

    private String formatShelf(List<Product> products) {
        if (products.isEmpty()) {
            return "- Bos";
        }
        return products.stream()
                .limit(12)
                .map(product -> "- id: %d | %s %s / %s / %s".formatted(
                        product.getId(),
                        value(product.getBrand()),
                        value(product.getName()),
                        value(product.getCategory()),
                        product.getActiveIngredients() == null ? "[]" : String.join(", ", product.getActiveIngredients())))
                .toList()
                .toString();
    }

    private List<String> emptyIfNull(List<String> values) {
        return values == null ? List.of() : values;
    }

    private String textOrDefault(JsonNode node, String fallback) {
        String value = node.asText("").trim();
        return value.isBlank() ? fallback : value;
    }

    private String value(String value) {
        return value == null ? "" : value.trim();
    }
}