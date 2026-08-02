# Sprint 1 Example Repository Comparison

Bu dosya, Sprint 1 teslim yapisini bootcamp ornek repolarindaki Scrum kanit duzeniyle karsilastirir. Amac, README ve proje yonetimi klasorlerinin degerlendirme icin beklenen basliklari net sekilde karsiladigini gostermektir.

## Incelenen Ornekler

| Ornek repo | Gozlenen guclu pratik |
| --- | --- |
| [OUA-zaten-Bootcamp-2023](https://github.com/burakcevheroglu/OUA-zaten-Bootcamp-2023) | Sprint bazli README, app screenshots, board screenshots, burndown, sprint review ve retrospective tek akista verilmis. |
| [GhostOfAnnaScrumExample](https://github.com/IbrmSerhat/GhostOfAnnaScrumExample) | Sprint puani, backlog mantigi, daily scrum linki, board screenshot ve urun durumu ayni Sprint basligi altinda toplanmis. |
| [planova](https://github.com/olgnbrn/planova) | `Project_Management_Files` yapisi, Sprint 1 app screenshots, app map, project management ve burndown bolumleri ayrilmis. |
| [U-21-Cherry-Chasers](https://github.com/kevsoOther/U-21-Cherry-Chasers/tree/main) | Sprint puan mantigi, daily scrum kanitlari, board screenshot, urun durumu ve review/retro net sekilde yazilmis. |
| [BootcampScrumTemplate](https://github.com/YapayZekaveTeknolojiAkademisi/BootcampScrumTemplate/tree/main) | Resmi sablon basliklari: backlog/story secimi, daily scrum, sprint board update, urun durumu, review ve retrospective. |

## SkinShelf Sprint 1 Eslesme Kontrolu

| Beklenen kanit | Orneklerdeki durum | SkinShelf durumu | Kanit |
| --- | --- | --- | --- |
| Takim ve urun bilgisi | README basinda yer aliyor | Var | `README.md` |
| Product backlog URL | Trello/Miro/Asana/Notion linki veriliyor | Var | `README.md`, Notion Product Backlog |
| Sprint notlari | Kararlar ve kapsam net yaziliyor | Var | `README.md`, `Project_Management_Files/Sprint_1/README.md` |
| Story point ve puan mantigi | Sprint hedefi ve tamamlanan puan belirtiliyor | Var | `Sprint_Board/sprint1-story-points.md` |
| Sprint board screenshot | Board son durumu gorselleniyor | Var | `Sprint_Board/sprint1-board-end.png` |
| Daily scrum kaniti | WhatsApp/Discord/Miro/Trello kanitlari ekleniyor | Var | `Daily_Scrum` |
| Burndown / completion chart | Grafik veya tablo ile ilerleme veriliyor | Var | `Burndown_Chart` |
| Urun durumu ekranlari | App/game screenshotlari README'de gorunuyor | Var ve guncel | `Product_Screenshots`, `assets/screenshots` |
| Review ve retrospective | Sprint sonunda ekip kararlari yaziliyor | Var | `Review_and_Retrospective` |
| Sistem/mimari akisi | Bazi orneklerde app map veya teknik not var | Var ve daha detayli | `System_Design`, `Code_Architecture.md` |
| Test/dogrulama | Orneklerde sinirli; bizde ayrica mevcut | Var | `Test_and_Verification.md` |
| Definition of Done | Orneklerde her zaman yok; bizde ayrica mevcut | Var | `Definition_of_Done.md` |

## Son Durum

SkinShelf Sprint 1 yapisi ornek repolardaki temel Scrum kanit basliklarini karsilar:

- Sprint 1 puanlari, backlog mantigi ve kalan isler ayrilmis durumda.
- Daily scrum, sprint board ve burndown kanitlari klasor bazinda tutuluyor.
- Urun durumu guncel Android emulator screenshotlariyla destekleniyor.
- Login, onboarding, rafli Dolabim, Product Detail, Rutinim, Haftalik Plan, Shelly ve Profil ekranlari README akisi icinde temsil ediliyor.
- Kod mimarisi `screens`, `navigation`, `context`, `services` ve `types` katmanlariyla ayrilmis; Sprint 2 backend/AI entegrasyonu icin servis sinirlari belirlenmis.

## Bilincli Olarak Sprint 2'ye Aktarilan Riskler

| Risk | Neden Sprint 2 | Alinan onlem |
| --- | --- | --- |
| Gercek backend/database | Sprint 1 hedefi mobil prototip ve kanitti | Servis katmani ve model tipleri hazirlandi |
| Gercek Gemini cevabi | Prompt, guvenlik ve JSON semasi backend ile netlesecek | AI ekranlari ve Shelly UX prototipi hazirlandi |
| Gercek kamera barkod okuyucu | Cihaz izinleri ve native test Sprint 2 kapsaminda | Open Beauty Facts servis plani ve demo barkod dogrulamasi var |
| Genis urun PNG katalogu | Uygulama acilisindan once ekip tarafindan buyutulecek | Cutout/fallback katalog mimarisi hazir |
