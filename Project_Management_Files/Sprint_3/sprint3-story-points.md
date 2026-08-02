# Sprint 3 Story Point Dağılımı

Sprint 3, 20 Temmuz - 2 Ağustos 2026 arasındaki final ürünleştirme ve
teslim dönemidir. Puanlar, GitHub issue başlıklarında bulunan tahminlerden
alınmıştır; durumlar 2 Ağustos 2026 kapanış kontrolüne aittir.

## Puan Özeti

| Durum | Puan | Açıklama |
| --- | ---: | --- |
| Sprint hedefi | 102 SP | Sprint 3'e alınan #5-#22 issue'ları |
| Tamamlanan | 102 SP | #5-#22 kabul kapsamı tamamlandı |
| Kalan | 0 SP | Sprint 4'e devreden PBI yok |
| Tamamlanma oranı | %100 | Kod, test, cihaz, video ve kapanış teslimleri tamamlandı |

Son 13 SP; Sprint 3 kanıt paketi, [demo videosu](https://youtu.be/HhQa0vlM9QA)
ve final release kabulüyle 2 Ağustos kapanışında tamamlandı.

## Issue Bazlı Backlog

| Issue | Product Backlog Item | SP | Sorumlu | Durum | Kanıt |
| --- | --- | ---: | --- | --- | --- |
| [#5](https://github.com/cerensvr/TMGC-Team/issues/5) | Render backend ve health endpoint | 5 | Ceren Sivri | Done | [Canlı API raporu](live-api-smoke-report.md) |
| [#6](https://github.com/cerensvr/TMGC-Team/issues/6) | Supabase ve tekrarlanabilir backend test profili | 8 | Ceren Sivri | Done | [Backend test profili](backend-test-profile-report.md) |
| [#7](https://github.com/cerensvr/TMGC-Team/issues/7) | Production environment ve secret sözleşmesi | 3 | Ceren Sivri | Done | [Deployment notları](Deployment_Notes.md) |
| [#8](https://github.com/cerensvr/TMGC-Team/issues/8) | Kritik endpointler için canlı smoke testi | 5 | Ceren Sivri | Done | [Canlı API raporu](live-api-smoke-report.md) |
| [#9](https://github.com/cerensvr/TMGC-Team/issues/9) | Auth, onboarding, session ve hesap silme | 5 | Tuba Köten | Done | [RC test raporu](RELEASE-CANDIDATE-TEST.md) |
| [#10](https://github.com/cerensvr/TMGC-Team/issues/10) | Ürün CRUD, barkod ve manuel ekleme | 8 | Ceren Sivri | Done | [CRUD doğrulama](product-crud-verification.md) |
| [#11](https://github.com/cerensvr/TMGC-Team/issues/11) | Shelly, içerik analizi, hafıza ve fallback | 8 | Gizem İlayda Koz | Done | [Shelly doğrulama](SHELLY-AI-VALIDATION.md) |
| [#12](https://github.com/cerensvr/TMGC-Team/issues/12) | Kişiselleştirilmiş rutin ve aktif uyumu | 5 | Tuba Köten | Done | [Shelly kalite raporu](shelly-quality-verification.md) |
| [#13](https://github.com/cerensvr/TMGC-Team/issues/13) | Cilt fotoğrafı, geçmiş ve haftalık özet | 8 | Tuba Köten | Done | [RC test raporu](RELEASE-CANDIDATE-TEST.md) |
| [#14](https://github.com/cerensvr/TMGC-Team/issues/14) | Rutin ve ürün bitiş bildirimleri | 8 | Tuba Köten | Done | [Ürün ekranları](Product_Screenshots/README.md) |
| [#15](https://github.com/cerensvr/TMGC-Team/issues/15) | Loading, error, empty state ve erişilebilirlik | 5 | Gizem İlayda Koz | Done | [RC test raporu](RELEASE-CANDIDATE-TEST.md) |
| [#16](https://github.com/cerensvr/TMGC-Team/issues/16) | Güvenlik, gizlilik ve veri silme denetimi | 5 | Gizem İlayda Koz | Done | [Güvenlik raporu](Security-and-Privacy-Validation.md) |
| [#17](https://github.com/cerensvr/TMGC-Team/issues/17) | Kritik backend otomatik test kapsamı | 8 | Tuba Köten | Done | [Test kapsam raporu](critical-backend-test-coverage-report.md) |
| [#18](https://github.com/cerensvr/TMGC-Team/issues/18) | Emülatör ve gerçek cihaz regression testi | 5 | Gizem İlayda Koz | Done | [POCO X6 Pro testi](RELEASE-CANDIDATE-TEST.md) |
| [#19](https://github.com/cerensvr/TMGC-Team/issues/19) | EAS preview APK ve temiz kurulum | 3 | Ceren Sivri | Done | [APK doğrulama](android-preview-apk-verification.md) |
| [#20](https://github.com/cerensvr/TMGC-Team/issues/20) | Sprint 3 Scrum ve teknik teslim belgeleri | 5 | Gizem İlayda Koz | Done | [Sprint 3 indeksi](README.md) |
| [#21](https://github.com/cerensvr/TMGC-Team/issues/21) | Final ekranları, demo senaryosu ve video | 5 | Gizem İlayda Koz | Done | [Demo ve cihaz kanıtı](demo-and-device-evidence.md) |
| [#22](https://github.com/cerensvr/TMGC-Team/issues/22) | Final release kabulü ve teslim dondurma | 3 | Ceren Sivri | Done | [Final hazırlık](Final_Readiness.md) |

## Puan Tamamlama Mantığı

- Story point, harcanan saat değil işin belirsizliği, teknik riski ve kabul
  kapsamını birlikte ifade eder.
- `Done` yalnızca kodu yazılan değil, issue'su kapanan ve kanıtı repoya
  eklenen işler için kullanılır.
- Video ve release freeze, kod tarafından otomatik tamamlanamayacağı için
  ayrı PBI olarak tutulur.
- Burndown tablosu bu dosyadaki 102 SP hedefi ve GitHub issue kapanış
  tarihleriyle aynı veri setini kullanır.
