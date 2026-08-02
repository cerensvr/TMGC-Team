# Sprint 3 Daily Scrum Kaydı

Sprint 3 koordinasyonu ekip mesajlaşmaları, sesli görüşmeler, GitHub
issue'ları ve commitler üzerinden yürütüldü. Kişisel yazışmaları public
repoya taşımadan, aşağıdaki asenkron daily kaydı GitHub'da doğrulanabilen
geliştirme faaliyetlerinden oluşturuldu.

## Çalışma Biçimi

- Kısa durum paylaşımları ekip mesajlaşmasında yapıldı.
- Uzun teknik kararlar issue, commit ve raporlara aktarıldı.
- Blocker'lar ilgili issue kabul kriterine veya doğrulama raporuna yazıldı.
- Aşağıdaki tablo toplantı ekranı taklidi değil, repository activity
  üzerinden izlenebilir sprint günlüğüdür.

## Tarihli Daily Özeti

| Tarih | Tamamlanan / Gözlenen | Sonraki Odak | Blocker / Karar |
| --- | --- | --- | --- |
| 20 Temmuz | İçerik bilgi tabanı genişletildi; bağlamsal kural seçimi, RAG benzeri filtre ve aktif cilt derdi hafızası eklendi. | Shelly cevabını yapılandırmak ve backend sözleşmesini sabitlemek. | Tüm bilgi tabanını her prompta taşımama kararı alındı. |
| 21 Temmuz | Gemini `responseSchema` ile Shelly cevabı API seviyesinde yapılandırıldı. | Full-stack entegrasyon ve kalıcı veri kabulü. | Serbest metin yerine parse edilebilir JSON sözleşmesi kullanıldı. |
| 22-27 Temmuz | Public repoda yeni artifact bulunmuyor. Ekip iletişim kanıtları repo dışında tutuldu. | Açık P0 entegrasyon issue'ları. | Doğrulanamayan toplantı ayrıntısı eklenmedi. |
| 28 Temmuz | Supabase test izolasyonu, production environment sözleşmesi, kalıcı dolap, canlı API smoke, Shelly kalite ve Android preview akışları tamamlandı. | Cihaz kabulü, kritik backend testleri ve bildirimler. | Render port/bellek ve Gemini kota riskleri için fallback/doğrulama raporları kullanıldı. |
| 29 Temmuz | Auth/profile/skin-log testleri, cilt takibi, rutin hedef seçimi, logout navigation, bildirim entegrasyonu ve cihaz kanıtı tamamlandı. | Release candidate ve güvenlik kontrolü. | Veritabanı SSL değişikliği geri alındı; çalışan production sözleşmesi korundu. |
| 30 Temmuz | Loading/error/empty state geçişi, gizlilik, release candidate testi, Shelly validasyonu ve production deploy kanıtı tamamlandı. | Kullanıcı kanıtı, oturum güvenliği ve Android release sertleştirme. | P0/P1 hata bulunmadı; final kanıtların tek indekste toplanması kararlaştırıldı. |
| 31 Temmuz | Bildirim metinleri, Shelly açıklanabilirliği, anonim kullanıcı pilotu, SecureStore oturumu, vision safety, CI, yasal metinler, izinler, ürün fotoğraf tanıma ve raf UI tamamlandı. | Son marka/UI düzeltmeleri ve teslim paketi. | Android imzalama materyali için anahtar rotasyonu release blokeri olarak kaydedildi. |
| 1 Ağustos | Shelly ikon sistemi ile onboarding, sohbet geçmişi ve SKT deneyimi güncellendi. | Sprint 3 Scrum kanıtları ve final video. | Yeni özellik yerine release kalitesi ve kanıt kapsamına odaklanıldı. |
| 2 Ağustos | Deterministik rutin politikası, 100 yönlendirme + 12 yanıt kalitesi senaryosu, 19 mobil test, 67 backend test, kapsam/contract/secret kapıları ve 4 profilli smoke tamamlandı. | Teslim paketini arşivlemek ve kapsamı dondurmak. | Açık PBI kalmadı; Sprint 3 toplam 102/102 SP ile kapatıldı. |

## Sprint Boyunca Alınan Ana Kararlar

| Konu | Karar |
| --- | --- |
| Rutin güvenliği | Güçlü aktiflerin zamanlaması yalnızca üretken model cevabına bırakılmadı; deterministik politika katmanı eklendi. |
| Shelly bağlamı | Cevaplar cilt profili, aktif dolap, bilgi tabanı ve son mesajlarla sınırlandırıldı. |
| Veri ve gizlilik | Secret'lar Git dışında, oturum native ortamda SecureStore'da, cilt görselleri kalıcı depolama dışında tutuldu. |
| Test stratejisi | Unit/service testlerine ek olarak H2 + Flyway ile izole full-stack smoke akışı CI'a eklendi. |
| Release | Yeni özellik ekleme yerine cihaz testi, güvenlik, deploy ve kanıt tamamlama önceliklendirildi. |

## İzlenebilirlik

- [Sprint 3 GitHub issue'ları](https://github.com/cerensvr/TMGC-Team/issues?q=is%3Aissue)
- [Story point dağılımı](../sprint3-story-points.md)
- [Burndown](../Burndown_Chart/README.md)
- [Review ve retrospective](../Review_and_Retrospective/README.md)
