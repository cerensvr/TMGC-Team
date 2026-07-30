# Canlı API Smoke Test Raporu

Son doğrulama: 30 Temmuz 2026

İlgili görevler: GitHub issue #5, #7 ve #8

## Ortam

- Backend: `https://skinshelf-backend.onrender.com`
- Veritabanı: SkinShelf Supabase, Frankfurt session pooler
- AI modelleri: ana `gemini-3.6-flash`, ücretsiz yedek
  `gemini-3.5-flash-lite`
- Kaynak branch: `main`
- Doğrulanan release commit'i: `b9c04ad`
- Render deploy: `dep-d9lls0navr4c739bi4cg`

Gerçek DB şifresi, JWT secret ve Gemini API anahtarı yalnızca Render secret
alanlarında tutuldu; bu rapora veya Git geçmişine eklenmedi.

## Sağlık Kontrolü

```text
GET https://skinshelf-backend.onrender.com/api/health
HTTP 200
status: ok
service: skinshelf-backend
```

Render başlangıç loglarında PostgreSQL 17.6 bağlantısı, yedi Flyway
migration'ının doğrulanması ve Spring Boot'un `10000` portunda başlaması
görüldü.

Önceki instance'ın 512 MB Render sınırını aşmasının ardından JVM bellek
sınırları `-Xmx192m`, 96 MB metaspace, 32 MB code cache ve 32 MB direct memory
olarak sabitlendi. Hikari havuzu iki bağlantıyla sınırlandı. Güncel instance
`4xf5s` bu ayarlarla 64.993 saniyede başladı ve deploy `Live` oldu. Smoke testi
sonrasında art arda üç sağlık isteği de HTTP 200 ve `status: ok` döndürdü.

## Smoke Komutu

```bash
API_BASE_URL=https://skinshelf-backend.onrender.com/api npm run smoke:api
```

## Kapsam ve Sonuç

Üç farklı kişisel cilt profili (kuru/hassas, yağlı/akne eğilimli ve karma)
üzerinde aşağıdaki akışların tamamı geçti:

- Health
- Register ve tekrar login
- Kullanıcı bilgisi
- Profil oluşturma, güncelleme ve okuma
- Ürün oluşturma, listeleme, güncelleme ve silme
- Yerel bilgi tabanı destekli ingredient analysis
- Kişisel Shelly chat yanıtı ve chat geçmişi
- Skin log oluşturma, listeleme, haftalık özet ve silme
- Hesap silme ve silinen hesapla girişin reddedilmesi

Shelly her profilde güncellenmiş kullanıcı adını kullandı ve beklenen modları
döndürdü: kuru/hassas profilde `SKIN_REACTION`, yağlı/akne eğilimli profilde
`INGREDIENT_ANALYSIS`, karma profilde `ROUTINE_CHECK`.

Smoke betiği her çalıştırmada benzersiz e-posta üretir ve oluşturduğu hesap,
ürün ve skin log verilerini temizler. Sonuç: **Passed (3/3 senaryo)**.

30 Temmuz tekrarında oluşturulan üç sentetik hesap, ürün ve skin log kayıtları
başarıyla silindi. Aynı release için `npm run build`, Expo Doctor 18/18 ve
backend testleri 43/43 geçti.
