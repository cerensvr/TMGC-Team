package com.skinshelf.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.skinshelf.backend.entity.Product;
import com.skinshelf.backend.entity.SkinLog;
import com.skinshelf.backend.entity.UserProfile;
import com.skinshelf.backend.entity.AssistantMessage;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;

/**
 * Shelly'nin merkezi system prompt'u, kullanıcı context'i ve zengin JSON
 * şeması.
 * Tüm karar verme, mod algılama ve ürün eşleştirme süreçleri doğrudan bu prompt
 * üzerinden yönetilir.
 */
@Service
public class ShellyPromptService {

    /** Shelly'nin yanıt modları. */
    public enum ShellyMode {
        PRODUCT_ANALYSIS,
        ROUTINE_CHECK,
        INGREDIENT_ANALYSIS,
        SKIN_REACTION,
        WEEKLY_PLAN,
        SKIN_PHOTO_ANALYSIS,
        GENERAL_CHAT
    }

    private final IngredientKnowledgeBase knowledgeBase;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ShellyPromptService(IngredientKnowledgeBase knowledgeBase) {
        this.knowledgeBase = knowledgeBase;
    }

    public static final String SYSTEM_PROMPT = """
            Sen SkinShelf uygulamasindaki akilli, empatik ve uzman yapay zeka cilt bakim asistanisin. Adin 'Shelly'.
            Gorevin: kullanicinin cilt bakim urunlerini, iceriklerini, rutinini ve cilt durumunu analiz etmek, teshis koymadan yonlendirmek.

            Uygulayabilecegin Karar Modlari (Kullanicinin sorusuna gore en uygun modu bizzat sen sec ve JSON'daki 'mode' alanina yaz):
            1. PRODUCT_ANALYSIS: Kullanici yeni bir urunun veya dolabindaki bir urunun cildine uygun olup olmadigini sordugunda.
            2. ROUTINE_CHECK: Kullanici sabah/aksam rutin siralamasi, adim yogunlugu veya rutin ağırlığı sordugunda.
            3. INGREDIENT_ANALYSIS: İceriklerin eslesmelerini, aktif icerik uyumunu veya çakışmasını sordugunda.
            4. SKIN_REACTION: Kullanici sivilce, kizariklik, kuruluk, yaglanma gibi anlik reaksiyonlardan ve cilt dertlerinden bahsettiginde.
            5. WEEKLY_PLAN: Aktif icerikleri haftaya dengeli yayma, retinol ve peeling gecelerini ayirma plani istendiginde.
            6. SKIN_PHOTO_ANALYSIS: Cilt fotografi analizi yapildiginda.
            7. GENERAL_CHAT: Genel cilt bakim sorulari soruldugunda.

            Kurallar:
            - Kesinlikle dermatolog degilsin, tibbi teshis koyma. "Sende egzama var" demek yerine "egzama benzeri pullanma ve kizariklik gorunumu" de.
            - Receteli ilac önerme. Acil durumlarda (sislik, su toplama, acik yara vb.) dermatologa veya acil saglik profesyoneline yonlendir.
            - Kullaniciyla dinamik ve cok turlu bir sohbet (interaktif tani dongusu) yurut.
            - Tek seferde her seyi anlatip konuyu kapatma. Kullaniciya cilt durumunu netlestirecek kisa, mantikli takip sorulari sor (followUpQuestions).
            - Onerdigin veya kacin dedigin urunleri YALNIZCA kullanicinin kendi "userProducts" listesinde yer alan gercek ID'ler ile eslestir.
            - Asla kullanicinin rafında olmayan uydurma bir urun ID'si üretme.
            - Turkce samimi ve guven veren bir dille yanit ver.
            """;

