# Test ve Dogrulama

Bu dosya Sprint 2 sonunda calistirilmesi gereken dogrulama komutlarini ve beklenen kapsami kaydeder. Komutlar son degisikliklerden sonra tekrar calistirilir ve sonuc bu dosyada guncellenir.

## Frontend TypeScript Build

```bash
npm run build
```

Son sonuc: Passed. TypeScript derlemesi hata vermeden tamamlandi.

## Backend Unit/Context Testleri

```bash
cd backend
JAVA_HOME=$(/usr/libexec/java_home -v 24) ./mvnw test
```

Son sonuc: Passed. Backend test profili H2 uzerinde calisti; 11 test, 0 failure, 0 error.

## GitHub Actions CI

```bash
.github/workflows/quality-check.yml
```

CI her push ve pull request icin iki kritik kontrolu calistirir:

| Job | Komut | Amac |
| --- | --- | --- |
| Frontend TypeScript build | `npm ci`, `npm run build` | Mobil istemci TypeScript sozlesmeleri ve import hatalari |
| Backend tests | `./mvnw -B test` | Spring context, servis ve test profili dogrulamasi |

`npm run smoke:api` canli Supabase uzerinde test verisi olusturdugu icin CI'da otomatik calistirilmez; sprint kapanisinda manuel kanit olarak saklanir.

## API Smoke Test

```bash
npm run smoke:api
```

Not: Bu komut Supabase uzerinde test kullanicisi, test urunu ve test mesajlari olusturur. Sprint 2 kapanis dogrulamasi icin `test-kuru@example.com`, `test-yagli@example.com` ve `test-karma@example.com` test kullanicilariyla calistirildi.

Son sonuc: Passed. Health, auth, profile, product, ingredient analysis ve Shelly chat akisi dogrulandi.

Kayitli cikti: [Backend_API/smoke-api-result.json](Backend_API/smoke-api-result.json)

## Son Dogrulama

| Tarih | Komut | Sonuc |
| --- | --- | --- |
| 20 Temmuz 2026 | `npm run build` | Passed |
| 20 Temmuz 2026 | `JAVA_HOME=$(/usr/libexec/java_home -v 24) ./mvnw test` | Passed |
| 20 Temmuz 2026 | `npm run smoke:api` | Passed |
| 20 Temmuz 2026 | Android emulator live smoke | Passed: login, Dolabim, Rutinim, Shelly, Cilt Takibi, Profil |
| 28 Temmuz 2026 | `npm run build` | Passed |
| 28 Temmuz 2026 | `./mvnw -B test` | Passed: 11 test, 0 failure, 0 error |

## Dogrulanan Kapsam

| Kapsam | Dogrulama |
| --- | --- |
| TypeScript sozlesmeleri | `npm run build` |
| Backend context ve servis baglantilari | `./mvnw test` |
| Auth/Product/Assistant uctan uca API akisi | `npm run smoke:api` |
| Secret guvenligi | `application.properties` Git disinda, `.example` Git icinde |
| Scrum kanit yapisi | `Project_Management_Files/Sprint_2` alt klasorleri |
