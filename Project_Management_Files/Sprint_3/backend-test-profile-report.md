# Backend Test Profili Doğrulama Raporu

Tarih: 28 Temmuz 2026

İlgili görev: GitHub issue #6

## Sorun

`./mvnw test` komutu varsayılan uygulama ayarlarını kullanıyor ve erişilemeyen
canlı Supabase tenant'ına bağlanmaya çalışıyordu. Bu nedenle temiz veya yetkisiz
bir geliştirme ortamında Spring context testi başlatılamıyordu.

## Çözüm

- Test kapsamına yalnızca testlerde kullanılan H2 veritabanı eklendi.
- `test` Spring profili, test classpath'inden otomatik etkinleştirildi.
- Test veritabanı PostgreSQL uyumluluk modunda ve bellek içinde çalıştırıldı.
- Flyway migration'ları test profilinde etkin tutuldu.
- Eksik `user_products.is_active` alanı V6 migration'ı ile şemaya eklendi.
- Hibernate `validate` modu korunarak entity ve migration uyumu doğrulandı.

## Sonuç

```text
./mvnw test
Tests run: 43, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

Flyway V1-V6 migration'larının tamamı izole H2 veritabanına uygulandı. Test
profili herhangi bir production veritabanı bağlantısı veya gerçek secret
gerektirmiyor ve production verisine yazmıyor.

## Production sınırı

Production bağlantısı Render'daki güncel `DB_URL`, `DB_USERNAME` ve
`DB_PASSWORD` secret'larıyla doğrulandı. Canlı servis Supabase PostgreSQL 17.6
üzerinde Flyway migration'larını tamamladı ve uçtan uca smoke testi geçti.
Detaylar [live-api-smoke-report.md](live-api-smoke-report.md) dosyasındadır.
Bu değerler test profilinde veya Git'te tutulmaz.

Son tekrar doğrulama 30 Temmuz 2026 tarihinde `b9c04ad` commit'i üzerinde
yapıldı. Render instance'ı güncel production secret'larıyla başladı; yerel test
profili ise yalnızca izole H2 veritabanını kullandı.
