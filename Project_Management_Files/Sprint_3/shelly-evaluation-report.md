# Shelly Otomatik Değerlendirme Raporu

Tarih: 2 Ağustos 2026

## Amaç

Shelly'nin kullanıcı isteğini doğru çalışma moduna yönlendirdiğini, dolap dışı
ürün üretmediğini ve haftalık planda güçlü aktifleri üretken modelden bağımsız
kurallarla güvenli biçimde dağıttığını tekrarlanabilir testlerle doğrulamak.

## Sonuç Özeti

| Ölçüm | Sonuç |
| --- | ---: |
| Golden yönlendirme senaryosu | 100 |
| Doğru yönlendirilen senaryo | 100 |
| Yönlendirme doğruluğu | %100 |
| Shelly cevap modu | 6 |
| Yanıt-kalitesi senaryosu | 12 / 12 geçti |
| Backend otomatik testi | 67 / 67 geçti |
| Mobil servis/regresyon testi | 19 / 19 geçti |
| İzole full-stack smoke profili | 4 / 4 geçti |
| Backend satır / branch kapsamı | %75,55 / %51,32 |
| `npm audit --omit=dev` | 0 açık |

### Mod Bazlı Golden Set

| Mod | Senaryo | Başarı |
| --- | ---: | ---: |
| Product Analysis | 17 | 17 / 17 |
| Routine Check | 17 | 17 / 17 |
| Ingredient Analysis | 18 | 18 / 18 |
| Skin Reaction | 18 | 18 / 18 |
| Weekly Plan | 16 | 16 / 16 |
| General Chat | 14 | 14 / 14 |

Golden set günlük Türkçe, yazım varyasyonları, ürün satın alma niyeti, aktif
içerik soruları, cilt tepkileri ve haftalık plan taleplerini kapsar. Test her
Maven koşusunda `backend/target/shelly-eval-report.json` dosyasını üretir ve CI
bu dosyayı `shelly-evaluation-report` artifact'i olarak saklar.

## Yanıt Kalitesi ve Red-team Sözleşmesi

`ShellyResponseQualityEvaluationTest`, yalnız sınıflandırıcıyı değil gerçek
`AssistantService` fallback yanıtını 12 uçtan uca servis senaryosunda çalıştırır.

| Boyut | Sonuç |
| --- | ---: |
| Mod yönlendirmesi | 12/12 |
| Yanıt alanlarının tamamlığı | 12/12 |
| Neden içeren açıklama | 12/12 |
| Raf dışı/pasif ürün üretmeme | 12/12 |
| Rutin güvenliği | 12/12 |
| Profil, raf, hafıza ve cilt günlüğü bağlamı | 12/12 |
| Eksik kategoride marka uydurmama | 12/12 |
| Ciddi belirtiyi profesyonele yönlendirme | 2/2 |

Senaryolar; boş raf, pasif ürün, satın alma niyeti, sohbet sırasında alakasız
aktif içerik, retinoid + AHA/BHA, birden fazla güçlü tedavi, gebelik profili,
önceki kızarıklık hafızası, cilt günlüğü, şiddetli yanma, yüz şişmesi ve nefes
darlığı gibi red-team girdilerini kapsar. CI çıktısı
`backend/target/shelly-response-quality-report.json` olarak ayrıca saklanır.

### Rutin Policy Ablation

Üç senaryoda aday ürün havuzu retinoid ile güçlü asit/akne ürününü birlikte
içeriyordu. Bütün aktifleri aynı zaman dilimine alan kontrol yaklaşımında üç
aday çakışma varken deterministik policy çıktısında çakışma `0` oldu. Bu,
üretken model kalitesine ilişkin bir karşılaştırma değil; policy katmanının
somut etkisini ölçen tekrarlanabilir bir ablation testidir.

## Deterministik Rutin Politikası

`RoutinePolicyEngine`, Gemini yanıtından bağımsız olarak aşağıdaki kuralları
uygular:

- Yalnız kullanıcının dolabındaki ve rutin için aktif ürünler plana girebilir.
- Retinoid ve AHA/BHA/benzoil peroksit ailesi aynı geceye yerleştirilmez.
- Aynı güçlü aktif ailesinden birden fazla ürün otomatik olarak üst üste konmaz.
- Gebelik bilgisi bulunan profilde retinoid uygulanabilir rutine eklenmez.
- Güvenli şekilde farklı gecelere ayrılmış ürünler gereksiz çakışma uyarısı üretmez.
- Temizleyici, nemlendirici veya SPF yoksa marka uydurulmadan yalnız eksik kategori gösterilir.

Mobil `routineSafetyPolicy` katmanı aynı temel değişmezleri haftalık ekran için
uygular; son kullanma tarihi geçmiş ürünleri ve hassasiyet/kızarıklık döneminde
güçlü aktifleri plan dışında bırakır.

## Full-stack Smoke Kapsamı

CI, dış servis ve kişisel veri kullanmadan Spring Boot'u H2 + Flyway ile açar.
Dört sentetik profil üzerinde şu zincir çalıştırılır:

1. Kayıt, giriş ve oturum doğrulama
2. Profil oluşturma ve güncelleme
3. Ürün ekleme, listeleme, güncelleme ve silme
4. Yerel içerik analizi ve yapılandırılmış Shelly yanıtı
5. Retinol/BHA haftalık plan ayrımı
6. Sohbet geçmişi, cilt günlüğü ve haftalık özet
7. Hesap silme ve test verisinin temizlenmesi

## Tekrarlama

```bash
npm ci
npm audit --omit=dev --audit-level=moderate
npm run build
npm test
cd backend
./mvnw verify
```

Full-stack smoke testi için izole backend çalışırken:

```bash
API_BASE_URL=http://localhost:8080/api npm run smoke:api
```

## Sınırlar

Bu değerlendirme klinik doğruluk iddiası taşımaz. Golden set, yanıt sözleşmesi
ve policy ablation iş kuralı davranışlarını ölçer; canlı Gemini çıktısının
dermatolojik teşhis veya tedavi doğruluğunu ölçmez. Riskli belirtiler üretken
modele gönderilmeden `SafetyGuard` tarafından profesyonel desteğe yönlendirilir.
