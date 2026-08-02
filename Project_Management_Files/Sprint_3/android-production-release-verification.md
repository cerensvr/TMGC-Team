# Android Production Release Doğrulama Raporu

31 Temmuz 2026 tarihinde güncel `main` kaynak kodu, public release öncesi
Android kabul kapsamından geçirildi. Test edilen son uygulama kaynak commit'i
`ddec3930b4cbcc6f0764ded2f7d97200d3f3c4f3`'tür.

## 2 Ağustos 2026 İmzalama Güncellemesi

31 Temmuz raporunda kayıt altına alınan sertifika
`9741345f...` kullanımdan kaldırıldı. `d8062e6` kaynak commit'i, yeni EAS remote
keystore ile `1.0.0 (27)` preview APK olarak yeniden üretildi. Yeni sertifika
SHA-256 değeri `35ea976c8034bb37b6aa9dbb23a635ba00c35926af18d947271f67b91656b85b`'dir.

Yeni artifact'in imzası, manifesti ve SHA-256 değeri bağımsız araçlarla
doğrulandı ve kalıcı [GitHub Release](https://github.com/cerensvr/TMGC-Team/releases/tag/v1.0.0-preview.27)
üzerinden preview dağıtımına açıldı. Ayrıntılar
[güncel APK raporundadır](android-preview-apk-verification.md). Aşağıdaki
`1.0.0 (18)` APK ve `1.0.0 (19)` AAB bölümleri geçmiş teknik kayıt olarak
korunur ve dağıtım için kullanılmaz.

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

## Geçmiş İmzalama Güvenliği Olayı

Yerel EAS build süreci durdurulurken Android imzalama materyali terminal hata
çıktısında göründü. Gizli değerler bu rapora veya repository'ye yazılmadı;
ancak o tarihteki keystore güvenli kabul edilemezdi. Bu nedenle yukarıdaki
`1.0.0 (18)` APK ve `1.0.0 (19)` AAB
yalnız teknik build/test kanıtıdır ve public dağıtıma verilmemelidir.

- Uygulama Google Play'e hiç yüklenmediyse EAS Android keystore yenilenmeli.
- Play App Signing kaydı varsa Play Console upload-key rotation akışı
  kullanılmalı; kayıtlı app signing key rastgele değiştirilmemeli.
- Yeni anahtardan sonra preview APK ve production AAB yeniden üretilmeli;
  imza, manifest, temiz kurulum ve SHA-256 doğrulamaları tekrarlanmalı.

Bu nedenle o tarihte başlatılan cloud Android buildleri iptal edildi. Anahtar
rotasyonu daha sonra tamamlandı ve güncel `1.0.0 (27)` artifact'i üretildi.

## Geçmiş Artifact Sınırı

Bu bölümdeki `1.0.0 (18)` ve `1.0.0 (19)` artifactleri imzalama olayı nedeniyle
dağıtıma uygun değildir. Güncel preview dağıtımı `1.0.0 (27)` ile yapılır.
Google Play yükleme/gönderim işlemi bu doğrulamanın parçası değildir.
