package com.skinshelf.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.skinshelf.backend.dto.AssistantChatRequest;
import com.skinshelf.backend.dto.AssistantChatResponse;
import com.skinshelf.backend.dto.AssistantMessageResponse;
import com.skinshelf.backend.entity.AssistantMessage;
import com.skinshelf.backend.entity.Product;
import com.skinshelf.backend.entity.SkinLog;
import com.skinshelf.backend.entity.User;
import com.skinshelf.backend.entity.UserProfile;
import com.skinshelf.backend.repository.AssistantMessageRepository;
import com.skinshelf.backend.repository.ProductRepository;
import com.skinshelf.backend.repository.SkinLogRepository;
import com.skinshelf.backend.repository.UserProfileRepository;
import com.skinshelf.backend.service.ShellyPromptService.ShellyMode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class AssistantService {

    private final AssistantMessageRepository assistantMessageRepository;
    private final GeminiApiClient geminiApiClient;
    private final ProductRepository productRepository;
    private final UserProfileRepository userProfileRepository;
    private final SkinLogRepository skinLogRepository;
    private final ShellyPromptService shellyPromptService;
    private final SafetyGuard safetyGuard;
    private final IngredientKnowledgeBase knowledgeBase;

    public AssistantService(
            AssistantMessageRepository assistantMessageRepository,
            GeminiApiClient geminiApiClient,
            ProductRepository productRepository,
            UserProfileRepository userProfileRepository,
            SkinLogRepository skinLogRepository,
            ShellyPromptService shellyPromptService,
            SafetyGuard safetyGuard,
            IngredientKnowledgeBase knowledgeBase) {
        this.assistantMessageRepository = assistantMessageRepository;
        this.geminiApiClient = geminiApiClient;
        this.productRepository = productRepository;
        this.userProfileRepository = userProfileRepository;
        this.skinLogRepository = skinLogRepository;
        this.shellyPromptService = shellyPromptService;
        this.safetyGuard = safetyGuard;
        this.knowledgeBase = knowledgeBase;
    }

    public AssistantChatResponse chat(User user, AssistantChatRequest request) {
        String prompt = request.getMessage().trim();
        AssistantChatResponse response = buildResponse(user, prompt);

        AssistantMessage message = new AssistantMessage();
        message.setUser(user);
        message.setPrompt(prompt);
        message.setIntentType(response.getIntentType());
        message.setDetectedIssue(response.getDetectedIssue());
        message.setAiResponse(response.getAiResponse());
        assistantMessageRepository.save(message);

        return response;
    }

    @Transactional(readOnly = true)
    public List<AssistantMessageResponse> history(User user) {
        return assistantMessageRepository.findTop50ByUserOrderByCreatedAtDesc(user).stream()
                .sorted(Comparator.comparing(AssistantMessage::getCreatedAt))
                .map(AssistantMessageResponse::from)
                .toList();
    }

    private AssistantChatResponse buildResponse(User user, String prompt) {
        // GÜVENLİK FİLTRESİ: Acil durumlarda doğrudan yönlendir
        if (safetyGuard.isRisky(prompt)) {
            return new AssistantChatResponse(
                    "ISSUE",
                    "Riskli belirti",
                    SafetyGuard.SAFE_REFERRAL_MESSAGE,
                    ShellyMode.SKIN_REACTION.name(),
                    "Önce Güvenliğin",
                    SafetyGuard.SAFE_REFERRAL_MESSAGE,
                    "Tarif ettiğin belirti, uygulama üzerinden değerlendirilemeyecek kadar ciddi olabilir.",
                    "Ürün kullanımını durdur ve bir sağlık profesyoneline danış.",
                    "Belirtiler artarsa vakit kaybetme.",
                    "high",
                    List.of("Dermatolog", "Güvenlik"));
        }

        ShellyMode mode = shellyPromptService.detectMode(prompt);
        boolean rateLimited = false;
        UserProfile profile = userProfileRepository.findByUserId(user.getId()).orElse(null);
        List<Product> products = productRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .limit(15)
                .filter(product -> product.getIsActive() == null || product.getIsActive())
                .toList();

        if (geminiApiClient.isConfigured()) {
            List<SkinLog> recentLogs = skinLogRepository.findTop30ByUserOrderByCreatedAtDesc(user);

            // Uzun dönem hafızası için 50 mesaja kadar kullanıyoruz; prompt servisi
            // ham konuşma metnini ayrıca son 4 turla sınırlar.
            List<AssistantMessage> conversationHistory = assistantMessageRepository
                    .findTop50ByUserOrderByCreatedAtDesc(user).stream()
                    .sorted(Comparator.comparing(AssistantMessage::getCreatedAt))
                    .toList();

            String fullPrompt = shellyPromptService.buildChatPrompt(
                    profile, products, recentLogs, conversationHistory, prompt, mode);

            var result = geminiApiClient.generateJsonWithStatus(
                    ShellyPromptService.SYSTEM_PROMPT,
                    fullPrompt,
                    null,
                    null,
                    shellyPromptService.buildChatResponseSchema());
            if (result.json().isPresent()) {
                return parseGeminiResponse(result.json().get(), profile, products, mode);
            }
            rateLimited = result.isRateLimited();
        }

        AssistantChatResponse fallback = buildFallbackResponse(prompt, mode, profile, products);
        return rateLimited ? withBusyNotice(fallback) : fallback;
    }

    private static final String BUSY_NOTICE = "Shelly şu an çok yoğun; bu, rafına göre hazırlanmış hızlı bir ön değerlendirme. "
            + "Birazdan tekrar sorarsan daha detaylı yorum yapabilirim.";

    private AssistantChatResponse withBusyNotice(AssistantChatResponse fallback) {
        List<String> tags = new ArrayList<>();
        tags.add("Shelly yoğun");
        tags.addAll(fallback.getTags());

        return new AssistantChatResponse(
                fallback.getIntentType(),
                fallback.getDetectedIssue(),
                BUSY_NOTICE + "\n" + fallback.getAiResponse(),
                fallback.getMode(),
                fallback.getTitle(),
                BUSY_NOTICE + " " + fallback.getSummary(),
                fallback.getReason(),
                fallback.getSuggestion(),
                fallback.getWarning(),
                fallback.getRiskLevel(),
                tags);
    }

    private AssistantChatResponse parseGeminiResponse(
            JsonNode json,
            UserProfile profile,
            List<Product> products,
            ShellyMode expectedMode) {
        String intentType = json.path("intentType").asText("INFO").equals("ISSUE") ? "ISSUE" : "INFO";
        String detectedIssue = json.path("detectedIssue").isNull() ? null
                : boundedNullable(json.path("detectedIssue").asText(null), 120);
        String title = boundedText(
                textOrDefault(json.path("title").asText(""), "Shelly'nin Yorumu"), 100);
        String summary = boundedText(
                personalizeSummary(json.path("summary").asText(""), profile, products), 500);
        String analysis = boundedText(textOrDefault(
                json.path("analysis").asText(""),
                defaultAnalysis(profile, products)), 1_200);
        String explicitSuggestion = boundedText(json.path("suggestion").asText("").trim(), 500);

        // Modu backend belirler. Modelin yanlış sınıflandırması cevap sözleşmesini
        // değiştiremez.
        String detectedMode = (expectedMode == null ? ShellyMode.GENERAL_CHAT : expectedMode).name();

        Map<Long, String> recommendationReasons = new LinkedHashMap<>();
        json.path("recommendedProducts").forEach(node -> {
            Long id = node.path("id").asLong();
            String reason = boundedText(node.path("reason").asText("").trim(), 260);
            products.stream()
                    .filter(p -> p.getId().equals(id))
                    .findFirst()
                    .ifPresent(p -> recommendationReasons.putIfAbsent(
                            id,
                            reason.isBlank() ? "Profilin ve mevcut rutininle ilişkilendirilen raf ürünü." : reason));
        });

        Map<Long, String> avoidReasons = new LinkedHashMap<>();
        json.path("avoidProducts").forEach(node -> {
            Long id = node.path("id").asLong();
            String reason = boundedText(node.path("reason").asText("").trim(), 260);
            products.stream()
                    .filter(p -> p.getId().equals(id))
                    .findFirst()
                    .ifPresent(p -> avoidReasons.putIfAbsent(
                            id,
                            reason.isBlank() ? "Mevcut cilt durumu veya rutin yoğunluğu nedeniyle şimdilik ara ver." : reason));
        });

        // Aynı ürün iki listede gelirse daha ihtiyatlı olan "kaçın/ara ver"
        // kararı üstün gelir.
        avoidReasons.keySet().forEach(recommendationReasons::remove);

        List<Product> recommendedList = products.stream()
                .filter(product -> recommendationReasons.containsKey(product.getId()))
                .limit(3)
                .toList();
        List<String> recommendations = recommendedList.stream()
                .map(product -> "Önerilen: " + product.getBrand() + " " + product.getName() + " -> "
                        + recommendationReasons.get(product.getId()))
                .toList();
        List<String> avoids = products.stream()
                .filter(product -> avoidReasons.containsKey(product.getId()))
                .limit(3)
                .map(product -> "Kaçın: " + product.getBrand() + " " + product.getName() + " -> "
                        + avoidReasons.get(product.getId()))
                .toList();

        List<String> followUps = new ArrayList<>();
        json.path("followUpQuestions").forEach(q -> {
            String question = q.asText("").trim();
            if (!question.isBlank() && followUps.size() < 2) {
                followUps.add(question);
            }
        });

        String warning = boundedText(json.path("warning").asText("").trim(), 500);
        String riskLevel = normalizeRisk(json.path("riskLevel").asText("low"));
        if ("high".equals(riskLevel) && warning.isBlank()) {
            warning = "Belirti hızla artarsa veya şişlik, su toplama ya da açık yara varsa sağlık profesyoneline başvur.";
        }

        boolean hasRetinoid = false;
        boolean hasAcidOrPeroxide = false;
        String clashingProductName = "";

        for (Product p : recommendedList) {
            if (p.getActiveIngredients() == null)
                continue;
            String ingredientsText = String.join(" ", p.getActiveIngredients())
                    .toLowerCase(Locale.forLanguageTag("tr-TR"));

            if (matchesAny(ingredientsText, List.of("retinol", "retinal", "retinoid", "tretinoin"))) {
                hasRetinoid = true;
            }
            if (matchesAny(ingredientsText, List.of("salicylic", "salisilik", "bha", "glycolic", "glikolik", "lactic",
                    "laktik", "benzoyl", "benzoil"))) {
                hasAcidOrPeroxide = true;
                clashingProductName = p.getBrand() + " " + p.getName();
            }
        }

        // Eğer yapay zekâ aynı anda hem retinol hem de asit/peroksit önerdiyse, cevabı
        // sabote edip düzeltiyoruz!
        if (hasRetinoid && hasAcidOrPeroxide) {
            warning = "Shelly Güvenlik Uyarısı: Önerilen ürünleriniz arasında Retinol ve güçlü aktifler (Asit/Akne ürünü: "
                    + clashingProductName
                    + ") bulunmaktadır. Cilt bariyerinizin zarar görmemesi için bu ürünleri kesinlikle aynı gece üst üste kullanmayın, farklı günlere dağıtın.";
            riskLevel = "medium";
            intentType = "ISSUE";
        }

        List<String> tags = new ArrayList<>();
        json.path("tags").forEach(tag -> {
            String value = tag.asText("").trim();
            if (!value.isBlank() && !tags.contains(value) && tags.size() < 4) {
                tags.add(value);
            }
        });

        String productSuggestion = recommendations.isEmpty() ? "" : String.join(" ", recommendations);
        String suggestion = explicitSuggestion;
        if (suggestion.isBlank()) {
            suggestion = productSuggestion;
        } else if (!productSuggestion.isBlank()) {
            suggestion = suggestion + " " + productSuggestion;
        }
        suggestion = textOrDefault(suggestion, defaultSuggestion(detectedMode, products));

        StringBuilder fullAiResponse = new StringBuilder();
        fullAiResponse.append(summary).append("\n\nAnaliz:\n").append(analysis);
        if (!recommendations.isEmpty()) {
            fullAiResponse.append("\n\n👍 Önerilen Ürünler:\n").append(String.join("\n", recommendations));
        }
        if (!avoids.isEmpty()) {
            fullAiResponse.append("\n\n⚠️ Kaçınılması Gerekenler:\n").append(String.join("\n", avoids));
        }
        if (!suggestion.isBlank()) {
            fullAiResponse.append("\n\nSonraki adım:\n").append(suggestion);
        }
        if (!followUps.isEmpty()) {
            fullAiResponse.append("\n\n💬 Shelly'nin Sorusu:\n").append(String.join("\n", followUps));
        }
        if (!warning.isBlank()) {
            fullAiResponse.append("\n\n⚠️ Uyarı:\n").append(warning);
        }

        return new AssistantChatResponse(
                intentType,
                detectedIssue,
                fullAiResponse.toString(),
                detectedMode,
                title,
                summary,
                blankToNull(analysis),
                blankToNull(suggestion),
                blankToNull(warning),
                riskLevel,
                tags);
    }

    private AssistantChatResponse buildFallbackResponse(
            String prompt,
            ShellyMode mode,
            UserProfile profile,
            List<Product> products) {
        String normalized = prompt.toLowerCase(Locale.forLanguageTag("tr-TR"));
        String productContext = products.stream()
                .map(this::productSearchText)
                .reduce((left, right) -> left + " " + right)
                .orElse("");
        String personalizedSummary = personalizeSummary("", profile, products);
        String shelfNames = shelfNames(products);

        Map<String, List<String>> matchedRules = knowledgeBase.matchRules(normalized + " " + productContext);
        if (mode == ShellyMode.INGREDIENT_ANALYSIS || !matchedRules.isEmpty()) {
            String rulesText = matchedRules.isEmpty()
                    ? "Asit, retinoid veya benzoil peroksit gibi güçlü aktifler varsa aynı rutinde üst üste kullanmak yerine sabah/akşam veya farklı günlere ayır."
                    : matchedRules.entrySet().stream()
                            .map(entry -> entry.getKey() + ": " + String.join(" ", entry.getValue()))
                            .reduce((a, b) -> a + " " + b)
                            .orElse("");
            String summary = personalizedSummary + " "
                    + (products.isEmpty()
                            ? "Rafın boş olduğu için genel aktif içerik kurallarıyla ilerledim."
                            : shelfNames + " ürünlerini aktif içerikleriyle birlikte karşılaştırdım.");
            return new AssistantChatResponse(
                    "INFO",
                    null,
                    summary + "\n\n" + rulesText,
                    mode.name(),
                    "İçerik Analizi",
                    summary,
                    rulesText,
                    "Güçlü aktifleri farklı zaman dilimlerine ayırıp toleransı kademeli test et.",
                    "Hassasiyet hissedersen kullanım sıklığını azalt.",
                    "low",
                    List.of("Aktif içerik"));
        }

        if (mode == ShellyMode.ROUTINE_CHECK || mode == ShellyMode.WEEKLY_PLAN
                || normalized.contains("rutin") || normalized.contains("ağır")) {
            String reason = products.isEmpty()
                    ? "Rafında aktif ürün olmadığı için güvenli bir temel rutin öneriyorum."
                    : shelfNames + " ürünlerini kullanım zamanı ve aktif yoğunluğuna göre kontrol ettim.";
            return new AssistantChatResponse(
                    "INFO",
                    null,
                    personalizedSummary + " " + reason,
                    mode.name(),
                    "Rutin Kontrolü",
                    personalizedSummary,
                    reason,
                    "Temizleyici + nemlendirici + SPF temelini koru; aktifleri farklı günlere yay.",
                    "Retinol ve peeling gecelerini ayırmak iyi olur.",
                    "low",
                    List.of("Rutin", "SPF"));
        }

        return new AssistantChatResponse(
                "INFO",
                null,
                personalizedSummary + " En güvenli yaklaşım yeni değişkenleri tek tek ekleyip cilt tepkisini izlemek.",
                mode.name(),
                "Shelly'nin Yorumu",
                personalizedSummary,
                products.isEmpty()
                        ? "Rafında karşılaştırabileceğim aktif bir ürün bulunmuyor."
                        : shelfNames + " ürünlerini profilindeki bilgilerle birlikte değerlendirdim.",
                "Rutini sade tut; yeni ürünleri tek tek ekle ve cilt tepkisini gözlemle.",
                "Beklenmeyen reaksiyonda aktifleri geçici olarak durdur.",
                "low",
                List.of("Genel"));
    }

    private String productSearchText(Product product) {
        StringBuilder builder = new StringBuilder();
        builder.append(product.getBrand()).append(' ')
                .append(product.getName()).append(' ')
                .append(product.getCategory()).append(' ');
        if (product.getDescription() != null) {
            builder.append(product.getDescription()).append(' ');
        }
        if (product.getActiveIngredients() != null) {
            builder.append(String.join(" ", product.getActiveIngredients()));
        }
        return builder.toString().toLowerCase(Locale.forLanguageTag("tr-TR"));
    }

    private boolean matchesAny(String text, List<String> terms) {
        return terms.stream().anyMatch(text::contains);
    }

    private String normalizeRisk(String risk) {
        return switch (risk == null ? "" : risk.trim().toLowerCase(Locale.ROOT)) {
            case "high" -> "high";
            case "medium" -> "medium";
            default -> "low";
        };
    }

    private String personalizeSummary(String summary, UserProfile profile, List<Product> products) {
        String cleanSummary = summary == null ? "" : summary.trim();
        String nickname = profile == null ? "" : value(profile.getNickname());
        String skinType = profile == null ? "" : value(profile.getSkinTypeGuess());
        String mainGoal = profile == null ? "" : value(profile.getMainGoal());
        String sensitivity = profile == null ? "" : value(profile.getSensitivity());

        boolean hasName = nickname.isBlank() || containsIgnoreCase(cleanSummary, nickname);
        boolean hasProfileAnchor = containsIgnoreCase(cleanSummary, skinType)
                || containsIgnoreCase(cleanSummary, mainGoal)
                || containsIgnoreCase(cleanSummary, sensitivity);
        if (hasName && hasProfileAnchor && !cleanSummary.isBlank()) {
            return cleanSummary;
        }

        String profileAnchor;
        if (!skinType.isBlank() && !mainGoal.isBlank()) {
            profileAnchor = skinType + " yapını ve " + mainGoal + " hedefini dikkate aldım.";
        } else if (!skinType.isBlank()) {
            profileAnchor = skinType + " yapını dikkate aldım.";
        } else if (!mainGoal.isBlank()) {
            profileAnchor = mainGoal + " hedefini dikkate aldım.";
        } else if (!sensitivity.isBlank()) {
            profileAnchor = sensitivity + " hassasiyet bilgini dikkate aldım.";
        } else if (!products.isEmpty()) {
            profileAnchor = "Rafındaki " + products.size() + " aktif ürünü birlikte değerlendirdim.";
        } else {
            profileAnchor = "Profilindeki mevcut bilgilerle güvenli bir değerlendirme yaptım.";
        }

        if (cleanSummary.isBlank()) {
            return nickname.isBlank() ? profileAnchor : nickname + ", " + profileAnchor;
        }
        if (hasName && !hasProfileAnchor) {
            return cleanSummary + " " + profileAnchor;
        }

        String prefix = nickname.isBlank() ? "" : nickname + ", ";
        return hasProfileAnchor
                ? prefix + cleanSummary
                : prefix + profileAnchor + " " + cleanSummary;
    }

    private String defaultAnalysis(UserProfile profile, List<Product> products) {
        if (products.isEmpty()) {
            return "Rafında karşılaştırabileceğim aktif bir ürün olmadığı için genel ve düşük riskli bir yaklaşım seçtim.";
        }
        String sensitivity = profile == null ? "" : value(profile.getSensitivity());
        String sensitivityNote = sensitivity.isBlank()
                ? ""
                : " Hassasiyet düzeyini de ürün sıklığını belirlerken dikkate almak gerekir.";
        return shelfNames(products) + " ürünlerini içerik ve kullanım zamanı açısından birlikte değerlendirdim."
                + sensitivityNote;
    }

    private String defaultSuggestion(String mode, List<Product> products) {
        if (ShellyMode.ROUTINE_CHECK.name().equals(mode) || ShellyMode.WEEKLY_PLAN.name().equals(mode)) {
            return "Aktifleri aynı gece üst üste kullanmadan haftaya yay ve gündüz SPF adımını koru.";
        }
        if (products.isEmpty()) {
            return "İlk ürününü ekledikten sonra içerik ve rutin uyumunu yeniden kontrol et.";
        }
        return "Öneriyi önce düşük sıklıkta dene ve beklenmeyen bir tepki olursa aktiflere ara ver.";
    }

    private String shelfNames(List<Product> products) {
        if (products == null || products.isEmpty()) {
            return "Rafındaki ürünler";
        }
        return products.stream()
                .limit(3)
                .map(product -> (value(product.getBrand()) + " " + value(product.getName())).trim())
                .reduce((left, right) -> left + ", " + right)
                .orElse("Rafındaki ürünler");
    }

    private String textOrDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private String boundedText(String value, int maxLength) {
        if (value == null || value.isBlank()) {
            return "";
        }
        String clean = value.trim().replaceAll("\\s+", " ");
        return clean.length() <= maxLength
                ? clean
                : clean.substring(0, maxLength).trim() + "…";
    }

    private String boundedNullable(String value, int maxLength) {
        String bounded = boundedText(value, maxLength);
        return bounded.isBlank() ? null : bounded;
    }

    private String value(String value) {
        return value == null || value.isBlank() ? "" : value.trim();
    }

    private boolean containsIgnoreCase(String text, String value) {
        return text != null
                && value != null
                && !value.isBlank()
                && text.toLowerCase(Locale.forLanguageTag("tr-TR"))
                        .contains(value.toLowerCase(Locale.forLanguageTag("tr-TR")));
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
