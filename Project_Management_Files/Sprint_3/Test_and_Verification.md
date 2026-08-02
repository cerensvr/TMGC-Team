# Sprint 3 Test ve Doğrulama İndeksi

## Otomatik Kalite Kapıları

| Katman | Sonuç | Kanıt |
| --- | ---: | --- |
| TypeScript build | Geçti | `npm run build` |
| Expo ESLint | 0 hata / 0 uyarı | `npm run lint` |
| Mobil servis/regresyon | 19/19 | `npm test` |
| Backend | 67/67 | `cd backend && ./mvnw verify` |
| Backend JaCoCo | %75,55 satır / %51,32 branch | Eşikler %70 / %45 |
| Kritik API sözleşmesi | 24/24 | Spring handler contract testi |
| Shelly golden set | 100/100 | [Otomatik eval](shelly-evaluation-report.md) |
| Shelly yanıt kalitesi | 12/12 | [Yanıt sözleşmesi](shelly-evaluation-report.md) |
| Full-stack smoke | 4/4 profil | [CI workflow](../../.github/workflows/quality-check.yml) |
| Tracked secret scan | Geçti | `npm run security:secrets` |
| Production dependency audit | 0 açık | `npm audit --omit=dev --audit-level=moderate` |

## Kabul ve Entegrasyon Kanıtları

- [Kritik backend test kapsamı](critical-backend-test-coverage-report.md)
- [Güncel mühendislik kalite kapıları](../../docs/engineering-quality.md)
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
npm run lint
npm test
npm run security:secrets
cd backend
./mvnw verify
```

CI, pull request ve `main` pushlarında secret scan, frontend, backend ve API
smoke işlerini ayrı job'lar olarak çalıştırır. İki Shelly eval JSON'u ile
JaCoCo HTML raporu backend job'unda artifact olarak saklanır.
