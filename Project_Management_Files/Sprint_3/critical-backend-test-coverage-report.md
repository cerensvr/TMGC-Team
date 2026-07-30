# Kritik Backend Servisleri Test Kapsamı Raporu

Tarih: 29 Temmuz 2026

İlgili görev: GitHub issue #17

## Amaç

Tek context testinin (`BackendApplicationTests`) ötesine geçerek kritik iş
kurallarında regresyon koruması oluşturmak.

## Mevcut Durum Analizi

Çalışmaya başlamadan önce issue kapsamındaki 7 modül mevcut test dosyalarıyla
eşleştirildi:

| Modül | Durum (öncesi) |
|---|---|
| Auth register/login + hatalı yetkilendirme | ❌ Kapsam yok |
| Kullanıcı izolasyonlu ürün CRUD | ✅ `ProductServicePersistenceTest` |
| Profil get/update | ❌ Kapsam yok |
| Assistant fallback + safety guard | ✅ `AssistantServiceQualityTest` |
| Skin log CRUD + haftalık özet | ❌ Kapsam yok |
| Hesap silme cascade | ❌ Kapsam yok |
| Migration/context testi | ✅ `BackendApplicationTests`, `RuntimeConfigurationTest` |

4 modülde hiç test kapsamı yoktu; bu çalışma o 4 modülü kapatmaya odaklandı.

## Eklenen Testler

**`UserServiceAuthTest`** (6 test)
- Yeni kullanıcı kaydı ve bcrypt ile şifre hashleme
- Aynı e-posta ile tekrar kayıt reddi
- Doğru bilgilerle giriş başarısı
- Yanlış şifre ve tanınmayan e-posta ile giriş reddi
- Hesap silme: ürün, profil, cilt kaydı ve asistan mesajlarının cascade
  silinmesi + silinen hesapla tekrar giriş denemesinin reddi

**`UserProfileServiceTest`** (4 test)
- Profil hiç yoksa otomatik boş profil oluşturma
- Yeni profil kaydında alan önceliği kuralları (örn. `displayName` >
  `nickname`, `skinType` > `skinTypeGuess`)
- Kısmi güncellemede daha önce girilmiş alanların korunması
- Profili olmayan kullanıcı için `getProfileByUserId` hata fırlatması

**`SkinAnalysisServiceCrudTest`** (5 test)
- Analiz sonrası kayıt persistence'ı ve fotoğrafın hiçbir koşulda
  saklanmaması (gizlilik garantisi)
- Log listesinin yalnızca isteği yapan kullanıcıya ait kayıtları döndürmesi
- Silme isteğinin başka kullanıcının kaydını etkilememesi + kendi kaydını
  sildikten sonra boş duruma dönmesi
- Haftalık özetin kayıt yokken ve kayıt varken doğru durum mesajı üretmesi

## Sonuç

```text
./mvnw test
Tests run: 43, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

Tüm testler `test` Spring profiliyle izole H2 veritabanına karşı çalışır.
Gemini API anahtarı test profilinde boş bırakıldığından analiz akışları
otomatik olarak fallback yoluna düşer; testler production veritabanına veya
Gemini API'sine hiçbir koşulda bağlanmaz.