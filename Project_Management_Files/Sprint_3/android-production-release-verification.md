# Android Production Release Doğrulama Raporu

31 Temmuz 2026 tarihinde güncel `main` kaynak kodu, public release öncesi
Android kabul kapsamından geçirildi. Test edilen son uygulama kaynak commit'i
`3b5339d0e884dc1214b15ecd9afcf454ecfd590e`'dir.

## Kaynak ve Kalite Kapıları

| Kontrol | Sonuç |
| --- | --- |
| Test edilen kaynak commit'i | `3b5339d0e884dc1214b15ecd9afcf454ecfd590e` |
| Expo / React Native | SDK `57.0.0` / React Native `0.86.2` |
| TypeScript | `npm run build` geçti |
| Mobil testler | `12/12` geçti |
| Backend testleri | `53/53` geçti |
| Expo Doctor | `20/20` geçti |
| Production dependency audit | `0` bilinen açık |

## Temiz Kurulumla Test Edilen APK

| Alan | Değer |
| --- | --- |
| Build profili | `preview` / `INTERNAL` / signed APK |
| Uygulama sürümü | `1.0.0` |
| Android versionCode | `13` |
| Paket | `com.skinshelf.app` |
| minSdk / targetSdk | `24` / `36` |
| Yerel EAS build | `BUILD SUCCESSFUL` — 414 Gradle görevi, 2 dk 1 sn |
| APK SHA-256 | `fa7066cc526ad38aa2b9e7cdf364feadbe295e2bf2d03fb83311dcabc5b79cb7` |
| İmza doğrulaması | APK Signature Scheme v2 geçti; RSA 2048, tek signer |
| Güncel EAS cloud preview | [05d9041d-4ba8-4e35-ad5c-593fabfe82b3](https://expo.dev/accounts/cernsvr/projects/skinshelf/builds/05d9041d-4ba8-4e35-ad5c-593fabfe82b3), versionCode `16`, kuyrukta |

### Cihaz Kabul Sonuçları

Android 16 / API 36 `Medium_Phone` emülatöründe önceki
`com.skinshelf.app` paketi kaldırıldı; buna bağlı eski uygulama verisi silindi
ve APK sıfırdan kuruldu.

- Package Manager `1.0.0 (13)` sürümünü, `minSdk 24` ve `targetSdk 36`
  değerlerini doğruladı.
- Splash ve karşılama ekranı doğru yerleşimle açıldı.
- Kayıt ekranına geçiş ve legal bağlantının Android dış tarayıcısını açması
  doğrulandı.
- İlk açılıştan sonra uygulama zorla durduruldu ve yeniden soğuk başlatıldı.
  İki açılış da `Status: ok` ve `LaunchState: COLD` verdi; ölçülen açılış
  süreleri 4.808 ve 3.737 saniyeydi.
- Her iki açılışın `logcat` taramasında fatal exception, ANR veya React Native
  fatal hata bulunmadı.
- Manifestte `RECORD_AUDIO` ve kullanılmayan `SYSTEM_ALERT_WINDOW` bulunmuyor.
  Eski Android depolama izinleri yalnızca `maxSdkVersion=32` ile sınırlı;
  `CAMERA` ve bildirim izinleri uygulamanın mevcut kamera/bildirim
  özellikleriyle uyumlu.

## Production AAB

Mağaza profiliyle signed production AAB üretildi ve güncel resmi Bundletool ile
doğrulandı.

| Alan | Değer |
| --- | --- |
| Profil | `production` / `STORE` / AAB |
| Uygulama sürümü / versionCode | `1.0.0 (14)` |
| Paket / SDK | `com.skinshelf.app` / min `24`, target `36` |
| Yerel EAS build | `BUILD SUCCESSFUL` — 416 Gradle görevi, 1 dk 54 sn |
| AAB SHA-256 | `594f2244dfc486dc3e3555f6765b1c1305c82386f4e894ea4d685f3b6a0fc84c` |
| AAB imzası | `jarsigner -verify` geçti |
| Bundle doğrulaması | Resmi Bundletool `1.18.3 validate` geçti |
| Manifest kontrolü | `RECORD_AUDIO` ve `SYSTEM_ALERT_WINDOW` yok |
| Güncel EAS cloud production | [3013fd25-464f-4cb8-8b89-731913db6623](https://expo.dev/accounts/cernsvr/projects/skinshelf/builds/3013fd25-464f-4cb8-8b89-731913db6623), versionCode `15`, kuyrukta |

İzin sertleştirmesinden önce kuyruğa alınan cloud build
`7fb02c44-58a2-45ec-b21d-5b1bf7b398c1` ve
`1efca0f6-d1e7-4466-9456-986cb46e6db6` iptal edildi. Bu eski artifactler
release adayı değildir. Güncel cloud buildlerin kaynak commit'i
`29ea2d4b82b8593ed63c3e8a69c598d5163dc0c0` ve fingerprint'i
`52271b6f5f6496760fc47fb19564a3952e6b8a27`'dir.

## Release Sınırı

Bu doğrulama Android release artifact'lerini kapsar. Legal sayfalar kaynak
kodda ve mobil bağlantılarda hazırdır; public URL'lerin canlı doğrulaması için
bu commitlerin remote `main`'e pushlanması ve Render deployunun tamamlanması
gerekir. Google Play yükleme/gönderim işlemi bu doğrulamanın parçası değildir.