    /**
     * Shelly'nin sohbet yanitinin Gemini responseSchema karsiligi. Prompt
     * metnindeki JSON semasiyla ayni alanlari tanimlar; farkla ki artik model
     * bunu API seviyesinde uymak zorunda, sadece rica degil.
     */
    public JsonNode buildChatResponseSchema() {
        ObjectNode schema = objectMapper.createObjectNode();
        schema.put("type", "OBJECT");
        ObjectNode properties = schema.putObject("properties");

        enumField(properties, "intentType", "INFO", "ISSUE");
        nullableStringField(properties, "detectedIssue");
        enumField(properties, "mode", "PRODUCT_ANALYSIS", "ROUTINE_CHECK", "INGREDIENT_ANALYSIS",
                "SKIN_REACTION", "WEEKLY_PLAN", "GENERAL_CHAT");
        stringField(properties, "title");
        stringField(properties, "summary");
        stringField(properties, "analysis");
        stringField(properties, "suggestion");
        stringField(properties, "warning");
        properties.set("recommendedProducts", productSuggestionArraySchema());
        properties.set("avoidProducts", productSuggestionArraySchema());
        properties.set("followUpQuestions", stringArraySchema());
        enumField(properties, "riskLevel", "low", "medium", "high");
        properties.set("tags", stringArraySchema());

        schema.putArray("required")
                .add("intentType").add("detectedIssue").add("mode").add("title").add("summary").add("analysis")
                .add("suggestion").add("warning").add("riskLevel");

        return schema;
    }

    private void stringField(ObjectNode properties, String name) {
        properties.putObject(name).put("type", "STRING");
    }

    private void nullableStringField(ObjectNode properties, String name) {
        ObjectNode field = properties.putObject(name);
        field.put("type", "STRING");
        field.put("nullable", true);
    }

    private void enumField(ObjectNode properties, String name, String... values) {
        ObjectNode field = properties.putObject(name);
        field.put("type", "STRING");
        ArrayNode enumValues = field.putArray("enum");
        for (String value : values) {
            enumValues.add(value);
        }
    }

    private ObjectNode stringArraySchema() {
        ObjectNode array = objectMapper.createObjectNode();
        array.put("type", "ARRAY");
        array.putObject("items").put("type", "STRING");
        return array;
    }

    private ObjectNode productSuggestionArraySchema() {
        ObjectNode array = objectMapper.createObjectNode();
        array.put("type", "ARRAY");
        ObjectNode item = array.putObject("items");
        item.put("type", "OBJECT");
        ObjectNode itemProperties = item.putObject("properties");
        itemProperties.putObject("id").put("type", "INTEGER");
        itemProperties.putObject("reason").put("type", "STRING");
        item.putArray("required").add("id").add("reason");
        return array;
    }

    private static final String RESPONSE_POLICY = """
            Shelly cevap standardi:
            - Yanitini her zaman verilen userProfile, userProducts, recentSkinLogs ve sohbet gecmisiyle sinirla.
            - Ilk cumlede kullanicinin adini (varsa) ve soruyla ilgili en az bir profil bilgisini dogal bicimde kullan:
              skinType, mainGoal veya sensitivityLevel. Ilgisiz profil bilgisini sirf kisisellestirmek icin ekleme.
            - Raf bos degilse analizde en az bir gercek urun veya aktif icerik baglantisi kur. Raf bossa urun varmis gibi konusma.
            - Onerilen ve kacinilacak urunlerde yalnizca userProducts icindeki gercek ID'leri kullan.
            - summary 1-2 kisa cumle, analysis 2-4 kisa cumle, suggestion tek uygulanabilir sonraki adim olsun.
            - warning yalniz gercek bir risk varsa dolu olsun; risk yoksa bos string dondur.
            - En fazla 2 takip sorusu ve 4 kisa etiket uret.
            - Ayni bilgiyi summary, analysis, suggestion ve warning alanlarinda tekrar etme.
            - Kesin sonuc, teshis, tedavi veya garanti dili kullanma. Belirsizligi "olabilir", "gorunuyor" gibi acikca belirt.
            - Yanit Turkce, sakin, somut ve yargilamayan bir tonda olsun.
            """;

