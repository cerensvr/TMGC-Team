# Android Preview APK Doğrulama Raporu

Issue [#19](https://github.com/gismo-o/TMGC-Team/issues/19) için production API'ye bağlı EAS preview APK, 29 Temmuz 2026 tarihinde iki temiz Android emülatöründe doğrulandı.

## Build

| Alan | Değer |
| --- | --- |
| Durum | `FINISHED` |
| Profil | `preview` / `INTERNAL` / APK |
| Uygulama sürümü | `1.0.0` |
| Android versionCode | `7` |
| Expo SDK | `54.0.0` |
| Build commit | `bb72784e7bbef80248e73a8b2460db3533f0fcb7` |
| EAS build | [b6cc54e2-f03d-4c32-9298-7607fb794697](https://expo.dev/accounts/cernsvr/projects/skinshelf/builds/b6cc54e2-f03d-4c32-9298-7607fb794697) |
| Doğrudan APK | [SkinShelf 1.0.0 (7) APK](https://expo.dev/artifacts/eas/ElXjlZ6koWoWXIaGti9k3yWGDX6yWPxA8-BCPOVwCgU.apk) |
| APK SHA-256 | `fdf3a4ed71bcd79f7de712a48fe56a99302c54ff636050aeef4b82f6f354736a` |
| Production API | `https://skinshelf-backend.onrender.com/api/auth` |

EAS internal distribution bağlantısı 12 Ağustos 2026 tarihine kadar doğrudan indirilebilir. Kalıcı build kaydı EAS build sayfasında ekip tarafından görülebilir; daha sonraki teslimler aynı `preview` profiliyle yeniden üretilebilir.

## Temiz Kurulum Matrisi

| Emülatör | Ekran | Temiz kurulum | Açılış | Canlı login |
| --- | --- | --- | --- | --- |
| Android 16 / API 36, `emulator-5560` | 1080×2400 | Geçti | Geçti | Geçti |
| Android 16 / API 36, `emulator-5562` | 720×1280 compact | Geçti | Geçti | Geçti |

Her iki test oturumu da `wipe-data`, `read-only` ve snapshot kapalı olarak başlatıldı. Önceki paket kaldırıldı, APK sıfırdan kuruldu ve cihaz içindeki sürüm bilgisi `1.0.0 (7)` olarak doğrulandı.

## Kabul Kontrolleri

- EAS proje erişimi, remote Android keystore ve remote version source doğrulandı.
- Preview build production API URL'siyle üretildi.
- APK v2 imzası doğrulandı; paket adı `com.skinshelf.app`.
- Standart ve compact emülatörde temiz kurulum, splash, karşılama ve giriş formu sorunsuz açıldı.
- Aynı sentetik smoke hesabıyla iki emülatörde gerçek `/login`, profil yükleme ve `Cilt Bakım Dolabı` ana ekranına geçiş tamamlandı.
- Compact giriş formu klavye ve küçük yükseklikte scroll edilebilir hale getirildi; bütün alanlar ve `Giriş Yap` düğmesi ekranda kaldı.
- Launcher icon ve Android 12 splash adaptive-icon güvenli alanında, kesilmeden ve pikselleşmeden görüntülendi.
- Kamera izin öncesi metni `Kamera izni gerekli / Barkodu okutmak için kameraya izin ver. / İzin ver` olarak görüldü; sistem izni verildikten sonra kamera preview açıldı.
- Galeri akışı geniş depolama izni istemeden Android sistem Photo Picker'ını (`com.google.android.photopicker`) açtı.
- APK manifestinde `RECORD_AUDIO` ve `POST_NOTIFICATIONS` yok. Kullanılmayan mikrofon/bildirim izinleri istenmiyor.
- Mevcut bildirim merkezi `Bildirimler`, yeni bildirim sayısı ve hatırlatma açıklamalarını Türkçe gösteriyor. Gerçek zamanlanmış sistem bildirimleri ayrı [#14](https://github.com/gismo-o/TMGC-Team/issues/14) işinin kapsamındadır.
- Her iki emülatörün final `logcat` taramasında fatal Android veya React Native hatası bulunmadı.
- `npm run build`, `npx expo-doctor` (18/18) ve backend testleri (22/22) geçti.

## Görsel Kanıt

- [Launcher icon](Product_Screenshots/android-preview-launcher-icon.png)
- [Android splash](Product_Screenshots/android-preview-splash.png)
- [Standart karşılama ekranı](Product_Screenshots/android-preview-login-standard.png)
- [Compact karşılama ekranı](Product_Screenshots/android-preview-login-compact.png)
- [Compact giriş formu](Product_Screenshots/android-preview-signin-compact.png)
- [Canlı backend sonrası ana ekran](Product_Screenshots/android-preview-live-home.png)
- [Kamera izin metni](Product_Screenshots/android-preview-camera-permission.png)
- [Android Photo Picker](Product_Screenshots/android-preview-photo-picker.png)
- [Uygulama içi bildirim merkezi](Product_Screenshots/android-preview-notifications.png)

## Render Notu

Test sırasında Render free instance'ın 5 saniyelik health check'i kaçırdığı ve önceki instance'ın status `137` ile kapandığı görüldü. Free tier kararlılığı için JVM heap/metaspace sınırları ve Hikari pool boyutu küçültüldü. Main merge commit'i `cd31309` Render'a deploy edilip `Live` durumuna ulaştı; yeni instance üzerinde `/api/health` ve gerçek `/api/auth/login` istekleri `200` döndü. Smoke hesabı test sonrasında `204` ile silindi.
