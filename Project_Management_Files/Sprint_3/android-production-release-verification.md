# Android Production Release Doğrulama Raporu

31 Temmuz 2026 tarihinde güncel `main` kaynak kodu, public release öncesi
Android kabul kapsamından geçirildi. Test edilen son uygulama kaynak commit'i
`ddec3930b4cbcc6f0764ded2f7d97200d3f3c4f3`'tür.

## Kaynak ve Kalite Kapıları

| Kontrol | Sonuç |
| --- | --- |
| Test edilen kaynak commit'i | `ddec3930b4cbcc6f0764ded2f7d97200d3f3c4f3` |
| Expo / React Native | SDK `57.0.0` / React Native `0.86.2` |
| TypeScript | `npm run build` geçti |
| Artifact commit'indeki mobil testler | `12/12` geçti |
| Artifact commit'indeki backend testleri | `53/53` geçti |
| Final kaynak kalite kapıları | `19/19` mobil, `67/67` backend; [güncel test indeksi](Test_and_Verification.md) |
| Expo Doctor | `20/20` geçti |
| Production dependency audit | `0` bilinen açık |

## Temiz Kurulumla Test Edilen APK

| Alan | Değer |
| --- | --- |
| Build profili | `preview` / `INTERNAL` / signed APK |
| Uygulama sürümü | `1.0.0` |
| Android versionCode | `18` |
| Paket | `com.skinshelf.app` |
| minSdk / targetSdk | `24` / `36` |
| Yerel EAS build | `BUILD SUCCESSFUL` — 414 Gradle görevi, 1 dk 52 sn |
| APK SHA-256 | `62a252df68e938803b561d3dde741b4e3810778f17a647be8911821d70348b03` |
| İmza doğrulaması | APK Signature Scheme v2 geçti; RSA 2048, tek signer |
| Build provenance | Detached, temiz `ddec393` worktree; 23,4 MB EAS kaynak arşivi |

### Cihaz Kabul Sonuçları

Android 16 / API 36 `Medium_Phone` emülatöründe önceki
`com.skinshelf.app` paketi kaldırıldı; buna bağlı eski uygulama verisi silindi
ve APK sıfırdan kuruldu.

- Package Manager `1.0.0 (18)` sürümünü, `minSdk 24` ve `targetSdk 36`
  değerlerini doğruladı.
- Splash ve karşılama ekranı doğru yerleşimle açıldı.
- Kayıt ekranına geçiş ve legal bağlantının Android dış tarayıcısını açması
  doğrulandı.
- İlk açılıştan sonra uygulama zorla durduruldu ve yeniden soğuk başlatıldı.
  Host üzerindeki paralel Gradle yükü bittikten sonra tekrarlanan ölçüm
  `Status: ok`, `LaunchState: COLD` ve `TotalTime: 3.165 sn` verdi.
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
| Uygulama sürümü / versionCode | `1.0.0 (19)` |
| Paket / SDK | `com.skinshelf.app` / min `24`, target `36` |
| Yerel EAS build | `BUILD SUCCESSFUL` — 416 Gradle görevi, 1 dk 54 sn |
| AAB SHA-256 | `1896626b355f4e11e7dd8deab85e0a1d4116e5bbb870801c7d5660d150ed2759` |
| AAB imzası | `jarsigner -verify` geçti |
| Bundle doğrulaması | Resmi Bundletool `1.18.3 validate` geçti |
| Manifest kontrolü | `RECORD_AUDIO` ve `SYSTEM_ALERT_WINDOW` yok |
| Build provenance | Detached, temiz `ddec393` worktree; 23,4 MB EAS kaynak arşivi |

## İmzalama Güvenliği Blokeri

Yerel EAS build süreci durdurulurken Android imzalama materyali terminal hata
çıktısında göründü. Gizli değerler bu rapora veya repository'ye yazılmadı;
ancak mevcut keystore güvenli kabul edilemez. Bu nedenle yukarıdaki APK ve AAB
yalnız teknik build/test kanıtıdır ve public dağıtıma verilmemelidir.

- Uygulama Google Play'e hiç yüklenmediyse EAS Android keystore yenilenmeli.
- Play App Signing kaydı varsa Play Console upload-key rotation akışı
  kullanılmalı; kayıtlı app signing key rastgele değiştirilmemeli.
- Yeni anahtardan sonra preview APK ve production AAB yeniden üretilmeli;
  imza, manifest, temiz kurulum ve SHA-256 doğrulamaları tekrarlanmalı.

Bu nedenle daha önce başlatılan tüm cloud Android buildleri iptal edildi. Anahtar
rotasyonu tamamlanmadan aktif cloud release build'i yoktur.

## Release Sınırı

Bu doğrulama Android artifact içeriğini kapsar; mevcut artifactler imzalama
blokeri nedeniyle dağıtıma uygun değildir. Legal sayfalar kaynak kodda ve mobil
bağlantılarda hazırdır; public URL'lerin canlı doğrulaması için bu commitlerin
remote `main`'e pushlanması ve Render deployunun tamamlanması gerekir. Google
Play yükleme/gönderim işlemi bu doğrulamanın parçası değildir.
