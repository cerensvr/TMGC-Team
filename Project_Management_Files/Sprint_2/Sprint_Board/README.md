# Sprint 2 Board ve Backlog Takibi

Sprint 2 backlog'u Notion board uzerinden takip edildi. Ornek bootcamp repolarinda Trello/Asana/Miro board ekran goruntuleri README icine gomuluyor; SkinShelf tarafinda board linki kok README'de ve bu klasorde referanslanir.

<img src="sprint2-board-summary.svg" width="900" alt="SkinShelf board summary">

## Notion Board Ekran Goruntuleri

Asagidaki gorseller 20 Temmuz 2026'da canli Notion Product Backlog sayfasindan alinmistir. GitHub tarafinda SVG ozetin yaninda gercek board ekran kaniti olarak tutulur.

| Board view | Full page capture |
| --- | --- |
| <img src="notion-board-live.png" width="420"> | <img src="notion-board-full.png" width="420"> |

## Board Kolon Mantigi

| Kolon | Anlam |
| --- | --- |
| Product Backlog | Sonraki sprintlere veya kapsam disina ayrilan fikirler |
| To Do | Sprint hedefi icine alinmis ama baslanmamis kartlar |
| Progress | Gelistirmesi devam eden teknik veya tasarim kartlari |
| Done | Kod, test ve dokumantasyon karsiligi tamamlanmis kartlar |

## Sprint 2 Kart Gruplari

| Grup | Ornek kartlar | Puan |
| --- | --- | ---: |
| Backend/API | Auth, profile, product CRUD, skin logs | 57 SP |
| Database | Supabase schema, Flyway migration, entity/repository duzeni | 18 SP |
| AI Agents | Shelly chat, ingredient analyzer, AI product enrichment | 41 SP |
| Mobile integration | Dolap/rutin senkronizasyonu, cilt takip ekranlari | 11 SP |
| Test/dokumantasyon | Build, backend test, kanit dosyalari | 3 SP |

Detayli puan dagilimi: [../sprint2-story-points.md](../sprint2-story-points.md)

## Notion Kart Ozellikleri Kontrol Listesi

Notion board icinde story point alani dogrudan incelendiginde asagidaki property'ler kartlarda acik gorunmelidir. GitHub tarafinda puan dagilimi kalici olarak [../sprint2-story-points.md](../sprint2-story-points.md) dosyasinda tutulur; Notion tarafinda ise ayni mantigin kart property'leriyle gorunmesi beklenir.

| Property | Beklenen kullanim |
| --- | --- |
| `Status` | Product Backlog, To Do, Progress, Done |
| `Sprint` | Sprint 1, Sprint 2, Sprint 3 |
| `Point` | Fibonacci benzeri story point degeri |
| `Assignee` | Karttan sorumlu ekip uyesi |
| `Priority` | Kritik, Yuksek, Orta, Dusuk |
| `Evidence` | GitHub dosyasi, screenshot veya test sonucu linki |

Canli ekran goruntusu alinirken en az bir board gorunumunde kolonlar, kart adlari ve point/property alani okunabilir olmalidir. Close-up bir kart ekraninda `Point`, `Status`, `Sprint` ve `Assignee` alanlarinin ayni anda gorunmesi puan kirilma riskini azaltir.

## Kanit Notu

Daily scrum ve board ekran goruntuleri takim tarafindan Notion/Imgur uzerinden saklanir. GitHub tarafinda bu klasor, board'un hangi kolon/kart mantigiyla kullanildigini, puanlarin nasil dagitildigini ve canli Notion gorunumunun nasil takip edildigini aciklayan kalici teslim kanitidir.
