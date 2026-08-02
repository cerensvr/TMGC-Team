# Issue #16 - Güvenlik ve Gizlilik Kontrolleri

## Amaç

Kişisel veri, JWT doğrulaması, hesap silme ve uygulama güvenliği ile ilgili davranışların doğrulanması.

| Test                                                       | Durum | Sonuç                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------- | :---: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JWT doğrulama ve kullanıcı izolasyonu                      |  ✅   | Postman ile JWT doğrulandı. Yetkisiz (`Authorization` header olmadan) yapılan `/api/auth/me` isteği **403 Forbidden** döndürdü. Kullanıcı yalnızca kendi verilerine erişebildi.                                                                                                                                                                      |
| CORS kontrolü                                              |  ✅   | API'nin güvenlik yapılandırması doğrulandı. Yetkisiz erişim denemelerinde istekler reddedildi ve yalnızca uygulamanın tanımlı erişim senaryoları desteklendi.                                                                                                                                                                                        |
| Rate Limit kontrolü                                        |  ✅   | `RateLimitFilter`; login/register ve Shelly chat için istemci + HTTP method + endpoint bazında dakikada 10, şifre değiştirme için 5, fotoğraf/ürün tanıma için 8 istek sınırı uygular. 11. aynı login isteğinin `429` dönmesi otomatik testle doğrulandı. |
| Hesap silme testi                                          |  ✅   | `DELETE /api/auth/me` endpointi test edildi. Hesap silindikten sonra aynı kullanıcı ile tekrar giriş yapılamadığı doğrulandı. İlişkili kullanıcı verileri de başarıyla silinmektedir.                                                                                                                                                                |
| Privacy Policy güncellemesi                                |  ✅   | Gizlilik politikası; AI kullanımı, fotoğraf işleme, veri saklama davranışı ve hesap silme sürecini açıklayacak şekilde güncellendi.                                                                                                                                                                                                                  |
| Terms of Use güncellemesi                                  |  ✅   | Yapay zekâ önerilerinin yalnızca bilgilendirme amaçlı olduğu ve tıbbi teşhis yerine geçmediği açıkça belirtildi.                                                                                                                                                                                                                                     |
| Data Deletion dokümanı                                     |  ✅   | Kullanıcının uygulama içerisinden hesabını ve ilişkili verilerini nasıl silebileceği dokümante edildi.                                                                                                                                                                                                                                               |
| Uygulama içinden belgelere erişim                          |  ✅   | Privacy Policy, Terms of Use ve Data Deletion sayfalarına uygulama içerisinden erişilebildiği doğrulandı.                                                                                                                                                                                                                                            |
| Production secret kontrolü                                 |  ✅   | JWT Secret, Gemini API Key ve diğer hassas bilgiler ortam değişkenlerinden okunur. `npm run security:secrets` takip edilen dosyaları her CI koşusunda yüksek güvenli token/private-key desenleri için tarar. |
| Loglarda token / parola / fotoğraf / kişisel veri kontrolü |  ✅   | Render production logları incelendi. Uygulama başlangıç logları ve API istekleri sırasında JWT token, parola, fotoğraf verisi veya kişisel kullanıcı bilgilerinin loglanmadığı doğrulandı. Loglarda yalnızca sistem ve uygulama çalışma kayıtları yer almaktadır.                                                                                    |

---

## Kabul Kriterleri

| Kabul Kriteri                                                       | Durum |
| ------------------------------------------------------------------- | :---: |
| Kullanıcı A, Kullanıcı B'nin verisine erişemez                      |  ✅   |
| Silinen hesap tekrar giriş yapamaz                                  |  ✅   |
| Gizlilik metni AI, fotoğraf ve veri saklama davranışıyla tutarlıdır |  ✅   |
| Production secret'ları repoda bulunmaz                              |  ✅   |
| Loglarda token, parola, fotoğraf veya kişisel veri bulunmaz         |  ✅   |

---

## Sonuç

Issue #16 kapsamında planlanan güvenlik ve gizlilik kontrolleri başarıyla tamamlanmıştır. JWT doğrulaması, kullanıcı izolasyonu, hesap silme süreci, gizlilik dokümantasyonu, production secret yönetimi ve log güvenliği doğrulanmıştır. Yapılan kontroller sonucunda uygulamanın hassas kullanıcı verilerini loglamadığı ve dokümantasyonun uygulamanın gerçek davranışıyla tutarlı olduğu doğrulanmıştır.

Rate limit sayaçları mevcut tek-instance Render topolojisine uygundur. Yatay
ölçeklemede ortak Redis/Bucket4j sayacı kullanılmalıdır; bu ölçekleme sınırı
mevcut korumanın yok olduğu anlamına gelmez.
