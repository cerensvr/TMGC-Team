# Mühendislik Kalite Kapıları

Bu sayfa, güncel `main` dalında otomatik olarak doğrulanan teknik sözleşmeleri
tek yerde toplar. Ölçümler 2 Ağustos 2026 tarihli yerel temiz koşudan alınmıştır;
GitHub Actions her push ve pull request'te aynı kontrolleri yeniden çalıştırır.

| Kapı | Güncel sonuç | Başarısızlık koşulu |
| --- | ---: | --- |
| TypeScript derleme | Geçti | Tip hatası |
| Expo ESLint | 0 hata, 0 uyarı | Herhangi bir lint bulgusu |
| Mobil servis/regresyon | 19/19 | Herhangi bir test hatası |
| Backend | 67/67 | Herhangi bir test hatası |
| Backend JaCoCo | %75,55 satır, %51,32 branch | Satır <%70 veya branch <%45 |
| Kritik API sözleşmesi | 24/24 endpoint | Mobilin kullandığı endpointin kaybolması |
| Shelly niyet golden set | 100/100 | Bir yanlış yönlendirme |
| Shelly yanıt sözleşmesi | 12/12 | Raf, açıklama, bağlam veya güvenlik ihlali |
| Güçlü aktif ablation | 3 aday çakışma -> 0 plan çakışması | Policy sonrası aynı zaman dilimi |
| Tracked secret scan | Geçti | Yüksek güvenli token/private-key deseni |
| Production dependency audit | 0 bilinen açık | Orta veya üstü güvenlik açığı |
| İzole full-stack smoke | 4/4 profil | Kritik API zincirinde hata |

## Korunan Sözleşmeler

- `ApiContractTest`, mobil istemcinin kullandığı auth, profil, ürün, Shelly ve
  cilt takibi endpointlerini Spring handler kayıtlarından doğrular.
- `ShellyResponseQualityEvaluationTest`, gerçek `AssistantService` fallback
  akışını profil, raf, sohbet hafızası ve cilt günlüğü bağlamıyla çalıştırır.
- `RoutinePolicyEngine`, raf dışı/pasif ürünü uygulanabilir plana almaz;
  retinoid ve güçlü tedavileri ayırır, gebelik profilinde retinoidi dışlar.
- `RateLimitFilterTest`, login kotasının aynı istemci ve endpoint için
  dakikada 10 istekte sınırlandığını doğrular.
- `scripts/check-secrets.mjs`, yalnız Git tarafından takip edilen dosyalarda
  private key ve yüksek güvenli sağlayıcı token desenlerini arar. Bu kontrol
  bağımlılık zafiyet taramasının veya anahtar rotasyonunun yerine geçmez.

## Tekrarlama

```bash
npm ci
npm audit --omit=dev --audit-level=moderate
npx expo-doctor
npm run lint
npm run build
npm test
npm run security:secrets
cd backend
./mvnw verify
```

JaCoCo HTML çıktısı `backend/target/site/jacoco/index.html`, Shelly JSON
çıktıları ise `backend/target/shelly-eval-report.json` ve
`backend/target/shelly-response-quality-report.json` altında üretilir.

## Sınırlar

Bu kapılar iş kuralı, veri dayanaklılığı ve güvenli yönlendirme regresyonlarını
ölçer. Üretken modelin klinik doğruluğu veya dermatolojik teşhis doğruluğu
iddia edilmez. Sağlayıcı yanıtları değişken olduğu için canlı Gemini çağrısı
CI'da başarı kriteri yapılmaz; modelden bağımsız güvenlik kuralları zorunlu
kapı olarak tutulur.
