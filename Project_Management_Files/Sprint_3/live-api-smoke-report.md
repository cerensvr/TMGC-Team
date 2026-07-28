# Canlı API Smoke Test Raporu

Tarih: 28 Temmuz 2026

İlgili görevler: GitHub issue #5, #7 ve #8

## Ortam

- Backend: `https://skinshelf-backend.onrender.com`
- Veritabanı: SkinShelf Supabase, Frankfurt session pooler
- AI modeli: `gemini-3.6-flash`
- Kaynak branch: `main`
- Doğrulanan release commit'i: `30653d8`

Gerçek DB şifresi, JWT secret ve Gemini API anahtarı yalnızca Render secret
alanlarında tutuldu; bu rapora veya Git geçmişine eklenmedi.

## Sağlık Kontrolü

```text
GET https://skinshelf-backend.onrender.com/api/health
HTTP 200
status: ok
service: skinshelf-backend
```

Render başlangıç loglarında PostgreSQL 17.6 bağlantısı, Flyway V1-V6
migration doğrulaması ve Spring Boot'un `10000` portunda başlaması görüldü.

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
- Gemini destekli ingredient analysis
- Kişisel Shelly chat yanıtı ve chat geçmişi
- Skin log oluşturma, listeleme, haftalık özet ve silme
- Hesap silme ve silinen hesapla girişin reddedilmesi

Gemini çağrıları Render loglarında HTTP 200 döndü. Smoke betiği her çalıştırmada
benzersiz e-posta üretir ve oluşturduğu hesap, ürün ve skin log verilerini
temizler. Sonuç: **Passed (3/3 senaryo)**.
