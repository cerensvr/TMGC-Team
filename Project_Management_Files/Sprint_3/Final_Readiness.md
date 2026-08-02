# Sprint 3 Final Teslim Kontrolü

Sprint 3, SkinShelf'in final demo kalitesine getirildiği kapanış sprintidir.
Bu dosya tamamlanan ürün, Scrum, teknik kalite ve sunum maddelerini tek yerde
toplar. Sprint 102/102 SP ve 0 kalan PBI ile kapatıldı.

## Final Demo Hikayesi

SkinShelf'e urunlerini ekle, Shelly cildinle uyumunu takip etsin.

Final demoda anlatilacak ana hikaye:

1. Kullanici giris yapar ve cilt profilini tamamlar.
2. Urunlerini dijital rafa ekler.
3. Shelly, raftaki urunleri cilt profiliyle birlikte yorumlar.
4. Rutinim ekrani yalnizca aktif urunlerden gunluk ve haftalik plan uretir.
5. Kullanici cilt degisimini kaydeder; Shelly sonraki onerilerde bu baglami kullanir.
6. Profil ekraninda veri ve hesap yonetimi sinirlari gosterilir.

## Sprint 3 Kapanış Sonucu

| Baslik | Beklenen cikti | Durum |
| --- | --- | --- |
| Final app screenshots | Login, Dolabım, ürün detay, Rutinim, Shelly, Cilt Takibi, Profil | [Tamamlandı](Product_Screenshots/README.md) |
| Board ve backlog | Status, Sprint, Point, Assignee ve issue kabul kanıtları | [Tamamlandı](Sprint_Board/README.md) |
| Sprint 3 burndown | 102 hedef, 102 tamamlanan, 0 kalan | [Tamamlandı](Burndown_Chart/README.md) |
| Daily Scrum kanıtları | Tarihli, repository ile doğrulanabilir özet | [Tamamlandı](Daily_Scrum/README.md) |
| Final test | 19 mobil, 63 backend, 100 Shelly ve 4 smoke senaryosu | [Tamamlandı](Test_and_Verification.md) |
| Gerçek kullanıcı pilotu | 10 katılımcı, 10 gün, anonim özet ve tam rapor | [Tamamlandı](../../docs/user-research/README.md) |
| Shelly otomatik eval | 100 senaryo, rutin politika motoru, 4 profilli full-stack smoke | [Tamamlandı](shelly-evaluation-report.md) |
| Gerçek cihaz | POCO X6 Pro ana ve hata akışları | [Tamamlandı](RELEASE-CANDIDATE-TEST.md) |
| Final demo videosu | 3 dakikalık final akışı ve yedek ekran seti | [Tamamlandı](demo-and-device-evidence.md) |
| Review ve retrospective | Sonuçlar, katılımcılar ve aksiyonlar | [Tamamlandı](Review_and_Retrospective/README.md) |

## Zaten Hazir Teknik Kanitlar

Sprint 2'de tamamlanan fullstack altyapi final teslimin teknik temelini olusturur:

| Kanit | Dosya |
| --- | --- |
| Fullstack API ve endpoint listesi | [../Sprint_2/Backend_API](../Sprint_2/Backend_API) |
| Supabase/Flyway mimari kaniti | [../Sprint_2/System_Design](../Sprint_2/System_Design) |
| Shelly AI davranis senaryolari | [../Sprint_2/Shelly_AI_Scenarios.md](../Sprint_2/Shelly_AI_Scenarios.md) |
| Test ve CI dogrulama | [../Sprint_2/Test_and_Verification.md](../Sprint_2/Test_and_Verification.md) |
| Güncel Shelly eval ve rutin politika kanıtı | [shelly-evaluation-report.md](shelly-evaluation-report.md) |
| Canli Android ekran seti | [../Sprint_2/Product_Screenshots](../Sprint_2/Product_Screenshots) |
| Canli Render/Supabase/Gemini smoke testi | [live-api-smoke-report.md](live-api-smoke-report.md) |
| EAS preview APK ve temiz kurulum | [android-preview-apk-verification.md](android-preview-apk-verification.md) |
| Güncel Android production release doğrulaması | [android-production-release-verification.md](android-production-release-verification.md) |

## Final Test Komutlari

```bash
npm ci
npm audit --omit=dev --audit-level=moderate
npx expo-doctor
npm run build
npm test
cd backend
./mvnw test
```

Canli backend acikken:

```bash
npm run smoke:api
```

Android emulator final kontrolunde minimum akislari:

- Login
- Dolabim raf gorunumu
- Urun ekleme veya urun detay aktif/pasif switch
- Rutinim gunluk plan
- Haftalik plan modal
- Shelly soru-cevap
- Cilt Takibi
- Profil ve cikis

## Board Kapanış Kontrolü

Sprint kapanışında:

- Sprint 3 kartları Done kolonunda kapatıldı.
- `Point`, `Status`, `Sprint`, `Assignee` ve `Evidence` alanları aynı
  story point tablosuyla eşleştirildi.
- Board başlangıç, orta kontrol ve kapanış kanıtları ayrı kaydedildi.
- GitHub README, Sprint 3 teslim indeksine bağlandı.

## Sunumda Vurgulanacak Fark

SkinShelf'in guclu yani, Shelly'nin kullanicinin gercek rafina bakarak rutin olusturmasidir. Urun yoksa urun uydurmaz; aktif icerikleri ayni geceye yigmadan haftaya yayar; cilt tepkisi varsa rutini sade moduna ceker ve tibbi siniri asmaz. Bu, projeyi siradan bir AI sohbet ekranindan ayirir.
