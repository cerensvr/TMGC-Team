# Sprint 3 Deployment Notları

## Çalışan Topoloji

| Katman | Teknoloji | Durum |
| --- | --- | --- |
| Mobil | React Native / Expo | Preview APK ile doğrulandı |
| Backend | Java 17 / Spring Boot / Render | `/api/health` ve kritik akışlar geçti |
| Database | Supabase PostgreSQL | Flyway migration ile doğrulandı |
| AI | Gemini + yerel bilgi/policy katmanları | Kota ve hata durumunda kontrollü fallback var |
| CI | GitHub Actions | Frontend, backend ve full-stack smoke job'ları var |

## Build Kayıtları

- [SkinShelf 1.0.0 (8) EAS build kaydı](https://expo.dev/accounts/cernsvr/projects/skinshelf/builds/30a32ca1-0cab-44b6-b95e-e68ec4e1ab25)
- [SkinShelf 1.0.0 (7) tamamlanmış APK](https://expo.dev/accounts/cernsvr/projects/skinshelf/builds/b6cc54e2-f03d-4c32-9298-7607fb794697)
- [Preview APK ve temiz kurulum raporu](android-preview-apk-verification.md)
- [Production build teknik doğrulaması](android-production-release-verification.md)

## Teslim Sınırı

Bootcamp teslimi, production API'ye bağlı preview APK, gerçek cihaz testi,
ekran kanıtları ve demo videosuyla tamamlandı. Google Play yayını zorunlu
değildir ve bu teslim kapsamında yapılmadı.

Public store yayınından önce Android signing key rotasyonu, yeni AAB,
`bundletool validate`, imza doğrulama ve yeni SHA-256 kaydı yeniden
yapılmalıdır. Bu not teslimi bloke etmez; store operasyonu için güvenlik
gereksinimidir.
