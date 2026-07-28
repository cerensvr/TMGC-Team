# Sprint 3 Final Hazirlik Kontrolu

Sprint 3, SkinShelf'in final demo kalitesine getirildigi kapanis sprintidir. Bu dosya final teslimden once kontrol edilecek urun, Scrum, teknik kalite ve sunum maddelerini tek yerde toplar.

## Final Demo Hikayesi

SkinShelf'e urunlerini ekle, Shelly cildinle uyumunu takip etsin.

Final demoda anlatilacak ana hikaye:

1. Kullanici giris yapar ve cilt profilini tamamlar.
2. Urunlerini dijital rafa ekler.
3. Shelly, raftaki urunleri cilt profiliyle birlikte yorumlar.
4. Rutinim ekrani yalnizca aktif urunlerden gunluk ve haftalik plan uretir.
5. Kullanici cilt degisimini kaydeder; Shelly sonraki onerilerde bu baglami kullanir.
6. Profil ekraninda veri ve hesap yonetimi sinirlari gosterilir.

## Sprint 3 Kapanmadan Once

| Baslik | Beklenen cikti | Durum |
| --- | --- | --- |
| Final app screenshots | Login, Dolabim, urun detay, Rutinim, Shelly, Cilt Takibi, Profil | Devam ediyor |
| Notion board close-up | Status, Sprint, Point, Assignee alanlari okunur | Devam ediyor |
| Sprint 3 burndown | Hedef/tamamlanan/kalan puan ozeti | Devam ediyor |
| Daily scrum kanitlari | 2-4 ekran goruntusu veya ozet | Devam ediyor |
| Final test | Frontend build, backend test, canlı API smoke geçti; APK temiz kurulum testi bekleniyor | Devam ediyor |
| Final sunum linki | Video olmadan da demo akisi ve ekran seti yeterli kanit sunmali | Devam ediyor |

## Zaten Hazir Teknik Kanitlar

Sprint 2'de tamamlanan fullstack altyapi final teslimin teknik temelini olusturur:

| Kanit | Dosya |
| --- | --- |
| Fullstack API ve endpoint listesi | [../Sprint_2/Backend_API](../Sprint_2/Backend_API) |
| Supabase/Flyway mimari kaniti | [../Sprint_2/System_Design](../Sprint_2/System_Design) |
| Shelly AI davranis senaryolari | [../Sprint_2/Shelly_AI_Scenarios.md](../Sprint_2/Shelly_AI_Scenarios.md) |
| Test ve CI dogrulama | [../Sprint_2/Test_and_Verification.md](../Sprint_2/Test_and_Verification.md) |
| Canli Android ekran seti | [../Sprint_2/Product_Screenshots](../Sprint_2/Product_Screenshots) |
| Canli Render/Supabase/Gemini smoke testi | [live-api-smoke-report.md](live-api-smoke-report.md) |

## Final Test Komutlari

```bash
npm ci
npm run build
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

## Notion Kapanis Kontrolu

Final teslimde Notion board goruntusu alinmadan once:

- Sprint 3 kartlari dogru kolonda olmali.
- Kartlarda `Point`, `Status`, `Sprint`, `Assignee` alanlari gorunmeli.
- Board genel gorunum, kart close-up ve gerekiyorsa Gantt/Timeline gorunumu ayri ayri alinmali.
- GitHub README'deki Sprint 3 linkleri bu ekran goruntulerine baglanmali.

## Sunumda Vurgulanacak Fark

SkinShelf'in guclu yani, Shelly'nin kullanicinin gercek rafina bakarak rutin olusturmasidir. Urun yoksa urun uydurmaz; aktif icerikleri ayni geceye yigmadan haftaya yayar; cilt tepkisi varsa rutini sade moduna ceker ve tibbi siniri asmaz. Bu, projeyi siradan bir AI sohbet ekranindan ayirir.
