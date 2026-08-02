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

- [SkinShelf 1.0.0 (27) kalıcı GitHub Release](https://github.com/cerensvr/TMGC-Team/releases/tag/v1.0.0-preview.27)
- [SkinShelf 1.0.0 (27) doğrudan APK](https://github.com/cerensvr/TMGC-Team/releases/download/v1.0.0-preview.27/skinshelf-1.0.0-preview-v27.apk)
- [EAS cloud build kaydı](https://expo.dev/accounts/cernsvr/projects/skinshelf/builds/75234d48-047b-4d23-9e61-1ef7fc0a0b78)
- [APK QR kodu ve kurulum](../../docs/release/README.md)
- [Preview APK ve temiz kurulum raporu](android-preview-apk-verification.md)
- [Production build teknik doğrulaması](android-production-release-verification.md)

## Teslim Sınırı

Teslim, production API'ye bağlı preview APK, gerçek cihaz testi, ekran
kanıtları ve [tanıtım videosuyla](https://youtu.be/HhQa0vlM9QA) tamamlandı. Google Play yayını zorunlu
değildir ve bu teslim kapsamında yapılmadı.

Preview imzalama anahtarı döndürüldü; APK imza, manifest ve SHA-256
kontrollerinden geçti. Public store yayınından önce production AAB yeniden
üretilmeli, `bundletool validate` uygulanmalı ve Play Console kaydı
tamamlanmalıdır.