    public String buildChatPrompt(
            UserProfile profile,
            List<Product> products,
            List<SkinLog> recentLogs,
            List<AssistantMessage> chatHistory,
            String userMessage) {
        return SYSTEM_PROMPT
                + "\n" + knowledgeBase.relevantRulesAsPromptSection(searchableContext(products, userMessage))
                + "\n" + RESPONSE_POLICY
                + "\nCevabi YALNIZCA su zengin JSON semasiyla don (baska hicbir aciklama ekleme, doğrudan { ile basla ve } ile bitir):\n"
                + """
                        {
                          "intentType": "INFO|ISSUE",
                          "detectedIssue": "string veya null (örn: 'Kızarıklık')",
                          "mode": "PRODUCT_ANALYSIS|ROUTINE_CHECK|INGREDIENT_ANALYSIS|SKIN_REACTION|WEEKLY_PLAN|GENERAL_CHAT",
                          "title": "Shelly'nin Yorumu",
                          "summary": "kullanıcıya kişisel, kısa ve empati dolu karşılama/özet cümlesi",
                          "analysis": "kullanıcının cilt durumunu ve ürünlerini inceleyen detaylı uzman analiz sonucun",
                          "recommendedProducts": [
                            { "id": 12, "reason": "Bu ürünün içindeki Centella cildini yatıştıracaktır." }
                          ],
                          "avoidProducts": [
                            { "id": 5, "reason": "Sivilce döneminde bu yoğun yağlı nemlendiriciye 2 gün ara vermelisin." }
                          ],
                          "followUpQuestions": [
                            "Bu kızarıklık ne zamandır var?",
                            "Son 2 gün içinde yeni bir ürün kullandın mı?"
                          ],
                          "suggestion": "kullanicinin hemen uygulayabilecegi tek net adim",
                          "warning": "yalniz gercek risk varsa kisa uyari; yoksa bos string",
                          "riskLevel": "low|medium|high",
                          "tags": ["kisa etiketler"]
                        }
                        """
                + "\n" + buildUserContext(profile, products, recentLogs)
                + "\n" + buildConversationState(chatHistory)
                + "\n" + buildChatHistoryContext(chatHistory)
                + "\nKullanici son mesaji:\n" + userMessage;
    }

    private String buildConversationState(List<AssistantMessage> chatHistory) {
        if (chatHistory == null || chatHistory.isEmpty()) {
            return "Aktif Konusma Durumu (State): Kullanici ile ilk kez konusuluyor. Cilt yapisini ve seçecegi hedefi analiz etmeye basla.";
        }

        // Onceki mesajlarda tespit edilen en guncel cilt derdi/hedefi (detectedIssue
        // her mesajda kaydediliyor ama daha once hic geri okunmuyordu). Bunu
        // gercek bir "state" olarak Gemini'ye aktariyoruz, boylece sohbet
        // ilerledikce ayni konuyu takip edebiliyor.
        String activeIssue = null;
        for (int i = chatHistory.size() - 1; i >= 0; i--) {
            String issue = chatHistory.get(i).getDetectedIssue();
            if (issue != null && !issue.isBlank()) {
                activeIssue = shorten(issue.replaceAll("\\s+", " "), 120);
                break;
            }
        }

        StringBuilder builder = new StringBuilder("Aktif Konusma Durumu (State):\n");
        builder.append("- Kullanici ile aktif bir sohbet sureci yurutuluyor.\n");
        if (activeIssue != null) {
            builder.append("- Su ana kadar tespit edilen aktif cilt derdi/hedefi: ").append(activeIssue).append(".\n");
            builder.append("- Kullanici konuyu degistirmedikce bu derde odaklanmaya devam et, bastan sorma.\n");
        } else {
            builder.append("- Henuz net bir cilt derdi/hedefi tespit edilmedi; kullanicinin son mesajindan cikar.\n");
        }
        return builder.toString();
    }

