# Secret Tarama Politikası

`npm run security:secrets`, Git tarafından takip edilen veya eklenmek üzere
bekleyen, ignore edilmemiş metin dosyalarında
private key blokları ile Google, GitHub, OpenAI ve Slack için yüksek güvenli
token desenlerini arar. Bulgu olduğunda komut hata koduyla kapanır ve CI push'u
başarılı kabul etmez.

Tarayıcı yalnız yüksek güvenli desenleri kullanır; örnek ortam değişkeni adları
ve sahte test secret'ları bu nedenle false-positive üretmez. Düşük entropili
parolaları güvenilir biçimde ayırt edemediği için aşağıdaki süreçler ayrıca
korunur:

- Gerçek `.env` ve `application.properties` dosyaları Git dışında tutulur.
- GitHub, Render, Supabase ve EAS değerleri ilgili secret store üzerinden verilir.
- Şüpheli bir değer terminal veya log çıktısında görülürse yalnız dosyayı
  silmek yeterli sayılmaz; sağlayıcı tarafında anahtar döndürülür.
- Public Android release öncesinde imza sertifikası ve artifact SHA-256 kaydı
  yeniden doğrulanır.
