# Sprint 3 Review ve Retrospective

## Sprint Review

Sprint 3 hedefi, SkinShelf'i full-stack prototipten kurulabilir, test edilmiş
ve final demoda uçtan uca gösterilebilir bir mobil ürüne taşımaktı. Sprint
sonunda 102/102 SP tamamlandı ve Sprint 4'e PBI devredilmedi.

### Tamamlanan Ürün Artımı

- Render üzerindeki Spring Boot API, Supabase PostgreSQL ve Flyway migration
  akışı doğrulandı.
- Auth, onboarding, profil, kalıcı ürün dolabı, barkod ve manuel ürün ekleme
  akışları tamamlandı.
- Shelly; profil, dolap, içerik bilgi tabanı ve sohbet hafızasını birlikte
  kullanan yapılandırılmış cevap akışına taşındı.
- Haftalık rutin, güçlü aktifleri üretken modelden bağımsız ayıran
  deterministik politika katmanıyla güçlendirildi.
- Cilt fotoğraf analizi, geçmiş, haftalık özet, rutin bildirimleri ve
  ürün bitiş hatırlatmaları tamamlandı.
- Loading, error, empty state, erişilebilirlik, oturum güvenliği, yasal
  metinler ve veri silme davranışları gözden geçirildi.
- Preview APK temiz kurulumda ve POCO X6 Pro gerçek cihazda ana akışlarla
  test edildi.
- 10 katılımcılı anonim kullanıcı pilotu, final ekran seti ve demo videosu
  tamamlandı.

### Kabul Sonuçları

| Kontrol | Sonuç |
| --- | ---: |
| Sprint hedefi | 102 SP |
| Tamamlanan | 102 SP |
| Kalan | 0 SP |
| Shelly golden set | 100/100 |
| Backend otomatik test | 63/63 |
| Mobil servis/regresyon testi | 19/19 |
| Full-stack smoke profili | 4/4 |
| Production dependency açığı | 0 |
| Gerçek cihaz ana akışı | Geçti |

### Review Katılımcıları

- Tuba Köten
- Gizem İlayda Koz
- Ceren Sivri

## Sprint Retrospective

### İyi Gidenler

- Issue'ların P0/P1 ve story point ile açılması, final haftasındaki iş
  sırasını netleştirdi.
- Mobil, backend, veritabanı ve AI katmanları için ayrı kabul kanıtları
  oluşturulması hata kaynağını bulmayı kolaylaştırdı.
- Shelly'nin açıklanabilir cevap, güvenlik guard'ları ve deterministik rutin
  politikasıyla birlikte ele alınması AI özelliğini ürün değerine bağladı.
- Gerçek cihaz testi ve anonim kullanıcı pilotu, yalnızca teknik olarak
  çalışan değil kullanılabilir bir ürün kanıtı sağladı.

### Zorlayanlar

- Render free tier bellek/uyanma davranışı ve Gemini kota/geçici servis
  hataları fallback ve retry ihtiyacı doğurdu.
- Open Beauty Facts her üründe eksiksiz görsel ve içerik sağlamadığı için
  katalog + AI zenginleştirme + manuel ekleme zinciri gerekti.
- Android build ve imzalama materyaliyle çalışmak, log ve secret hijyeninin
  release sırasında da korunması gerektiğini gösterdi.
- Teknik ilerleme hızlıyken Scrum kanıtlarının sprint sonuna kalması,
  kapanış paketinde ek dokümantasyon eforu oluşturdu.

### Alınan Aksiyonlar

- Rutin güvenlik kuralları prompttan ayrı bir policy engine'e taşındı.
- CI; dependency audit, TypeScript, mobil test, backend test, Shelly eval ve
  izole full-stack smoke olarak genişletildi.
- Sprint kanıtları board, daily, burndown, ürün durumu ve review başlıklarıyla
  ayrı dosyalara bölündü.
- Public store dağıtımından önce imzalama anahtarı rotasyonu ayrı bir
  operasyon adımı olarak korunacak; bootcamp teslimi test edilmiş preview
  APK ve build kaydıyla yapıldı.

### Bootcamp Sonrası Ürün Yol Haritası

- Ürün görsel kataloğunu marka doğrulaması ve lisans metadatasıyla
  genişletmek.
- Shelly eval setine anonim gerçek kullanıcı sorularından yeni varyasyonlar
  eklemek.
- Bildirim/rutin tamamlama metriğini izinli ve anonim analitikle ölçmek.
- Mağaza dağıtımı için yeni Android signing key ve store listing paketini
  hazırlamak.
