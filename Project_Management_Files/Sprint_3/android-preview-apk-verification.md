# Android Preview APK Doğrulama Raporu

Issue [#19](https://github.com/gismo-o/TMGC-Team/issues/19) için production API'ye bağlı preview APK, temiz Android emülatörlerinde ve gerçek cihazda doğrulandı. Son dağıtılabilir artifact 2 Ağustos 2026 tarihinde döndürülmüş imzalama anahtarıyla yeniden üretildi.

## Dağıtılabilir Android Preview: 1.0.0 (27)

| Alan | Değer |
| --- | --- |
| Durum | `FINISHED` |
| Profil | `preview` / `INTERNAL` / APK |
| Kaynak commit | `d8062e69b05931e0219b880c974a5e1dc6df0f61` |
| EAS build | [75234d48-047b-4d23-9e61-1ef7fc0a0b78](https://expo.dev/accounts/cernsvr/projects/skinshelf/builds/75234d48-047b-4d23-9e61-1ef7fc0a0b78) |
| Kalıcı release | [v1.0.0-preview.27](https://github.com/cerensvr/TMGC-Team/releases/tag/v1.0.0-preview.27) |
| Doğrudan APK | [skinshelf-1.0.0-preview-v27.apk](https://github.com/cerensvr/TMGC-Team/releases/download/v1.0.0-preview.27/skinshelf-1.0.0-preview-v27.apk) |
| Dosya boyutu | `101.871.867` bayt |
| APK SHA-256 | `ef02edf2b083e51fe44e5437573cf9bf6db9b18a2c4656aea9536986400ef60c` |
| Paket / SDK | `com.skinshelf.app` / min `24`, target `36` |
| İmza | v2, RSA 2048, tek signer |
| Sertifika SHA-256 | `35ea976c8034bb37b6aa9dbb23a635ba00c35926af18d947271f67b91656b85b` |
| CI | [quality-check geçti](https://github.com/cerensvr/TMGC-Team/actions/runs/30765588548) |

### Artifact Kabul Sonuçları

- GitHub Release asset digest'i ile indirilen APK'nın SHA-256 değeri eşleşti.
- `aapt` paket adını, `1.0.0 (27)` sürümünü ve SDK sınırlarını doğruladı.
- `apksigner`, APK Signature Scheme v2 imzasını ve tek RSA-2048 signer'ı doğruladı.
- Manifestte kullanılan kamera, bildirim, ağ, biyometri ve çalışma zamanı izinleri var.
- `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `RECORD_AUDIO` ve
  `SYSTEM_ALERT_WINDOW` manifestte bulunmuyor.
- Bu artifact için emülatör yeniden kurulmadı; uygulamanın gerçek cihaz ve temiz
  emülatör akışları aşağıdaki önceki kabul koşularında ayrıca doğrulandı.
- [QR kodu ve kurulum yönergesi](../../docs/release/README.md) kalıcı release
  asset'ine bağlıdır.

## Geçmiş Temiz Kurulum Kanıtı: 1.0.0 (8)

| Alan | Değer |
| --- | --- |
| Yerel EAS build durumu | `BUILD SUCCESSFUL` |
| Profil | `preview` / `INTERNAL` / APK |
| Uygulama sürümü | `1.0.0` |
| Android versionCode | `8` |
| Build commit | `b9c04ad7fca48b9a0f8e37117227881ff98f88d1` |
| EAS cloud build | [30a32ca1-0cab-44b6-b95e-e68ec4e1ab25](https://expo.dev/accounts/cernsvr/projects/skinshelf/builds/30a32ca1-0cab-44b6-b95e-e68ec4e1ab25) |
| Yerel APK SHA-256 | `850a1337e2ea72bca36b26e8d13ba9debfdf5fedc2268bac3110bd5dedbca41f` |
| Paket / imza | `com.skinshelf.app` / APK Signature Scheme v2 |
| Production API | `https://skinshelf-backend.onrender.com/api/auth` |

Yerel EAS build'i 372 Gradle göreviyle 3 dakika 33 saniyede tamamlandı ve aynı
commit için cloud build kaydı oluşturuldu. Bu bölüm temiz kurulum geçmişidir;
güncel indirme kaynağı `1.0.0 (27)` GitHub Release asset'idir.

### 1.0.0 (8) Temiz Kurulum Matrisi

| Emülatör oturumu | Ekran | Temiz kurulum | Açılış | Canlı login |
| --- | --- | --- | --- | --- |
| Android 16 / API 36, `emulator-5554` | 1080×2400 | Geçti | Geçti | Geçti |
| Android 16 / API 36, `emulator-5556` | 1080×2400 ve 720×1280 compact | Geçti | Geçti | Geçti |

İki oturumda da emülatör verisi sıfırlandı, önceki paket kaldırıldı ve APK
sıfırdan kuruldu. İkinci oturum ayrıca 720×1280 compact görünümde yeniden
açıldı. Paket yöneticisi her iki kurulumda `1.0.0 (8)` sürümünü doğruladı.

### 1.0.0 (8) Kabul Sonuçları

- Canlı Render hesabıyla login, profil ve ürün yükleme tamamlandı; ana ekranda
  `Cilt Bakım Dolabı` görüntülendi.
- Uygulama zorla durdurulup yeniden açıldığında oturum geri yüklendi.
- Android bildirim izni, girişten sonra sistem tarafından
  `Allow SkinShelf to send you notifications?` metniyle istendi ve izin durumu
  package manager'da `granted=true` oldu.
- Kamera akışında uygulama açıklaması, Android kamera izni, sistem kamerası,
  fotoğraf çekme, kırpma ve uygulamaya dönüş adımları çökmeden tamamlandı.
- Galeri akışı geniş depolama izni istemeden
  `com.google.android.photopicker` sistem Photo Picker'ını açtı.
- Manifestte `CAMERA` ve `POST_NOTIFICATIONS` var; `RECORD_AUDIO` yok.
- Her iki oturumun `logcat` taramasında fatal Android, React Native hatası veya
  ANR bulunmadı.
- Sentetik test hesapları test sonunda silindi; silme sonrası login `401`
  döndü.
- Fiziksel Android cihaz ve fiziksel barkod testi bu doğrulama koşusunun
  dışındaydı; sonraki gerçek cihaz kabulü ayrı raporda tamamlandı.

## Geçmiş Tamamlanmış EAS Build: 1.0.0 (7)

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

İlk test sırasında Render free instance'ın 5 saniyelik health check'i kaçırdığı
ve önceki instance'ın status `137` ile kapandığı görüldü. İlk sınırlandırma
commit'i `cd31309` ile canlıya alındı. Güncel `b9c04ad` deployunda JVM
`-Xmx192m`, 96 MB metaspace, 32 MB code cache ve 32 MB direct memory ile
sınırlandı; Hikari havuzu iki bağlantıya indirildi. Yeni instance 64.993
saniyede başladı. `/api/health`, üç profilli canlı API smoke testi ve emülatör
login istekleri geçti. Test hesapları `204` ile silindi.
