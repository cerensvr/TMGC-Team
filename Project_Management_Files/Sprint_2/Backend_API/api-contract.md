# API Contract Ozeti

Bu dosya Sprint 2 sonunda mobil ve backend arasinda netlesen ana sozlesmeleri ozetler.

## Auth

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | `email`, `password`, `firstName`, `lastName` | `token`, `user` |
| POST | `/api/auth/login` | `email`, `password` | `token`, `user` |
| GET | `/api/auth/me` | Bearer token | `UserResponse` |
| DELETE | `/api/auth/me` | Bearer token | `204 No Content` |

## Products

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/api/products` | Bearer token | `ProductResponse[]` |
| POST | `/api/products` | `ProductRequest` | `ProductResponse` |
| PUT | `/api/products/{productId}` | `ProductRequest` | `ProductResponse` |
| DELETE | `/api/products/{productId}` | Bearer token | `204 No Content` |

`ProductRequest` icinde Sprint 2 icin kritik alanlar: `activeIngredients`, `cutoutImageUrl`, `isActive`, `is_active`, `timeOfDay`.

## Assistant

| Method | Path | Amac |
| --- | --- | --- |
| POST | `/api/assistant/chat` | Shelly'nin kullanici mesaji, profil ve dolap baglamiyla cevap uretmesi |
| GET | `/api/assistant/history` | Son konusmalarin mobil arayuze yuklenmesi |
| DELETE | `/api/assistant/history` | Yeni sohbet baslatirken kalici Shelly hafizasini temizleme |
| POST | `/api/assistant/analyze-ingredients` | Icerik listesi icin risk ve kullanim yorumu |

## Skin Tracking

| Method | Path | Amac |
| --- | --- | --- |
| POST | `/api/skin-logs/analyze` | Fotograf/not formunu analiz edip kaydetme |
| GET | `/api/skin-logs` | Cilt takip gecmisini listeleme |
| GET | `/api/skin-logs/summary/weekly` | Haftalik cilt ozeti uretme |
| DELETE | `/api/skin-logs/{logId}` | Kayit silme |
