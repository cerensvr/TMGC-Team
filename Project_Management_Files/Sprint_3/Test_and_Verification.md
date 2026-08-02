# Sprint 3 Test ve Doğrulama İndeksi

## Otomatik Kalite Kapıları

| Katman | Sonuç | Kanıt |
| --- | ---: | --- |
| TypeScript build | Geçti | `npm run build` |
| Mobil servis/regresyon | 19/19 | `npm test` |
| Backend | 63/63 | `cd backend && ./mvnw test` |
| Shelly golden set | 100/100 | [Otomatik eval](shelly-evaluation-report.md) |
| Full-stack smoke | 4/4 profil | [CI workflow](../../.github/workflows/quality-check.yml) |
| Production dependency audit | 0 açık | `npm audit --omit=dev --audit-level=moderate` |

## Kabul ve Entegrasyon Kanıtları

- [Kritik backend test kapsamı](critical-backend-test-coverage-report.md)
- [H2 + Flyway izole backend profili](backend-test-profile-report.md)
- [Canlı Render/Supabase/Gemini API smoke](live-api-smoke-report.md)
- [Kalıcı ürün CRUD](product-crud-verification.md)
- [Shelly AI kabul senaryoları](SHELLY-AI-VALIDATION.md)
- [Shelly cevap kalitesi ve kota davranışı](shelly-quality-verification.md)
- [Güvenlik ve gizlilik](Security-and-Privacy-Validation.md)
- [Gerçek cihaz release candidate testi](RELEASE-CANDIDATE-TEST.md)
- [Android preview APK kurulumu](android-preview-apk-verification.md)

## Tekrarlama

```bash
npm ci
npm audit --omit=dev --audit-level=moderate
npx expo-doctor
npm run build
npm test
cd backend
./mvnw test
```

CI, pull request ve `main` pushlarında frontend, backend ve API smoke işlerini
ayrı job'lar olarak çalıştırır. Shelly eval JSON dosyası backend job'unda
artifact olarak saklanır.
