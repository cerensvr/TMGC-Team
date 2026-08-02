# Demo Hazirlik ve Kalite Kontrol Akisi

Bu dosya Sprint 2 tesliminde projenin hizli anlasilmasi, calistirilmasi ve teknik kanitlarin tek yerden kontrol edilmesi icin hazirlandi.

## 30 Saniyelik Urun Ozeti

SkinShelf, kullanicinin cilt bakim urunlerini dijital bir rafa tasiyan ve Shelly araciligiyla urun-cilt-rutin uyumunu takip eden AI destekli mobil uygulamadir. Shelly sadece genel cevap veren bir chatbot degil; kullanicinin cilt profilini, dolabindaki urunleri, aktif icerikleri, kullanim zamanini ve cilt takibi kayitlarini birlikte degerlendiren bir cilt bakim danismanidir.

## En Guclu Degerlendirme Kanitlari

| Degerlendirme noktasi | Kanit |
| --- | --- |
| Calisan mobil urun | [Product_Screenshots](Product_Screenshots) |
| Fullstack API | [Backend_API](Backend_API) |
| Supabase veri modeli | [System_Design](System_Design) |
| Shelly AI davranisi | [Shelly_AI_Scenarios.md](Shelly_AI_Scenarios.md) |
| Story point ve board takibi | [sprint2-story-points.md](sprint2-story-points.md), [Sprint_Board](Sprint_Board) |
| Test / dogrulama | [Test_and_Verification.md](Test_and_Verification.md) |
| API smoke sonucu | [Backend_API/smoke-api-result.json](Backend_API/smoke-api-result.json) |

## Demo Akisi

1. Login ekraninda SkinShelf'in vaadi gosterilir: urunleri rafa ekleme ve Shelly ile uyum takibi.
2. Test kullanicisiyle giris yapilir.
3. Dolabim ekraninda backend'den gelen urunler raf halinde gosterilir.
4. Urun detayinda aktif/pasif rutin kullanimi degistirilir.
5. Rutinim ekraninda bugunun rutini ve haftalik planin dolaptaki aktif urunlere gore degistigi gosterilir.
6. Shelly ekraninda "Bugunku rutinim agir mi?" veya "Bu iki urun birlikte kullanilir mi?" senaryosu sorulur.
7. Cilt Takibi ekraninda fotograf notu/haftalik ozet akisi gosterilir.
8. Profil ekraninda hesap, cilt profili ve veri silme siniri gosterilir.

## Smoke Test Hesap Seti

`scripts/smoke-api.mjs` asagidaki test kullanicilarini otomatik olusturur veya varsa login olarak kullanir:

| Kullanici | Profil amaci | Demo sorusu |
| --- | --- | --- |
| `test-kuru@example.com` | Kuru/hassas cilt ve reaksiyon akisi | `Cildim kizardi ve tepki verdi` |
| `test-yagli@example.com` | Yagli cilt ve aktif icerik uyumu | `Bu iki urun birlikte kullanilir mi?` |
| `test-karma@example.com` | Karma cilt ve rutin yogunlugu | `Bugunku rutinim agir mi?` |

Not: Bu hesaplar demo/smoke test icindir. Gercek kullanici sifresi veya gizli anahtar README icinde paylasilmaz.

## Tek Komutla Dogrulama

Frontend TypeScript kontrolu:

```bash
npm ci
npm run build
```

Backend testleri:

```bash
cd backend
./mvnw test
```

Canli API smoke testi:

```bash
npm run smoke:api
```

Smoke test Supabase uzerinde test kullanicisi, test urunu ve Shelly mesajlari olusturdugu icin GitHub Actions'ta otomatik calistirilmez. CI, her push ve pull request icin frontend build ile backend testlerini calistirir.

## Demo Konusma Metni

SkinShelf'in farki, kullanicinin sahip oldugu urunleri merkeze almasidir. Uygulama once urunleri dijital rafa kaydeder; sonra Shelly bu raf, cilt profili ve rutin gecmisini birlikte okuyarak bugun hangi urunlerin kullanilacagini, hangi aktiflerin ayrilmasi gerektigini ve kullanicinin cilt degisimlerini takip eder. Bu nedenle proje sadece "AI chatbot" degil, mobil urun dolabi + rutin planlayici + guvenli AI yorum katmani olarak calisir.

## Guvenlik ve Etik Sinir

- Shelly tani veya tedavi iddiasi kurmaz.
- Reaksiyon, sisme, nefes darligi veya ciddi yanma gibi durumlarda rutin onermeden profesyonel destek yonlendirmesi verir.
- Receteli urunler icin dermatolog onayi olmadan degisiklik onermemesi beklenir.
- Kullanici verisi mobil istemciden dogrudan Supabase'e yazilmaz; Spring Boot API ve JWT siniri uzerinden akar.
- API anahtarlari, veritabani sifreleri ve JWT secret Git disinda tutulur.

## Degerlendirme Kontrol Listesi

| Baslik | Durum | Kanit |
| --- | --- | --- |
| README ilk bakista urunu anlatiyor | Tamam | Kok README hizli ozeti |
| Sprint 2 point mantigi gorunur | Tamam | [sprint2-story-points.md](sprint2-story-points.md) |
| Notion board kaniti var | Tamam | [Sprint_Board](Sprint_Board) |
| App ekranlari repo ana sayfasinda gorunur | Tamam | Kok README Sprint 2 screenshots |
| Fullstack calisirlik ispatli | Tamam | Backend API + smoke JSON |
| Otomatik kalite kontrolu var | Tamam | `.github/workflows/quality-check.yml` |
| AI degeri senaryoyla ispatli | Tamam | [Shelly_AI_Scenarios.md](Shelly_AI_Scenarios.md) |
| Guvenlik/etik sinir yazili | Tamam | Bu dosya ve [Backend_API](Backend_API) |
