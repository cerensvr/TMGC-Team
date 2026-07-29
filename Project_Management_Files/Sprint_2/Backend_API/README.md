# Backend API ve Entegrasyon Kaniti

Sprint 2'de Spring Boot backend katmani mobil uygulamanin gercek veri kaynagi haline getirildi. API katmani controller, service, repository, DTO ve entity sinirlariyla ayrildi.

## Ana Teknolojiler

| Katman | Teknoloji | Kanit |
| --- | --- | --- |
| Mobile client | React Native / Expo / TypeScript | `src/screens`, `src/context`, `src/services` |
| API | Spring Boot | `backend/src/main/java/com/skinshelf/backend/controller` |
| Auth | JWT + BCrypt | `SecurityConfig`, `JwtService`, `UserService` |
| Database | Supabase PostgreSQL | `backend/src/main/resources/db/migration` |
| AI | Gemini API (`gemini-3.6-flash`) | `GeminiApiClient`, `AssistantService`, `SkinAnalysisService` |
| Product data | Open Beauty Facts | `src/services/openBeautyFactsService.ts` |

## Endpoint Ozeti

| Endpoint | Amac | Mobil karsilik |
| --- | --- | --- |
| `POST /api/auth/register` | Kullanici kaydi ve token donusu | `SignUpScreen`, `authService.register` |
| `POST /api/auth/login` | Giris ve token donusu | `LoginScreen`, `SignInScreen`, `authService.login` |
| `GET /api/auth/me` | Kayitli token ile oturum dogrulama | `authService.restoreSession` |
| `DELETE /api/auth/me` | Hesap ve bagli verileri silme | `ProfileScreen` |
| `GET /api/profiles/me` | Aktif kullanici profilini cekme | `userService` |
| `PUT /api/profiles/me` | Profil guncelleme | `userService` |
| `POST /api/profiles/save` | Onboarding sonucunu kaydetme | `OnboardingScreen` |
| `GET /api/products` | Kullanici dolabini cekme | `ProductContext.loadProducts` |
| `POST /api/products` | Dolaba urun ekleme | `ProductReviewScreen` |
| `PUT /api/products/{id}` | Urun/aktiflik guncelleme | `ProductDetailScreen` |
| `DELETE /api/products/{id}` | Urun silme | `HomeScreen` |
| `POST /api/assistant/chat` | Shelly sohbet cevabi uretme | `AssistantScreen`, `src/api/assistant.ts` |
| `GET /api/assistant/history` | Son sohbet gecmisini cekme | `AssistantScreen` |
| `DELETE /api/assistant/history` | Yeni sohbet icin kalici Shelly hafizasini temizleme | `AssistantScreen` |
| `POST /api/assistant/analyze-ingredients` | Icerik/risk analizi | `IngredientAnalysisService` |
| `POST /api/skin-logs/analyze` | Cilt fotograf notunu analiz edip kaydetme | `AddSkinPhotoScreen` |
| `GET /api/skin-logs` | Cilt takip gecmisini listeleme | `SkinTrackingScreen` |
| `GET /api/skin-logs/summary/weekly` | Haftalik cilt ozeti | `WeeklySkinSummaryCard` |
| `DELETE /api/skin-logs/{logId}` | Cilt takip kaydi silme | `SkinTrackingScreen` |

## Veri Akisi

1. Kullanici kayit/giris yapar ve JWT token AsyncStorage'a yazilir.
2. Mobil API client her istek icin `Authorization: Bearer <token>` basligini ekler.
3. Spring Security token'i dogrular ve aktif kullaniciyi controller seviyesine tasir.
4. Service katmani kullaniciya ait profil, urun, asistan ve cilt takip verisini Supabase uzerinden okur/yazar.
5. Shelly veya urun zenginlestirme akisi gerekirse Gemini servisinden yapili cevap alir.
6. Mobil context'ler backend cevabiyla state'i yeniler; dolap ve rutin ekranlari ayni veriyle calisir.

## Smoke Test Sonucu

Sprint 2 kapanisinda API, canli Spring Boot sunucusu ve Supabase test verisiyle dogrulandi.

| Komut | Sonuc | Kanit |
| --- | --- | --- |
| `npm run smoke:api` | Passed | [smoke-api-result.json](smoke-api-result.json) |

Smoke test; health endpointini, test kullanicisi oturumunu, profil bilgisini, urun kaydini, ingredient analiz seviyesini, onerilen kullanim zamanini ve Shelly chat niyetini kontrol eder.

Shelly'nin farkli urun, rutin ve guvenlik senaryolarindaki beklenen davranislari icin: [../Shelly_AI_Scenarios.md](../Shelly_AI_Scenarios.md)

Gemini client, Temmuz 2026 itibariyla stabil `gemini-3.6-flash` modeliyle
calisir. JSON cevabi yarim veya parse edilemez gelirse ayni istek bir kez daha
kisa ve tamamlanmis JSON talimatiyla denenir.

## Teknik Guvenlik Notlari

- Parolalar `BCryptPasswordEncoder` ile hashlenir.
- API anahtari, Supabase sifresi ve JWT secret local `application.properties` dosyasinda tutulur; bu dosya Git'e eklenmez.
- Paylasilabilir kurulum icin `backend/src/main/resources/application.properties.example` kullanilir.
- Protected endpointler icin JWT zorunludur; sadece health, login ve register public tutulur.
- Hesap silme akisinda kullaniciya bagli asistan mesajlari, cilt kayitlari, urunler ve profil kaydi birlikte temizlenir.
- Shelly tani veya tedavi iddiasi kurmaz; ciddi reaksiyonlarda rutin onermek yerine profesyonel destek sinirini belirtir.
