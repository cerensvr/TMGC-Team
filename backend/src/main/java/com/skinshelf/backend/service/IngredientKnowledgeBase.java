package com.skinshelf.backend.service;

import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Shelly'nin aktif içerik bilgi tabanı.
 * Gemini prompt'una doğrulanmış kurallar olarak eklenir; fallback yanıtlarında da kullanılır.
 */
@Component
public class IngredientKnowledgeBase {

    public record IngredientRule(String name, List<String> aliases, List<String> facts) {
        boolean matches(String text) {
            String lower = text.toLowerCase(Locale.forLanguageTag("tr-TR"));
            if (containsTerm(lower, name)) {
                return true;
            }
            return aliases.stream().anyMatch(alias -> containsTerm(lower, alias));
        }
    }

    private record InteractionRule(
            String name,
            List<String> firstGroup,
            List<String> secondGroup,
            String guidance) {
        boolean matches(String text) {
            String lower = text.toLowerCase(Locale.forLanguageTag("tr-TR"));
            return firstGroup.stream().anyMatch(term -> containsTerm(lower, term))
                    && secondGroup.stream().anyMatch(term -> containsTerm(lower, term));
        }
    }

    private static final List<IngredientRule> RULES = List.of(
            new IngredientRule("retinol", List.of("retinal", "retinoid"), List.of(
                    "Gece kullanılır.",
                    "AHA/BHA ile aynı gece kullanmak tahriş riskini artırır.",
                    "Kullanım döneminde gündüz SPF önemlidir.",
                    "Yeni başlayanlarda haftada 1-2 gece gibi düşük sıklık önerilir.")),
            new IngredientRule("tretinoin", List.of("tretinoın", "retin-a", "retin a"), List.of(
                    "Reçeteli, güçlü bir retinoiddir; yalnızca sağlık profesyoneli yönlendirmesiyle kullanılır.",
                    "Kullanım başlangıcında soyulma ve kuruluk görülebilir.",
                    "AHA/BHA ve benzoyl peroxide ile aynı gece kullanılması tahrişi artırır.",
                    "Gündüz geniş spektrumlu SPF kullanımı özellikle önemlidir.")),
            new IngredientRule("AHA", List.of("glycolic", "glikolik", "lactic", "laktik", "mandelic"), List.of(
                    "Cilt dokusu ve leke görünümü için kullanılır.",
                    "Hassas ciltte tahriş riski vardır.",
                    "Kullanım döneminde SPF önemlidir.",
                    "Retinol ile aynı gece önerilmez.")),
            new IngredientRule("BHA", List.of("salicylic", "salisilik"), List.of(
                    "Yağlanma, siyah nokta ve sivilce benzeri görünüm için kullanılır.",
                    "Kuruluk yapabilir.",
                    "Retinol veya AHA ile aynı rutinde dikkatli olunmalıdır.")),
            new IngredientRule("azelaic acid", List.of("azelaik asit", "azelaik"), List.of(
                    "Kızarıklık görünümü ve eşitsiz ton için kullanılır.",
                    "Genellikle diğer aktiflere göre daha az tahriş edicidir, hassas ciltte de tercih edilebilir.",
                    "Retinoid ve asitlerle birlikte kullanım kişisel toleransa bağlıdır; kademeli başlanması önerilir.")),
            new IngredientRule("C vitamini", List.of("vitamin c", "ascorbic", "askorbik"), List.of(
                    "Sabah kullanılabilir.",
                    "SPF ile iyi eşleşir.",
                    "Hassas ciltte iritasyon yapabilir.")),
            new IngredientRule("niacinamide", List.of("niasinamid"), List.of(
                    "Bariyer, yağ dengesi ve kızarıklık görünümü için destekleyicidir.",
                    "Çoğu içerikle uyumludur.")),
            new IngredientRule("hyaluronic acid", List.of("hyaluronik", "hiyalüronik"), List.of(
                    "Nem desteği sağlar.",
                    "Üzerine nemlendirici ile kapatılması önerilir.")),
            new IngredientRule("glycerin", List.of("gliserin", "glycerol"), List.of(
                    "Nem tutucu bir içeriktir ve çoğu rutinde kullanılabilir.",
                    "Nemlendirici formül içinde bariyer desteğine yardımcı olabilir.")),
            new IngredientRule("squalane", List.of("skualan"), List.of(
                    "Yumuşatıcı ve nem kaybını azaltmaya yardımcı bir içeriktir.",
                    "Çoğu aktif içerikle birlikte kullanılabilir; kişisel tolerans yine de izlenmelidir.")),
            new IngredientRule("urea", List.of("üre"), List.of(
                    "Formül yoğunluğuna bağlı olarak nem desteği veya pürüzlü görünüm için kullanılabilir.",
                    "Tahriş olmuş ya da çatlamış ciltte batma yapabilir; ürün yüzdesi bilinmiyorsa kesin kullanım sıklığı verilmemelidir.")),
            new IngredientRule("ceramide", List.of("panthenol", "centella", "madecassoside", "cica"), List.of(
                    "Bariyer destekleyicidir.",
                    "Hassas ciltler için iyi seçeneklerdir.")),
            new IngredientRule("peptide", List.of("peptit", "peptides", "matrixyl"), List.of(
                    "Cilt bariyeri ve elastikiyet görünümünü destekler.",
                    "Çoğu aktif içerikle uyumludur, sabah veya gece kullanılabilir.")),
            new IngredientRule("zinc", List.of("çinko", "zinc oxide", "zinc pca"), List.of(
                    "Yağ dengesi ve sivilce benzeri görünüm için destekleyicidir.",
                    "Mineral SPF içeriğinde de bulunur; bazı hassas ciltler tarafından iyi tolere edilebilir.")),
            new IngredientRule("benzoyl peroxide", List.of("benzoil peroksit"), List.of(
                    "Sivilce benzeri görünüm için kullanılır.",
                    "Kurutucu olabilir.",
                    "Retinol ile birlikte kullanırken dikkat edilmelidir.")),
            new IngredientRule("PHA", List.of("gluconolactone", "glukonolakton", "lactobionic", "laktobiyonik"), List.of(
                    "Eksfolyan bir içerik grubudur.",
                    "AHA/BHA'ya göre daha nazik olabilir ancak hassas ciltte yine kademeli başlanmalıdır.",
                    "Başka eksfolyanlarla aynı rutinde üst üste kullanmak gereksiz tahriş oluşturabilir.")),
            new IngredientRule("tranexamic acid", List.of("traneksamik asit", "tranexamic"), List.of(
                    "Leke ve eşitsiz ton görünümünü hedefleyen kozmetik formüllerde kullanılabilir.",
                    "Formülün tamamı ve diğer aktiflerle toplam rutin yoğunluğu dikkate alınmalıdır.")),
            new IngredientRule("alpha arbutin", List.of("alfa arbutin", "arbutin"), List.of(
                    "Eşitsiz ton ve leke görünümünü hedefleyen kozmetik içeriklerdendir.",
                    "Tahriş riskini azaltmak için yeni aktifler rutine tek tek eklenmelidir.")),
            new IngredientRule("kojic acid", List.of("kojik asit", "kojic"), List.of(
                    "Eşitsiz ton görünümünü hedefleyen ürünlerde bulunabilir.",
                    "Hassas ciltte iritasyon yapabileceği için düşük sıklık ve yama testi düşünülebilir.")),
            new IngredientRule("bakuchiol", List.of("bakuchiol"), List.of(
                    "Retinoid değildir; kozmetik ürünlerde ince çizgi ve ton görünümü hedefiyle kullanılabilir.",
                    "Retinolle aynı etkiyi garanti ettiği söylenmemeli; kişisel tolerans izlenmelidir.")),
            new IngredientRule("sulfur", List.of("kükürt", "kukurt"), List.of(
                    "Yağlanma ve sivilce benzeri görünümü hedefleyen ürünlerde bulunabilir.",
                    "Kurutucu olabileceği için diğer güçlü aktiflerle toplam rutin yoğunluğu dikkate alınmalıdır.")),
            new IngredientRule("petrolatum", List.of("vazelin", "petroleum jelly"), List.of(
                    "Su kaybını azaltmaya yardımcı kapatıcı bir içeriktir.",
                    "Nem desteğini ciltte tutmaya yardımcı olabilir; tek başına su bazlı nem sağlamaz.")),
            new IngredientRule("SPF", List.of("güneş kremi", "sunscreen", "spf50", "spf30"), List.of(
                    "Sabah rutininin son adımı olarak kullanılır.",
                    "Retinoid, AHA/BHA veya C vitamini kullanılan dönemlerde gündüz kullanımı özellikle önemlidir.",
                    "Mineral (zinc/titanium dioxide) formüller bazı hassas ciltlerde daha iyi tolere edilebilir.")),
            new IngredientRule("fragrance", List.of("parfum", "parfüm"), List.of(
                    "Hassas ciltte reaksiyon riski oluşturabilir.")),
            new IngredientRule("alcohol denat", List.of("denatured alcohol"), List.of(
                    "Hassas veya kuru ciltte kurutucu olabilir.")));