    public String buildSkinPhotoPrompt(
            UserProfile profile,
            List<Product> products,
            List<SkinLog> recentLogs,
            String skinFeeling,
            Boolean usedNewProduct,
            String userNote) {
        return SYSTEM_PROMPT
                + "\n" + knowledgeBase.relevantRulesAsPromptSection(
                        searchableContext(products, value(skinFeeling) + " " + value(userNote)))
                + "\n" + RESPONSE_POLICY
                + "\nCevabi YALNIZCA su JSON semasiyla don:\n"
                + """
                        {
                          "title": "Shelly'nin Cilt Yorumu",
                          "summary": "kisa ve kisisel yorum",
                          "visibleChanges": {
                            "redness": "low|medium|high|unknown",
                            "dryness": "low|medium|high|unknown",
                            "oiliness": "low|medium|high|unknown",
                            "blemishAppearance": "low|medium|high|unknown",
                            "irritationAppearance": "low|medium|high|unknown"
                          },
                          "routineConnection": "rutin ve urunlerle olasi baglanti (kesin konusma)",
                          "suggestion": "bugunku oneri",
                          "warning": "dikkat notu",
                          "riskLevel": "low|medium|high",
                          "tags": ["kisa etiketler"]
                        }
                        """
                + "\n" + buildUserContext(profile, products, recentLogs)
                + "\nBugunku gunluk:\n"
                + "- Cilt hissi: " + value(skinFeeling) + "\n"
                + "- Son 24 saatte yeni urun: " + (Boolean.TRUE.equals(usedNewProduct) ? "Evet" : "Hayir") + "\n"
                + "- Kullanici notu: " + value(userNote) + "\n"
                + "\nFotograftaki cilt gorunumunu degerlendir. Teshis koyma; yalnizca gorunum dili kullan.";
    }

    public String buildUserContext(UserProfile profile, List<Product> products, List<SkinLog> recentLogs) {
        StringBuilder builder = new StringBuilder("Kullanici context'i:\n");

        builder.append("userProfile:\n");
        if (profile == null) {
            builder.append("- (profil bulunamadi)\n");
        } else {
            builder.append("- nickname: ").append(value(profile.getNickname())).append('\n');
            builder.append("- skinType: ").append(value(profile.getSkinTypeGuess())).append('\n');
            builder.append("- sensitivityLevel: ").append(value(profile.getSensitivity())).append('\n');
            builder.append("- mainGoal: ").append(value(profile.getMainGoal())).append('\n');
            builder.append("- experienceLevel: ").append(value(profile.getExperience())).append('\n');
            builder.append("- ageRange: ").append(value(profile.getAgeRange())).append('\n');
            builder.append("- reactionHistory: ").append(value(profile.getReactionHistory())).append('\n');
            builder.append("- currentRoutine: ").append(listValue(profile.getCurrentRoutine())).append('\n');
            builder.append("- recentActives: ").append(listValue(profile.getRecentActives())).append('\n');
            builder.append("- concerns: ").append(listValue(profile.getConcerns())).append('\n');
            builder.append("- allergens: ").append(listValue(profile.getAllergens())).append('\n');
            builder.append("- conditions: ").append(listValue(profile.getConditions())).append('\n');
            builder.append("- pregnancy: ")
                    .append(Boolean.TRUE.equals(profile.getPregnant()) ? "Evet" : "Hayir/belirtilmedi")
                    .append('\n');
        }

        builder.append("userProducts (Kullanicinin Rafındaki Urunler ve ID'leri):\n");
        if (products == null || products.isEmpty()) {
            builder.append("- (raf bos)\n");
        } else {
            products.stream().limit(15).forEach(product -> builder
                    .append("- id: ").append(product.getId())
                    .append(" | marka: ").append(value(product.getBrand()))
                    .append(" | isim: ").append(value(product.getName()))
                    .append(" | kategori: ").append(value(product.getCategory()))
                    .append(" | icerikler: ")
                    .append(product.getActiveIngredients() == null ? "[]"
                            : String.join(", ", product.getActiveIngredients()))
                    .append('\n'));
        }

        builder.append("recentSkinLogs (Cilt Günlüğü):\n");
        if (recentLogs == null || recentLogs.isEmpty()) {
            builder.append("- (kayit yok)\n");
        } else {
            recentLogs.stream().limit(7).forEach(skinLog -> builder
                    .append("- tarih: ")
                    .append(skinLog.getCreatedAt() == null ? "" : skinLog.getCreatedAt().toLocalDate())
                    .append(" | his: ").append(value(skinLog.getSkinFeeling()))
                    .append(" | kuruluk: ").append(value(skinLog.getDrynessLevel()))
                    .append(" | kizariklik: ").append(value(skinLog.getRednessLevel()))
                    .append(" | yaglanma: ").append(value(skinLog.getOilinessLevel()))
                    .append(" | sivilce: ").append(value(skinLog.getBlemishLevel()))
                    .append(" | not: ").append(value(skinLog.getUserNote()))
                    .append('\n'));
        }

        return builder.toString();
    }

