# Shelly AI Kanit Senaryolari

Bu dosya, Shelly'nin Sprint 2 sonunda neden yalnizca genel cevap veren bir chatbot olmadigini gostermek icin hazirlandi. Her senaryo; kullanici profili, dolap urunleri, beklenen karar ve guvenlik siniriyle birlikte degerlendirilir.

## Senaryo 1 - Rutin Yogunlugu

| Alan | Deger |
| --- | --- |
| Profil | Karma cilt, duzenli rutin hedefi |
| Dolap | Temizleyici, C vitamini serum, nemlendirici, SPF |
| Soru | `Bugunku rutinim agir mi?` |
| Beklenen Shelly davranisi | Sabah rutininde C vitamini + SPF eslesmesini aciklar; gereksiz ek aktif onermeden rutini sade tutar. |

Neden guclu: Shelly, cevap verirken sadece soruyu degil, dolaptaki urunleri ve cilt hedefini birlikte kullanir.

## Senaryo 2 - Aktif Icerik Ayirma

| Alan | Deger |
| --- | --- |
| Profil | Yagli cilt, sivilce/komedon hedefi |
| Dolap | BHA/asit, retinol, hafif nemlendirici |
| Soru | `Bu iki urun birlikte kullanilir mi?` |
| Beklenen Shelly davranisi | Retinol ve peeling/BHA urunlerini ayni gece onermek yerine haftaya yayar; nemlendirici ve SPF destek adimlarini hatirlatir. |

Neden guclu: Uygulama korkutucu uyari gostermek yerine planlayici mantigiyla daha guvenli kullanim sirasi uretir.

## Senaryo 3 - Cilt Tepkisi

| Alan | Deger |
| --- | --- |
| Profil | Kuru/hassas cilt |
| Dolap | Nazik temizleyici, nemlendirici, yeni aktif icerikli urun |
| Soru | `Cildim kizardi ve tepki verdi` |
| Beklenen Shelly davranisi | Rutini sade moduna ceker, yeni/aktif urune ara vermeyi onerir, ciddi belirti varsa profesyonel destek sinirini belirtir. |

Neden guclu: Shelly tibbi tani koymadan, kullanicinin guvenli bir sonraki adimini belirler.

## Senaryo 4 - Urun Dolabi Bos

| Alan | Deger |
| --- | --- |
| Profil | Yeni kullanici |
| Dolap | Bos |
| Soru | `Bana rutin olusturur musun?` |
| Beklenen Shelly davranisi | Marka/urun uydurmaz; once temel kategori rutini onerir ve urun ekleme akisina yonlendirir. |

Neden guclu: AI'nin hallucination riski sinirlandirilir. Rafinda olmayan urunler "varmis gibi" kullanilmaz.

## Senaryo 5 - Barkod Verisi Eksik

| Alan | Deger |
| --- | --- |
| Kaynak | Open Beauty Facts eksik veya bilinmeyen barkod |
| Beklenen akis | Kullanici manuel onay verir; Gemini urun kategori/icerik zenginlestirmesi fallback olarak calisir. |

Neden guclu: Tek dis API'ye bagli kalmayan, manuel duzenlenebilir ve genisleyebilir urun veri stratejisi vardir.

## Senaryo 6 - Haftalik Plan

| Alan | Deger |
| --- | --- |
| Dolap | Aktif kullanimda olan urunler |
| Beklenen akis | Rutinim ekrani sadece `isActive=true` urunleri kullanir; haftalik plan aktifleri ayni geceye yigmadan sabah/aksam olarak ayirir. |

Neden guclu: Dolap, urun detayi ve rutin ekrani ayni backend verisine bagli oldugu icin demo sirasinda toggle degisimi anlik gosterilebilir.

## Kod Karsiliklari

| Davranis | Kod karsiligi |
| --- | --- |
| Shelly chat ve hafiza | `backend/src/main/java/com/skinshelf/backend/service/AssistantService.java` |
| Prompt baglami | `backend/src/main/java/com/skinshelf/backend/service/ShellyPromptService.java` |
| Guvenlik filtresi | `backend/src/main/java/com/skinshelf/backend/service/SafetyGuard.java` |
| Urun zenginlestirme | `backend/src/main/java/com/skinshelf/backend/service/ProductService.java` |
| Mobil Shelly ekrani | `src/screens/AssistantScreen.tsx` |
| Dolap state'i | `src/context/ProductContext.tsx` |
| Rutin planlayici | `src/services/routinePlanner.ts` |

## Demo Gecis Kriteri

- Shelly rafinda olmayan urun uydurmaz.
- Retinol ve peeling/BHA gibi aktifleri ayni geceye koymaz.
- Ciddi reaksiyonda rutin onermek yerine profesyonel destek sinirini soyler.
- Gemini cevap veremezse uygulama cokmeden fallback cevap uretir.
- Mobil ekranlar backend verisiyle uyumlu kalir.