    private static final List<InteractionRule> INTERACTIONS = List.of(
            new InteractionRule(
                    "Retinoid + eksfolyan",
                    List.of("retinol", "retinal", "retinoid", "tretinoin"),
                    List.of("AHA", "BHA", "glycolic", "glikolik", "salicylic", "salisilik", "PHA",
                            "gluconolactone"),
                    "Aynı gece üst üste kullanmak tahriş riskini artırabilir; farklı gecelere ayırmak daha kontrollüdür."),
            new InteractionRule(
                    "Retinoid + benzoyl peroxide",
                    List.of("retinol", "retinal", "retinoid", "tretinoin"),
                    List.of("benzoyl peroxide", "benzoil peroksit"),
                    "Birlikte kullanım ürün formülüne ve profesyonel yönlendirmeye bağlıdır; kendi kendine aynı rutinde "
                            + "üst üste başlatmak yerine farklı zamanlara ayırmak daha ihtiyatlıdır."),
            new InteractionRule(
                    "Birden fazla eksfolyan",
                    List.of("AHA", "glycolic", "glikolik", "lactic", "laktik", "mandelic"),
                    List.of("BHA", "salicylic", "salisilik", "PHA", "gluconolactone"),
                    "Birden fazla eksfolyanı aynı rutinde üst üste kullanmak hassasiyet ve kuruluk riskini artırabilir."),
            new InteractionRule(
                    "Nem + bariyer desteği",
                    List.of("hyaluronic", "hyaluronik", "hiyalüronik", "glycerin", "gliserin"),
                    List.of("ceramide", "panthenol", "centella", "squalane", "skualan", "petrolatum"),
                    "Nem tutucu ve bariyer destekleyici içerikler çoğu rutinde birlikte katmanlanabilir."));

