# Sistem Tasarimi

Sprint 2 sonunda proje, Sprint 1'deki frontend prototipinden fullstack mimariye gecti. Mobil katman ekran, context ve servis olarak ayrildi; backend katmani controller, service, repository ve entity/DTO olarak ayrildi.

## Mimari Diyagram

<img src="sprint2-fullstack-architecture.svg" width="900" alt="SkinShelf Sprint 2 fullstack architecture">

## Katmanlar

| Katman | Sorumluluk |
| --- | --- |
| Screens | Kullanici akisi, form ve ekran state'i |
| Context | Kullanici profili ve urun dolabi state yonetimi |
| Client services | Auth, product, assistant, skin analysis ve Open Beauty Facts istekleri |
| Controllers | HTTP sozlesmeleri ve request/response siniri |
| Services | Is kurallari, AI guardrail, enrichment ve rutin logic |
| Repositories | Supabase PostgreSQL uzerindeki kalici veri erisimi |
| AI services | Shelly sohbet, ingredient analizi, fotograf/cilt notu analizi |

## Sprint 2 Mimari Kararlari

- Supabase dogrudan mobil uygulamaya acilmadi; mobil istemci Spring Boot API uzerinden konusturuldu.
- Mobil tarafinda token yonetimi `authSession` ve ortak `apiFetch` uzerinden merkezilestirildi.
- Barkod verisi once Open Beauty Facts'ten alindi; eksik veri icin Gemini enrichment fallback'i eklendi.
- Shelly cevaplari sadece duz metin olarak degil, UI tarafinda kartlasabilecek yapili alanlarla tasarlandi.
- Rutin planlayici, kullanicinin dolabindaki aktif urunleri kaynak kabul edecek sekilde ayrildi.
- Cilt takibi ayri bir aggregate olarak modellendi; ileride gelisim grafigi ve haftalik ozet icin genisletilebilir hale getirildi.

## Mimari Karar Tablosu

| Karar | Gerekce | Risk kontrolu |
| --- | --- | --- |
| Mobil istemci Supabase'e dogrudan baglanmaz | Auth, veri sahipligi ve servis kurallari tek API sinirindan yonetilir | JWT, controller-service-repository ayrimi |
| Urun verisi icin Open Beauty Facts kullanilir | Barkodla urun adi, marka, kategori ve icerik verisi acik kaynaktan alinabilir | Veri eksikse manuel onay ve Gemini enrichment fallback'i |
| Urun gorselleri ayri katalogdan eslesir | Acik urun bilgisindeki gorsel kalitesi tutarsiz olabilir | Ekip tarafindan genisletilebilir cutout/PNG katalog, yoksa kategori temsili |
| Shelly cevaplari guardrail'den gecer | Cilt bakimi tibbi risk siniri tasir | Tani/tedavi iddiasi yok; ciddi reaksiyonda profesyonel destek yonlendirmesi |
| Rutin planlayici yalnizca aktif urunleri kullanir | Kullanici dolabinda olan ama kullanmadigi urunler rutini kirletmez | `isActive` alaninin backend ve mobil state ile senkron tutulmasi |
| Smoke API testi manuel kosulur | Canli Supabase uzerinde test verisi olusturur | CI yalnizca build ve backend testlerini otomatik kosar |

## Degerlendirilebilir Kod Yapisi

Kod, dis degerlendiricinin proje mimarisini hizli okuyabilmesi icin asagidaki sinirlara ayrilmistir:

| Soru | Bakilacak yer |
| --- | --- |
| Mobil ekranlar nerede? | `src/screens` |
| Uygulama state'i nerede? | `src/context` |
| Mobil API istekleri nerede? | `src/api`, `src/services` |
| Backend HTTP sozlesmeleri nerede? | `backend/src/main/java/com/skinshelf/backend/controller` |
| Is kurallari ve AI servisleri nerede? | `backend/src/main/java/com/skinshelf/backend/service` |
| Kalici veri modeli nerede? | `backend/src/main/java/com/skinshelf/backend/entity`, `backend/src/main/resources/db/migration` |
| Test profili nerede? | `backend/src/test/resources/application-test.properties` |

Bu ayrim, Sprint 2 kapsaminda UI prototipinden fullstack urune gecildigini ve kodun sonraki sprintte deploy/test genisletmesine hazir oldugunu gosterir.
