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

    @Transactional
    public void clearHistory(User user) {
        assistantMessageRepository.deleteByUser(user);
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

        // Shelly dolaptaki sahiplik bilgisiyle rutin aktifliğini birbirine
        // karıştırmamalı. Bu nedenle pasif ürünleri de bağlama katıyor, rutin
        // önerilerinde ise aşağıda yalnız aktif ürünleri kullanıyoruz.
        List<Product> products = productRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .limit(15)
                .toList();
        List<SkinLog> recentLogs = skinLogRepository.findTop30ByUserOrderByCreatedAtDesc(user);
        List<AssistantMessage> conversationHistory = assistantMessageRepository
                .findTop50ByUserOrderByCreatedAtDesc(user).stream()
                .sorted(Comparator.comparing(AssistantMessage::getCreatedAt))
                .toList();

        if (geminiApiClient.isConfigured()) {
            String fullPrompt = shellyPromptService.buildChatPrompt(
                    profile, products, recentLogs, conversationHistory, prompt, mode);

            var result = geminiApiClient.generateJsonWithStatus(
                    ShellyPromptService.SYSTEM_PROMPT,
                    fullPrompt,
                    null,
                    null,
                    shellyPromptService.buildChatResponseSchema());
            if (result.json().isPresent()) {
                return parseGeminiResponse(result.json().get(), profile, products, mode, prompt);
            }
            rateLimited = result.isRateLimited();
        }

        AssistantChatResponse fallback = buildFallbackResponse(
                prompt, mode, profile, products, recentLogs, conversationHistory);
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
            ShellyMode expectedMode,
            String userPrompt) {
        String intentType = json.path("intentType").asText("INFO").equals("ISSUE") ? "ISSUE" : "INFO";
        String detectedIssue = json.path("detectedIssue").isNull() ? null
                : boundedNullable(json.path("detectedIssue").asText(null), 120);
        String title = boundedText(
                textOrDefault(json.path("title").asText(""), "Shelly'nin Yorumu"), 100);
        String detectedMode = (expectedMode == null ? ShellyMode.GENERAL_CHAT : expectedMode).name();
        List<Product> modeProducts = productsForMode(expectedMode, products);
        String summary = boundedText(
                personalizeSummary(json.path("summary").asText(""), profile, products), 500);
        String analysis = boundedText(textOrDefault(
                json.path("analysis").asText(""),
                defaultAnalysis(profile, modeProducts)), 1_200);
        String explicitSuggestion = boundedText(json.path("suggestion").asText("").trim(), 500);

        // Modu backend belirler. Modelin yanlış sınıflandırması cevap sözleşmesini
        // değiştiremez.
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
                .filter(product -> isRecommendationEligible(expectedMode, product))
                .limit(3)
                .toList();
        List<String> recommendations = recommendedList.stream()
                .map(product -> "Önerilen: " + product.getBrand() + " " + product.getName() + " -> "
                        + recommendationReasons.get(product.getId()))
                .toList();
        List<String> avoids = products.stream()
                .filter(product -> avoidReasons.containsKey(product.getId()))
                .filter(product -> isRecommendationEligible(expectedMode, product))
                .limit(3)
                .map(product -> "Kaçın: " + product.getBrand() + " " + product.getName() + " -> "
                        + avoidReasons.get(product.getId()))
                .toList();

        if (modeUsesShelf(expectedMode)
                && !modeProducts.isEmpty()
                && !mentionsShelfProduct(summary + " " + analysis, modeProducts)) {
            analysis = boundedText(analysis + " " + defaultAnalysis(profile, modeProducts), 1_200);
        }

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
        if (expectedMode == ShellyMode.PRODUCT_ANALYSIS && hasPurchaseIntent(userPrompt)) {
            Product ownedCandidate = findRelevantShelfProducts(userPrompt, products).stream()
                    .filter(product -> !avoidReasons.containsKey(product.getId()))
                    .findFirst()
                    .orElse(null);
            if (ownedCandidate != null) {
                String shelfFirst = "Yeni ürün almadan önce rafındaki " + productName(ownedCandidate)
                        + " seçeneğini içerik ve tolerans açısından değerlendir.";
                if (!isRoutineActive(ownedCandidate)) {
                    shelfFirst += " Bu ürün dolabında kayıtlı fakat rutinlerinde şu anda pasif.";
                }
                suggestion = containsPurchaseRecommendation(suggestion)
                        ? shelfFirst
                        : shelfFirst + (suggestion.isBlank() ? "" : " " + suggestion);
            }
        }
        if (suggestion.isBlank()) {
            suggestion = productSuggestion;
        } else if (!productSuggestion.isBlank()) {
            suggestion = suggestion + " " + productSuggestion;
        }
        suggestion = textOrDefault(suggestion, defaultSuggestion(detectedMode, modeProducts));

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
            List<Product> products,
            List<SkinLog> recentLogs,
            List<AssistantMessage> conversationHistory) {
        String normalized = prompt.toLowerCase(Locale.forLanguageTag("tr-TR"));
        List<Product> activeProducts = products.stream()
                .filter(this::isRoutineActive)
                .toList();
        String productContext = products.stream()
                .map(this::productSearchText)
                .reduce((left, right) -> left + " " + right)
                .orElse("");
        String personalizedSummary = personalizeSummary("", profile, products);
        String activeShelfNames = shelfNames(activeProducts);

        Map<String, List<String>> matchedRules = knowledgeBase.matchRules(normalized + " " + productContext);
        if (mode == ShellyMode.PRODUCT_ANALYSIS) {
            List<Product> matchedProducts = findRelevantShelfProducts(prompt, products);
            if (matchedProducts.isEmpty() && refersToLatestShelfProduct(normalized) && !products.isEmpty()) {
                matchedProducts = List.of(products.get(0));
            }

            if (!matchedProducts.isEmpty()) {
                Product firstMatch = matchedProducts.get(0);
                String matchedNames = shelfNames(matchedProducts);
                boolean inactive = !isRoutineActive(firstMatch);
                String summary = personalizedSummary + " " + matchedNames
                        + (matchedProducts.size() == 1 ? " zaten dolabında." : " seçenekleri zaten dolabında.");
                String reason = matchedNames
                        + " ürünlerini profil hedefin, hassasiyetin ve içerik bilgileriyle karşılaştırdım."
                        + (inactive
                                ? " İlk eşleşme dolabında kayıtlı ancak rutinlerinde şu anda pasif."
                                : " İlk eşleşme rutinlerinde aktif görünüyor.");
                String suggestion = inactive
                        ? "Yeni ürün almadan önce " + productName(firstMatch)
                                + " içeriğini kontrol et; uygunsa ürün detayından rutin kullanımını aktifleştir."
                        : "Yeni ürün almadan önce rafındaki " + productName(firstMatch)
                                + " ile aynı ihtiyacı karşılayıp karşılamadığını kontrol et.";
                return fallbackResponse(
                        "INFO",
                        null,
                        mode,
                        "Önce Rafındaki Ürünü Değerlendirelim",
                        summary,
                        reason,
                        suggestion,
                        "İçerik yüzdesi veya tam INCI listesi bilinmiyorsa kesin uygunluk varsayma.",
                        "low",
                        List.of("Dolap önceliği", inactive ? "Rutinde pasif" : "Rutinde aktif"));
            }

            String reason = products.isEmpty()
                    ? "Rafında karşılaştırabileceğim bir ürün olmadığı için marka veya ürün uydurmadan yalnız seçim ölçütü verebilirim."
                    : shelfNames(products)
                            + " arasından sorundaki ürünü güvenle eşleştiremedim; yanlış ürünü önermek istemiyorum.";
            String suggestion = products.isEmpty()
                    ? "Düşündüğün ürünün adını ve içerik listesini paylaş veya ürünü dolabına ekle."
                    : "Ürünün tam adını ya da içerik listesini paylaş; önce dolabındaki seçeneklerle karşılaştıralım.";
            return fallbackResponse(
                    "INFO",
                    null,
                    mode,
                    "Ürünü Netleştirelim",
                    personalizedSummary,
                    reason,
                    suggestion,
                    "",
                    "low",
                    List.of("Ürün analizi"));
        }

        if (mode == ShellyMode.INGREDIENT_ANALYSIS) {
            String rulesText = matchedRules.isEmpty()
                    ? "Asit, retinoid veya benzoil peroksit gibi güçlü aktifler varsa aynı rutinde üst üste kullanmak yerine sabah/akşam veya farklı günlere ayır."
                    : matchedRules.entrySet().stream()
                            .map(entry -> entry.getKey() + ": " + String.join(" ", entry.getValue()))
                            .reduce((a, b) -> a + " " + b)
                            .orElse("");
            String summary = personalizedSummary + " "
                    + (products.isEmpty()
                            ? "Rafın boş olduğu için genel aktif içerik kurallarıyla ilerledim."
                            : shelfNames(products) + " ürünlerini aktif içerikleriyle birlikte karşılaştırdım.");
            boolean conflict = hasStrongActiveConflict(normalized + " " + productContext);
            return fallbackResponse(
                    "INFO",
                    null,
                    mode,
                    "İçerik Analizi",
                    summary,
                    rulesText,
                    "Güçlü aktifleri farklı zaman dilimlerine ayırıp toleransı kademeli test et.",
                    conflict ? "Bu güçlü aktifleri aynı gece üst üste kullanma." : "",
                    conflict ? "medium" : "low",
                    List.of("Aktif içerik"));
        }

        if (mode == ShellyMode.ROUTINE_CHECK || mode == ShellyMode.WEEKLY_PLAN) {
            String reason;
            String suggestion;
            if (!activeProducts.isEmpty()) {
                reason = activeShelfNames + " ürünlerini kullanım zamanı ve aktif yoğunluğuna göre kontrol ettim.";
                suggestion = mode == ShellyMode.WEEKLY_PLAN
                        ? "Güçlü aktifleri farklı gecelere yerleştir; aralara toparlanma gecesi koy ve gündüz SPF kullan."
                        : "Temizleyici + nemlendirici + SPF temelini koru; aktifleri aynı rutinde üst üste kullanma.";
            } else if (!products.isEmpty()) {
                reason = shelfNames(products)
                        + " dolabında bulunuyor ancak rutin kullanımında pasif; bu yüzden aktif rutine kendiliğimden eklemedim.";
                suggestion = "Uygun bulduğun ürünü detay ekranından rutin kullanımına açtıktan sonra planı yeniden oluştur.";
            } else {
                reason = "Rafında ürün olmadığı için marka uydurmadan güvenli bir temel rutin sırası öneriyorum.";
                suggestion = "Temizleyici + nemlendirici + gündüz SPF temelini kur; yeni ürünleri tek tek ekle.";
            }
            boolean conflict = hasStrongActiveConflict(productContext);
            return fallbackResponse(
                    "INFO",
                    null,
                    mode,
                    mode == ShellyMode.WEEKLY_PLAN ? "Haftalık Rutin Planı" : "Rutin Kontrolü",
                    personalizedSummary,
                    reason,
                    suggestion,
                    conflict
                            ? "Retinoid ve peeling/asit ürünlerini aynı gece kullanma."
                            : "",
                    conflict ? "medium" : "low",
                    List.of("Rutin", "SPF"));
        }

        if (mode == ShellyMode.SKIN_REACTION) {
            List<Product> strongActives = activeProducts.stream()
                    .filter(this::hasPotentiallyIrritatingActive)
                    .limit(3)
                    .toList();
            String rememberedIssue = latestRememberedIssue(conversationHistory);
            String latestLog = latestSkinLogSignal(recentLogs);
            String reason = strongActives.isEmpty()
                    ? "Rutininde aktif görünen güçlü bir içerik eşleşmesi bulamadım; kesin neden varsaymadan rutini sadeleştirmek daha güvenli."
                    : shelfNames(strongActives)
                            + " güçlü aktif içeriyor olabilir; zamanlama bir bağlantı düşündürse de kesin neden olarak kabul edilemez.";
            if (!rememberedIssue.isBlank()) {
                reason += " Önceki konuşmadaki " + rememberedIssue + " bilgisini de dikkate aldım.";
            }
            if (!latestLog.isBlank()) {
                reason += " Son cilt günlüğündeki " + latestLog + " kaydıyla birlikte izlemek faydalı olur.";
            }
            String suggestion = strongActives.isEmpty()
                    ? "Bu akşam rutini nazik temizleyici ve daha önce iyi tolere ettiğin nemlendiriciyle sınırla."
                    : "Şimdilik " + shelfNames(strongActives)
                            + " ürünlerine ara ver; rutini nazik temizleyici ve nemlendiriciyle sadeleştir.";
            return fallbackResponse(
                    "ISSUE",
                    rememberedIssue.isBlank() ? "Cilt reaksiyonu" : rememberedIssue,
                    mode,
                    "Önce Cildi Sakinleştirelim",
                    personalizedSummary,
                    reason,
                    suggestion,
                    "Belirti hızla artarsa veya şişlik, su toplama, açık yara ya da nefes darlığı olursa sağlık profesyoneline başvur.",
                    "medium",
                    List.of("Cilt tepkisi", "Bariyer"));
        }

        return fallbackResponse(
                "INFO",
                null,
                mode,
                "Shelly'nin Yorumu",
                personalizedSummary,
                products.isEmpty()
                        ? "Rafında karşılaştırabileceğim aktif bir ürün bulunmuyor."
                        : "Sorun doğrudan bir ürün seçimi gerektirmediği için dolabına gereksiz bir öneri eklemedim.",
                "Rutini sade tut; yeni ürünleri tek tek ekle ve cilt tepkisini gözlemle.",
                "Beklenmeyen reaksiyonda aktifleri geçici olarak durdur.",
                "low",
                List.of("Genel"));
    }

    private AssistantChatResponse fallbackResponse(
            String intentType,
            String detectedIssue,
            ShellyMode mode,
            String title,
            String summary,
            String reason,
            String suggestion,
            String warning,
            String riskLevel,
            List<String> tags) {
        StringBuilder fullResponse = new StringBuilder(summary);
        if (reason != null && !reason.isBlank()) {
            fullResponse.append("\n\nAnaliz:\n").append(reason);
        }
        if (suggestion != null && !suggestion.isBlank()) {
            fullResponse.append("\n\nSonraki adım:\n").append(suggestion);
        }
        if (warning != null && !warning.isBlank()) {
            fullResponse.append("\n\n⚠️ Uyarı:\n").append(warning);
        }
        return new AssistantChatResponse(
                intentType,
                detectedIssue,
                fullResponse.toString(),
                mode.name(),
                title,
                summary,
                blankToNull(reason),
                blankToNull(suggestion),
                blankToNull(warning),
                riskLevel,
                tags);
    }

    private String productSearchText(Product product) {
        StringBuilder builder = new StringBuilder();
        builder.append(value(product.getBrand())).append(' ')
                .append(value(product.getName())).append(' ')
                .append(value(product.getCategory())).append(' ');
        if (product.getDescription() != null) {
            builder.append(product.getDescription()).append(' ');
        }
        if (product.getActiveIngredients() != null) {
            builder.append(String.join(" ", product.getActiveIngredients()));
        }
        return builder.toString().toLowerCase(Locale.forLanguageTag("tr-TR"));
    }

    private List<Product> productsForMode(ShellyMode mode, List<Product> products) {
        if (mode == ShellyMode.ROUTINE_CHECK
                || mode == ShellyMode.WEEKLY_PLAN
                || mode == ShellyMode.SKIN_REACTION) {
            return products.stream().filter(this::isRoutineActive).toList();
        }
        return products;
    }

    private boolean isRecommendationEligible(ShellyMode mode, Product product) {
        return !modeUsesActiveRoutine(mode) || isRoutineActive(product);
    }

    private boolean modeUsesActiveRoutine(ShellyMode mode) {
        return mode == ShellyMode.ROUTINE_CHECK
                || mode == ShellyMode.WEEKLY_PLAN
                || mode == ShellyMode.SKIN_REACTION;
    }

    private boolean modeUsesShelf(ShellyMode mode) {
        return mode == ShellyMode.PRODUCT_ANALYSIS
                || mode == ShellyMode.ROUTINE_CHECK
                || mode == ShellyMode.INGREDIENT_ANALYSIS
                || mode == ShellyMode.SKIN_REACTION
                || mode == ShellyMode.WEEKLY_PLAN;
    }

    private boolean isRoutineActive(Product product) {
        return product != null && (product.getIsActive() == null || product.getIsActive());
    }

    private boolean mentionsShelfProduct(String text, List<Product> products) {
        String normalized = value(text).toLowerCase(Locale.forLanguageTag("tr-TR"));
        return products.stream().anyMatch(product -> {
            String name = value(product.getName()).toLowerCase(Locale.forLanguageTag("tr-TR"));
            String brand = value(product.getBrand()).toLowerCase(Locale.forLanguageTag("tr-TR"));
            return (!name.isBlank() && normalized.contains(name))
                    || (!brand.isBlank() && normalized.contains(brand));
        });
    }

    private List<Product> findRelevantShelfProducts(String prompt, List<Product> products) {
        String normalized = value(prompt).toLowerCase(Locale.forLanguageTag("tr-TR"));
        return products.stream()
                .map(product -> Map.entry(product, productMatchScore(normalized, product)))
                .filter(entry -> entry.getValue() > 0)
                .sorted((left, right) -> Integer.compare(right.getValue(), left.getValue()))
                .limit(3)
                .map(Map.Entry::getKey)
                .toList();
    }

    private int productMatchScore(String prompt, Product product) {
        String searchText = productSearchText(product);
        int score = 0;
        String name = value(product.getName()).toLowerCase(Locale.forLanguageTag("tr-TR"));
        String brand = value(product.getBrand()).toLowerCase(Locale.forLanguageTag("tr-TR"));
        String category = value(product.getCategory()).toLowerCase(Locale.forLanguageTag("tr-TR"));

        if (name.length() >= 4 && prompt.contains(name)) {
            score += 8;
        }
        if (brand.length() >= 4 && prompt.contains(brand)) {
            score += 5;
        }
        if (category.length() >= 4 && prompt.contains(category)) {
            score += 4;
        }
        if (product.getActiveIngredients() != null) {
            for (String ingredient : product.getActiveIngredients()) {
                String normalizedIngredient = value(ingredient)
                        .toLowerCase(Locale.forLanguageTag("tr-TR"));
                if (normalizedIngredient.length() >= 3 && prompt.contains(normalizedIngredient)) {
                    score += 6;
                }
            }
        }

        if (containsAny(prompt, "nemlendirici", "nem kremi", "bariyer")
                && matchesAny(searchText, List.of("nemlendir", "moistur", "ceramide", "seramid", "panthenol"))) {
            score += 3;
        }
        if (containsAny(prompt, "güneş kremi", "gunes kremi", "spf")
                && matchesAny(searchText, List.of("güneş", "gunes", "sunscreen", "spf"))) {
            score += 3;
        }
        if (containsAny(prompt, "temizleyici", "yüz yıkama", "yuz yikama")
                && matchesAny(searchText, List.of("temizley", "cleanser", "cleansing"))) {
            score += 3;
        }
        if (containsAny(prompt, "sivilce", "akne", "siyah nokta")
                && matchesAny(searchText, List.of(
                        "salicylic", "salisilik", "bha", "azelaik", "azelaic",
                        "benzoyl", "benzoil", "niacinamide", "niasinamid", "zinc", "çinko"))) {
            score += 2;
        }
        if (containsAny(prompt, "leke", "ton eşitsizliği", "ton esitsizligi")
                && matchesAny(searchText, List.of(
                        "vitamin c", "c vitamini", "ascorbic", "askorbik", "azelaik",
                        "tranexamic", "traneksamik", "arbutin", "niacinamide", "niasinamid"))) {
            score += 2;
        }
        if (containsAny(prompt, "kuruluk", "kuru", "gergin")
                && matchesAny(searchText, List.of(
                        "ceramide", "seramid", "hyaluronic", "hyaluronik", "glycerin",
                        "gliserin", "squalane", "skualan", "nemlendir", "moistur"))) {
            score += 2;
        }
        return score;
    }

    private boolean refersToLatestShelfProduct(String normalizedPrompt) {
        return containsAny(normalizedPrompt,
                "yeni eklediğim", "yeni ekledigim", "eklediğim ürün", "ekledigim urun",
                "bu ürün", "bu urun", "son eklediğim", "son ekledigim");
    }

    private boolean hasPurchaseIntent(String prompt) {
        String normalized = value(prompt).toLowerCase(Locale.forLanguageTag("tr-TR"));
        return containsAny(normalized,
                "almalı mıyım", "almali miyim", "satın al", "satin al",
                "ne almalıyım", "ne almaliyim", "almam gerekir", "ürün öner", "urun oner");
    }

    private boolean containsPurchaseRecommendation(String suggestion) {
        String normalized = value(suggestion).toLowerCase(Locale.forLanguageTag("tr-TR"));
        return containsAny(normalized,
                "satın al", "satin al", "almanı öner", "almani oner",
                "alabilirsin", "edinmelisin", "sipariş");
    }

    private String productName(Product product) {
        return (value(product.getBrand()) + " " + value(product.getName())).trim();
    }

    private boolean hasPotentiallyIrritatingActive(Product product) {
        String text = productSearchText(product);
        return matchesAny(text, List.of(
                "retinol", "retinal", "retinoid", "tretinoin",
                "aha", "bha", "salicylic", "salisilik", "glycolic", "glikolik",
                "lactic", "laktik", "mandelic", "benzoyl", "benzoil", "peeling"));
    }

    private boolean hasStrongActiveConflict(String text) {
        String normalized = value(text).toLowerCase(Locale.forLanguageTag("tr-TR"));
        boolean hasRetinoid = matchesAny(normalized, List.of(
                "retinol", "retinal", "retinoid", "tretinoin"));
        boolean hasAcidOrPeroxide = matchesAny(normalized, List.of(
                "aha", "bha", "salicylic", "salisilik", "glycolic", "glikolik",
                "lactic", "laktik", "mandelic", "benzoyl", "benzoil", "peeling"));
        return hasRetinoid && hasAcidOrPeroxide;
    }

    private String latestRememberedIssue(List<AssistantMessage> conversationHistory) {
        if (conversationHistory == null) {
            return "";
        }
        for (int i = conversationHistory.size() - 1; i >= 0; i--) {
            String issue = value(conversationHistory.get(i).getDetectedIssue());
            if (!issue.isBlank()) {
                return boundedText(issue, 80);
            }
        }
        return "";
    }

    private String latestSkinLogSignal(List<SkinLog> recentLogs) {
        if (recentLogs == null || recentLogs.isEmpty()) {
            return "";
        }
        SkinLog latest = recentLogs.get(0);
        if (!value(latest.getUserNote()).isBlank()) {
            return boundedText(latest.getUserNote(), 120);
        }
        List<String> signals = new ArrayList<>();
        addSkinSignal(signals, "kuruluk", latest.getDrynessLevel());
        addSkinSignal(signals, "kızarıklık", latest.getRednessLevel());
        addSkinSignal(signals, "yağlanma", latest.getOilinessLevel());
        addSkinSignal(signals, "sivilce görünümü", latest.getBlemishLevel());
        return String.join(", ", signals);
    }

    private void addSkinSignal(List<String> signals, String label, String level) {
        String cleanLevel = value(level);
        if (!cleanLevel.isBlank() && !"-".equals(cleanLevel)) {
            signals.add(label + ": " + cleanLevel);
        }
    }

    private boolean matchesAny(String text, List<String> terms) {
        return terms.stream().anyMatch(text::contains);
    }

    private boolean containsAny(String text, String... terms) {
        for (String term : terms) {
            if (text.contains(term)) {
                return true;
            }
        }
        return false;
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
