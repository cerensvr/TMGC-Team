package com.skinshelf.backend.service;

import com.skinshelf.backend.service.ShellyPromptService.ShellyMode;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Shelly'ye her cevap modunda beklenen karar biçimini gösteren küçük, sentetik
 * örnek seti. Her istekte yalnızca seçilen moda ait iki örnek gönderilir; böylece
 * ücretsiz kota gereksiz bağlamla tüketilmez.
 */
@Component
public class ShellyFewShotLibrary {

    private static final Map<ShellyMode, List<PromptExample>> EXAMPLES = Map.of(
            ShellyMode.PRODUCT_ANALYSIS, List.of(
                    new PromptExample(
                            "Profil: hassas ve karma; raf: id=17 Centella Nemlendirici. Kullanıcı: "
                                    + "\"Dolabımdaki nemlendirici kızarıklık döneminde uygun mu?\"",
                            """
                                    {"intentType":"INFO","detectedIssue":"Kızarıklık","mode":"PRODUCT_ANALYSIS","title":"Rafındaki Ürünü Değerlendirdim","summary":"Hassas ve karma cildin için rafındaki Centella Nemlendirici daha sade bir seçenek olabilir.","analysis":"Centella bariyer desteğine yardımcı olabilir. Ürünü daha önce sorunsuz kullandıysan kızarıklık döneminde rutini sade tutarken değerlendirilebilir.","recommendedProducts":[{"id":17,"reason":"Rafındaki bariyer destekleyici seçenek olduğu için."}],"avoidProducts":[],"followUpQuestions":["Bu ürünü daha önce kullandığında yanma oldu mu?"],"suggestion":"Bu akşam küçük bir bölgede ince tabaka halinde dene.","warning":"","riskLevel":"low","tags":["Hassas cilt","Bariyer"]}
                                    """),
                    new PromptExample(
                            "Profil: kuru; raf boş. Kullanıcı: \"C vitamini serumu almalı mıyım?\"",
                            """
                                    {"intentType":"INFO","detectedIssue":"Leke görünümü","mode":"PRODUCT_ANALYSIS","title":"Satın Almadan Önce İçeriği Kontrol Edelim","summary":"Kuru cildin ve leke görünümü hedefin için C vitamini düşünülebilir; fakat elimde değerlendireceğim bir raf ürünü yok.","analysis":"Başlangıçta düşük yoğunluklu ve nem destekli bir formül daha kolay tolere edilebilir. Marka veya ürün uydurmadan içerik listesine göre karar vermek daha güvenli olur.","recommendedProducts":[],"avoidProducts":[],"followUpQuestions":["Düşündüğün ürünün adı ve içerik listesi nedir?"],"suggestion":"Ürünü dolabına ekleyip içerik listesini Shelly ile kontrol et.","warning":"","riskLevel":"low","tags":["Satın alma","C vitamini"]}
                                    """)),
            ShellyMode.ROUTINE_CHECK, List.of(
                    new PromptExample(
                            "Profil: karma; raf: id=4 temizleyici, id=8 BHA serum, id=11 nemlendirici, id=15 SPF. "
                                    + "Kullanıcı: \"Sabah sıralamam nasıl olmalı?\"",
                            """
                                    {"intentType":"INFO","detectedIssue":"Sabah rutini","mode":"ROUTINE_CHECK","title":"Sabah Rutinini Sadeleştirelim","summary":"Karma cildin için rafındaki ürünlerle kısa bir sabah sırası kurabiliriz.","analysis":"Temizleyici sonrası nemlendirici ve son adım SPF yeterli bir temel oluşturur. BHA'yı sabaha eklemek yerine toleransına göre akşam kullanmak daha kontrollü olur.","recommendedProducts":[{"id":4,"reason":"Sabah rutininin ilk temizleme adımı."},{"id":11,"reason":"Temizlik sonrası nem desteği."},{"id":15,"reason":"Sabah rutininin son koruma adımı."}],"avoidProducts":[{"id":8,"reason":"Sabah rutinini gereksiz yoğunlaştırmamak için akşama ayrılabilir."}],"followUpQuestions":[],"suggestion":"Sabah 4 → 11 → 15 sırasını uygula.","warning":"","riskLevel":"low","tags":["Sabah rutini","SPF"]}
                                    """),
                    new PromptExample(
                            "Profil: hassas; raf: id=21 retinol, id=22 glikolik asit. Kullanıcı: "
                                    + "\"İkisini bu akşam üst üste sürsem olur mu?\"",
                            """
                                    {"intentType":"ISSUE","detectedIssue":"Aktif içerik çakışması","mode":"ROUTINE_CHECK","title":"Bu Akşam Aktifleri Ayıralım","summary":"Hassas cildinde retinol ve glikolik asidi aynı akşam üst üste kullanmak tahriş riskini artırabilir.","analysis":"İki güçlü aktifi farklı gecelere ayırmak daha kontrollü olur. Bu akşam yalnızca birini seçip rutini nemlendiriciyle tamamlamak daha sade bir yaklaşım.","recommendedProducts":[{"id":21,"reason":"Tek aktif olarak, mevcut toleransın varsa değerlendirilebilir."}],"avoidProducts":[{"id":22,"reason":"Retinol ile aynı gece kullanmamak için bu akşam ara ver."}],"followUpQuestions":["Bu iki ürünü daha önce ayrı ayrı sorunsuz kullandın mı?"],"suggestion":"Bu akşam yalnızca tek aktif kullan ve diğerini farklı bir geceye bırak.","warning":"Yanma veya belirgin kızarıklık olursa aktifleri durdur.","riskLevel":"medium","tags":["Retinol","AHA","Hassasiyet"]}
                                    """)),
            ShellyMode.INGREDIENT_ANALYSIS, List.of(
                    new PromptExample(
                            "Profil: hassas; raf: id=31 retinol serum, id=32 salisilik asit serum. Kullanıcı: "
                                    + "\"Retinol ve salisilik asit birlikte olur mu?\"",
                            """
                                    {"intentType":"ISSUE","detectedIssue":"Aktif içerik uyumu","mode":"INGREDIENT_ANALYSIS","title":"Aktifleri Farklı Gecelere Ayır","summary":"Hassas cildinde retinol ve salisilik asidi aynı gece kullanmak kuruluk ve tahriş riskini artırabilir.","analysis":"İki aktifi dönüşümlü gecelerde kullanmak toleransı izlemeyi kolaylaştırır. Aktif kullanmadığın geceleri nem desteğine ayırabilirsin.","recommendedProducts":[{"id":31,"reason":"Retinol gecesinde tek güçlü aktif olarak kullanılabilir."}],"avoidProducts":[{"id":32,"reason":"Retinol kullandığın gece üst üste uygulama."}],"followUpQuestions":["Retinole yeni mi başlıyorsun?"],"suggestion":"Bu hafta iki aktifi farklı gecelere yerleştir.","warning":"Belirgin yanma veya soyulmada ikisine de ara ver.","riskLevel":"medium","tags":["Retinol","BHA"]}
                                    """),
                    new PromptExample(
                            "Profil: kuru; raf: id=41 niasinamid, id=42 hyaluronik asit. Kullanıcı: "
                                    + "\"Bu ikisini beraber kullanabilir miyim?\"",
                            """
                                    {"intentType":"INFO","detectedIssue":"Nem desteği","mode":"INGREDIENT_ANALYSIS","title":"Bu İki İçerik Birlikte Kullanılabilir","summary":"Kuru cildin için niasinamid ve hyaluronik asit genellikle uyumlu bir nem-bariyer ikilisi olabilir.","analysis":"Hyaluronik asit nem desteği sağlarken niasinamid bariyer görünümünü destekleyebilir. Formülün tamamı ve kişisel tolerans yine de önemlidir.","recommendedProducts":[{"id":42,"reason":"Nem adımında ilk katman olarak değerlendirilebilir."},{"id":41,"reason":"Bariyer desteği için rutine eklenebilir."}],"avoidProducts":[],"followUpQuestions":[],"suggestion":"İnce yapıdan yoğun yapıya doğru uygula ve nemlendiriciyle tamamla.","warning":"","riskLevel":"low","tags":["Niasinamid","Nem"]}
                                    """)),
            ShellyMode.SKIN_REACTION, List.of(
                    new PromptExample(
                            "Profil: hassas; raf: id=51 AHA serum; hafıza: ürün dün ilk kez kullanıldı. Kullanıcı: "
                                    + "\"Sürdükten sonra yüzüm yanıyor ve kızardı.\"",
                            """
                                    {"intentType":"ISSUE","detectedIssue":"Yanma ve kızarıklık","mode":"SKIN_REACTION","title":"Önce Cildi Sakinleştirelim","summary":"Hassas cildinde yeni AHA serumundan sonra başlayan yanma ve kızarıklık tahriş görünümüyle ilişkili olabilir.","analysis":"Zamanlama yeni ürünle olası bir bağlantı düşündürüyor; kesin neden söylemek mümkün değil. Şimdilik rutini sadeleştirmek daha güvenli.","recommendedProducts":[],"avoidProducts":[{"id":51,"reason":"Yanma ve kızarıklık geçene kadar kullanıma ara ver."}],"followUpQuestions":["Şişlik, su toplama veya nefes darlığı var mı?"],"suggestion":"Ürünü nazikçe durula ve bu akşam aktif içerik kullanma.","warning":"Şişlik, su toplama, açık yara veya hızla artan belirti varsa sağlık profesyoneline başvur.","riskLevel":"high","tags":["Yanma","Kızarıklık","Yeni ürün"]}
                                    """),
                    new PromptExample(
                            "Profil: kuru; raf: id=61 seramidli nemlendirici; kullanıcı: "
                                    + "\"Son iki gündür hafif gerginlik var, yeni ürün kullanmadım.\"",
                            """
                                    {"intentType":"INFO","detectedIssue":"Gerginlik ve kuruluk","mode":"SKIN_REACTION","title":"Nem Desteğini Artıralım","summary":"Kuru cildindeki hafif gerginlik bariyerin daha fazla nem desteğine ihtiyaç duyduğunu gösterebilir.","analysis":"Yeni ürün olmaması tek bir tetikleyici seçmeyi zorlaştırıyor. Hava, temizleme sıklığı veya aktif kullanımı da etkili olabilir.","recommendedProducts":[{"id":61,"reason":"Rafındaki seramidli seçenek bariyer desteği sağlayabilir."}],"avoidProducts":[],"followUpQuestions":["Son günlerde temizleme veya aktif kullanım sıklığın değişti mi?"],"suggestion":"Bu akşam seramidli nemlendiricini uygula ve rutini sade tut.","warning":"","riskLevel":"low","tags":["Kuruluk","Bariyer"]}
                                    """)),
            ShellyMode.WEEKLY_PLAN, List.of(
                    new PromptExample(
                            "Profil: karma ve orta deneyim; raf: id=71 retinol, id=72 BHA, id=73 nemlendirici. "
                                    + "Kullanıcı: \"Aktifleri haftaya yayar mısın?\"",
                            """
                                    {"intentType":"INFO","detectedIssue":"Haftalık aktif planı","mode":"WEEKLY_PLAN","title":"Aktifleri Dengeli Yayalım","summary":"Karma cildin ve mevcut deneyimin için retinol ile BHA'yı farklı gecelere ayıran sade bir plan uygun olabilir.","analysis":"Pazartesi retinol, Perşembe BHA; diğer geceler nem ve toparlanma şeklinde başlanabilir. Toleransın iyi değilse sıklığı artırmamak daha güvenli.","recommendedProducts":[{"id":71,"reason":"Pazartesi gecesinin tek aktifi."},{"id":72,"reason":"Perşembe gecesinin tek aktifi."},{"id":73,"reason":"Aktif olmayan gecelerde nem desteği."}],"avoidProducts":[],"followUpQuestions":["Bu aktifleri haftada kaç kez sorunsuz kullanıyorsun?"],"suggestion":"İlk hafta Pazartesi retinol, Perşembe BHA planını dene.","warning":"Aynı gecede retinol ve BHA kullanma.","riskLevel":"medium","tags":["Haftalık plan","Retinol","BHA"]}
                                    """),
                    new PromptExample(
                            "Profil: yeni başlayan ve hassas; raf: id=81 retinol, id=82 nemlendirici. Kullanıcı: "
                                    + "\"Her gece retinol kullanayım mı?\"",
                            """
                                    {"intentType":"ISSUE","detectedIssue":"Retinol sıklığı","mode":"WEEKLY_PLAN","title":"Düşük Sıklıkla Başlayalım","summary":"Hassas cildin ve başlangıç seviyen için retinole her gece başlamak gereğinden yoğun olabilir.","analysis":"İlk aşamada haftada bir gece kullanıp sonraki günlerde kuruluk ve kızarıklığı izlemek daha kontrollü olur. Tolerans oluşmadan sıklığı artırma.","recommendedProducts":[{"id":81,"reason":"Haftada tek bir planlı gecede değerlendirilebilir."},{"id":82,"reason":"Retinol sonrası nem desteği için."}],"avoidProducts":[],"followUpQuestions":[],"suggestion":"İlk iki hafta retinolü yalnızca bir gece kullan.","warning":"Belirgin yanma veya soyulmada kullanıma ara ver.","riskLevel":"medium","tags":["Başlangıç","Retinol"]}
                                    """)),
            ShellyMode.GENERAL_CHAT, List.of(
                    new PromptExample(
                            "Profil: karma; kullanıcı: \"Bir ürünün etkisini ne kadar sürede anlarım?\"",
                            """
                                    {"intentType":"INFO","detectedIssue":"Ürün takibi","mode":"GENERAL_CHAT","title":"Değişimi Düzenli Takip Et","summary":"Karma cildinde bir ürünün etkisini değerlendirirken tek gecelik değişim yerine düzenli kullanım ve günlük kayıtları daha anlamlıdır.","analysis":"Beklenen süre ürün türüne göre değişir; bu nedenle kesin gün garantisi vermek doğru olmaz. Aynı anda çok ürün değiştirmemek hangi ürünün etkili olduğunu anlamayı kolaylaştırır.","recommendedProducts":[],"avoidProducts":[],"followUpQuestions":["Hangi ürün türünü takip ediyorsun?"],"suggestion":"Başlangıç fotoğrafı ve haftalık cilt günlüğü kaydı oluştur.","warning":"","riskLevel":"low","tags":["Takip","Cilt günlüğü"]}
                                    """),
                    new PromptExample(
                            "Profil yok; raf boş. Kullanıcı: \"Shelly bana nasıl yardımcı olursun?\"",
                            """
                                    {"intentType":"INFO","detectedIssue":null,"mode":"GENERAL_CHAT","title":"Birlikte Rutinini Tanıyabiliriz","summary":"Cilt hedefini, hassasiyetini ve kullandığın ürünleri paylaştığında sana daha kişisel yardımcı olabilirim.","analysis":"Dolabındaki ürünlerin içerik uyumunu, rutin sırasını ve cilt günlüğündeki değişimleri birlikte değerlendirebilirim. Tıbbi teşhis koymam ve rafında olmayan bir ürünü varmış gibi önermem.","recommendedProducts":[],"avoidProducts":[],"followUpQuestions":["Öncelikli cilt hedefin nedir?","Şu anda düzenli kullandığın ürünler var mı?"],"suggestion":"Önce profilini tamamlayıp kullandığın ürünleri dolabına ekle.","warning":"","riskLevel":"low","tags":["Başlangıç","Kişiselleştirme"]}
                                    """)));

    public String examplesFor(ShellyMode mode) {
        List<PromptExample> examples = EXAMPLES.getOrDefault(mode, EXAMPLES.get(ShellyMode.GENERAL_CHAT));
        StringBuilder builder = new StringBuilder(
                "Kalite ornekleri (sentetik veridir; urun ID'lerini kopyalama, yalniz karar ve uslup kalibini izle):\n");
        for (PromptExample example : examples) {
            builder.append("<example>\n<context>")
                    .append(example.context())
                    .append("</context>\n<assistant_json>")
                    .append(example.responseJson().trim())
                    .append("</assistant_json>\n</example>\n");
        }
        return builder.toString();
    }

    private record PromptExample(String context, String responseJson) {
    }
}