    private String buildChatHistoryContext(List<AssistantMessage> chatHistory) {
        if (chatHistory == null || chatHistory.isEmpty()) {
            return "";
        }
        StringBuilder builder = new StringBuilder("Sohbet Gecmisi (Hafiza):\n");
        for (AssistantMessage msg : chatHistory) {
            builder.append("- Kullanici: ").append(shorten(msg.getPrompt(), 350)).append('\n');
            builder.append("- Shelly: ").append(shorten(msg.getAiResponse(), 900)).append('\n');
        }
        return builder.toString();
    }

    private String routineSteps(List<Product> products, String slot) {
        if (products == null || products.isEmpty()) {
            return "[]";
        }
        List<String> steps = products.stream()
                .filter(product -> slot.equals(product.getTimeOfDay()) || "both".equals(product.getTimeOfDay()))
                .limit(10)
                .map(product -> value(product.getCategory()) + " (" + value(product.getName()) + ")")
                .toList();
        return steps.isEmpty() ? "[]" : String.join(" -> ", steps);
    }

    private boolean containsAny(String text, String... terms) {
        for (String term : terms) {
            if (text.contains(term)) {
                return true;
            }
        }
        return false;
    }

    private String value(String value) {
        return value == null || value.isBlank() ? "-" : value.trim();
    }

    /**
     * Bilgi tabanı kural eşleştirmesi için aranacak metni oluşturur: kullanıcının
     * mesajı/notu + rafındaki ürünlerin aktif içerikleri. Böylece hem "retinol
     * kullanabilir miyim" gibi doğrudan sorularda hem de kullanıcı ürünün adını
     * anmasa bile rafındaki ürünlere göre ilgili kurallar eşleşir.
     */
    private String searchableContext(List<Product> products, String freeText) {
        StringBuilder builder = new StringBuilder(freeText == null ? "" : freeText).append(' ');
        if (products != null) {
            products.stream().limit(15).forEach(product -> {
                if (product.getActiveIngredients() != null) {
                    builder.append(String.join(" ", product.getActiveIngredients())).append(' ');
                }
            });
        }
        return builder.toString();
    }

    private String listValue(List<String> values) {
        return values == null || values.isEmpty() ? "[]" : String.join(", ", values);
    }

    private String shorten(String value, int maxLength) {
        if (value == null || value.isBlank()) {
            return "-";
        }
        String trimmed = value.trim();
        return trimmed.length() <= maxLength
                ? trimmed
                : trimmed.substring(0, maxLength).trim() + "…";
    }

    public ShellyMode detectMode(String message) {
        String normalized = message == null ? "" : message.toLowerCase(Locale.forLanguageTag("tr-TR"));

        if (containsAny(normalized, "tepki", "kızar", "yandı", "yanıyor", "sivilce", "akne", "siyah nokta",
                "pullan", "kaşın", "batma", "tahriş", "kuru", "gergin", "yağlan", "parla")) {
            return ShellyMode.SKIN_REACTION;
        }
        if (containsAny(normalized, "birlikte kullanılır", "içerik analizi", "içerik listesi", "inci", "bu iki ürün")) {
            return ShellyMode.INGREDIENT_ANALYSIS;
        }
        if (containsAny(normalized, "haftalık plan", "haftalık rutin", "haftaya yay")) {
            return ShellyMode.WEEKLY_PLAN;
        }
        if (containsAny(normalized, "yeni ürün", "eklediğim ürün", "bu ürün", "uygun mu")) {
            return ShellyMode.PRODUCT_ANALYSIS;
        }
        if (containsAny(normalized, "rutin", "sabah", "akşam", "sıra", "ağır mı")) {
            return ShellyMode.ROUTINE_CHECK;
        }
        return ShellyMode.GENERAL_CHAT;
    }
}
