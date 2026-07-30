# Issue #11 - Shelly AI Validation Report

## Amaç

Shelly AI Asistanının gerçek kullanıcı profili, dijital dolap ve cilt geçmişi bağlamını doğru kullanarak güvenli, anlaşılır ve kesintilere dayanıklı yanıtlar verdiğinin doğrulanması.

---

## Test Ortamı

| Bilgi           | Değer                 |
| --------------- | --------------------- |
| Cihaz           | POCO X6 Pro           |
| İşletim Sistemi | Android               |
| Uygulama        | SkinShelf             |
| Backend         | Spring Boot (Render)  |
| Veritabanı      | Supabase PostgreSQL   |
| AI Model        | Gemini Flash (Latest) |
| Test Tarihi     | 30.07.2026            |

---

## Fonksiyonel Testler

| Test                          | Durum | Sonuç                                                                                                                               |
| ----------------------------- | :---: | ----------------------------------------------------------------------------------------------------------------------------------- |
| Profil, ürün ve rutin bağlamı |  ✅   | Shelly, kullanıcının cilt profili, dijital dolabı ve rutin bilgilerini kullanarak bağlama uygun kişiselleştirilmiş yanıtlar üretti. |
| Farklı cilt profilleri        |  ✅   | Yağlı, kuru ve hassas olmak üzere üç farklı profil ile yapılan testlerde profil bilgilerine uygun farklı öneriler üretildi.         |
| Mesaj geçmişi izolasyonu      |  ✅   | Sohbet geçmişi kullanıcı bazında saklandı. Başka kullanıcıların mesajlarına erişilemedi.                                            |
| Ingredient Analysis           |  ✅   | Ürün içerik analizi anlaşılır kartlar ve açıklamalar ile kullanıcı arayüzünde doğru şekilde gösterildi.                             |
| Gemini Fallback               |  ✅   | Ağ/API hatası durumunda uygulama çökmeden güvenli fallback mesajı gösterildi.                                                       |
| Safety Guard                  |  ✅   | Yapay zekâ tanı veya tedavi iddiasında bulunmadı; riskli durumlarda dermatoloğa başvurulmasını önerdi.                              |
| Loading Durumu                |  ✅   | Yapay zekâ cevap üretirken yüklenme göstergesi doğru şekilde görüntülendi.                                                          |
| Retry Mekanizması             |  ✅   | Bağlantı problemi sonrasında tekrar deneme (retry) akışı başarıyla çalıştı.                                                         |
| Boş Sohbet Geçmişi            |  ✅   | Yeni kullanıcıda boş sohbet ekranı doğru şekilde gösterildi.                                                                        |

---

## Kabul Kriterleri

| Kabul Kriteri                                        | Durum |
| ---------------------------------------------------- | :---: |
| Üç farklı cilt profiliyle bağlama uygun cevap alınır |  ✅   |
| Başka kullanıcının mesajlarına erişilemez            |  ✅   |
| Gemini kapalıyken uygulama çökmez                    |  ✅   |
| Yanıtta tanı veya tedavi iddiası yer almaz           |  ✅   |

---

## Sonuç

Shelly AI Asistanı; kullanıcı profili, dijital dolap, rutin bilgileri ve cilt geçmişini birlikte değerlendirerek bağlama uygun kişiselleştirilmiş öneriler üretmektedir. Ağ veya yapay zekâ servisinde oluşabilecek kesintilerde güvenli fallback mekanizması devreye girmekte, uygulama kararlılığını korumaktadır. Yapılan testlerde kabul kriterlerinin tamamı başarıyla karşılanmıştır.

---

## Test Kanıtları

Bu issue kapsamında alınan tüm ekran görüntüleri aşağıdaki klasörde bulunmaktadır.

```text
Sprint_3/test-images/
```