    /** Bilgi tabanının tamamını prompt'a eklenecek metin olarak döner. */
    public String asPromptSection() {
        StringBuilder builder = new StringBuilder("Aktif icerik kurallari (dogrulanmis bilgi tabani):\n");
        for (IngredientRule rule : RULES) {
            builder.append("- ").append(rule.name()).append(": ")
                    .append(String.join(" ", rule.facts())).append('\n');
        }
        return builder.toString();
    }

    /**
     * Verilen bağlamla (kullanıcı mesajı + rafındaki ürünlerin içerikleri) eşleşen
     * kuralları prompt'a eklenecek metin olarak döner. Tüm bilgi tabanını değil,
     * yalnızca o an konuşmayla ilgili olanı gönderir (RAG benzeri filtreleme).
     */
    public String relevantRulesAsPromptSection(String context) {
        Map<String, List<String>> matched = matchRules(context);
        List<InteractionRule> interactions = matchInteractions(context);
        if (matched.isEmpty() && interactions.isEmpty()) {
            return "Aktif icerik kurallari: bu baglamda belirli bir aktif icerik eslesmesi tespit edilmedi; "
                    + "genel guvenli oneriler ver.\n";
        }
        StringBuilder builder = new StringBuilder("Aktif icerik kurallari (bu baglamla eslesen, dogrulanmis bilgi tabani):\n");
        matched.forEach((name, facts) -> builder.append("- ").append(name).append(": ")
                .append(String.join(" ", facts)).append('\n'));
        if (!interactions.isEmpty()) {
            builder.append("Etkilesim kontrolleri:\n");
            interactions.forEach(interaction -> builder.append("- ")
                    .append(interaction.name()).append(": ")
                    .append(interaction.guidance()).append('\n'));
        }
        return builder.toString();
    }

    /** Verilen metinde geçen içeriklere ait kuralları döner (fallback yanıtları için). */
    public Map<String, List<String>> matchRules(String text) {
        Map<String, List<String>> matched = new LinkedHashMap<>();
        if (text == null || text.isBlank()) {
            return matched;
        }
        for (IngredientRule rule : RULES) {
            if (rule.matches(text)) {
                matched.put(rule.name(), rule.facts());
            }
        }
        return matched;
    }

    private List<InteractionRule> matchInteractions(String text) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        return INTERACTIONS.stream()
                .filter(rule -> rule.matches(text))
                .toList();
    }

    private static boolean containsTerm(String normalizedText, String term) {
        if (normalizedText == null || normalizedText.isBlank() || term == null || term.isBlank()) {
            return false;
        }
        String normalizedTerm = term.toLowerCase(Locale.forLanguageTag("tr-TR"));
        Pattern pattern = Pattern.compile(
                "(?<![\\p{L}\\p{N}])" + Pattern.quote(normalizedTerm) + "(?![\\p{L}\\p{N}])",
                Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
        return pattern.matcher(normalizedText).find();
    }
}
