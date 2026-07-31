# SkinShelf 10 Günlük Anonim Kullanıcı Pilotu

Bu çalışma, SkinShelf prototipinin gerçek kullanım akışındaki anlaşılabilirliğini,
rutin devamlılığını ve Shelly'nin ürün rafıyla kurduğu bağın kullanım biçimini
değerlendirmek için yürütülen 10 günlük anonim kullanıcı pilotunu özetler.

> **Veri ve mahremiyet notu:** Bu sayfa ekip tarafından anonimleştirilmiş
> katılımcı kayıtlarından hazırlanan toplu sonuçları içerir. Katılımcı adları,
> e-postaları, yüz görüntüleri, konuşma metinleri ve kimliği açığa çıkarabilecek
> ham kayıtlar kamuya açık depoda yayımlanmamıştır. Çalışma bir kullanılabilirlik
> pilotudur; klinik etki, teşhis veya tedavi sonucu iddiası taşımaz.

## Çalışma Özeti

| Ölçüt | Sonuç |
| --- | ---: |
| Anonim katılımcı | 10 |
| Gözlem süresi | 10 gün |
| Aktif kullanıcı-günü | 91 |
| Rafa eklenen ürün | 55 |
| Tamamlanan / planlanan rutin | 137 / 182 |
| Rutin tamamlama oranı | %75,3 |
| İlk kişisel rutine ulaşma süresi | Ortanca 3:05 |
| G10 aktif kullanıcı | 8 / 10 (%80) |
| Shelly mesajı | 75 |
| Cilt günlüğü kaydı | 35 |
| Açılan / gönderilen bildirim | 79 / 115 (%68,7) |

## İzlenen Akışlar

1. Cilt profilinin ve kişisel hedefin tamamlanması
2. Ürünün barkodla veya manuel fallback ile rafa eklenmesi
3. Ürün detayının, kategorisinin ve rutin durumunun kontrol edilmesi
4. Günlük sabah/akşam rutininin görüntülenmesi ve tamamlanması
5. Shelly ile rutin, ürün ve içerik bağlamında etkileşim kurulması
6. Cilt günlüğüne anonim öz bildirim kaydı eklenmesi
7. Bildirim tercihi bulunan katılımcılarda gönderim ve açılma davranışı

## Başlıca Bulgular

- Planlanan 182 rutinin 137'si tamamlandı. Küçük örneklem nedeniyle bu oran
  klinik veya genellenebilir davranış sonucu olarak yorumlanmamalıdır.
- Katılımcıların ilk kişisel rutine ulaşma süresi ortanca 3 dakika 5 saniyeydi;
  bu değer pilot için belirlenen 4 dakikalık hedefin altındadır.
- Sekiz katılımcı onuncu günde aktif kaldı. Erken ayrılan iki katılımcı sonuçtan
  çıkarılmadı ve devamlılık hesabında korundu.
- Shelly etkileşimleri yalnızca genel sohbetten oluşmadı; rutin kontrolü, ürün
  analizi, içerik analizi, cilt tepkisi ve haftalık plan ihtiyaçlarına dağıldı.
- En sık sürtünme üç katılımcıda görülen barkod bulunamadı durumuydu. Manuel
  ekleme akışının aynı ekranda erişilebilir olması ürün kaydının devamını sağladı.

## Bulgudan Ürün Kararına

| Gözlenen sürtünme | Adet | Ürün kararı | Kod karşılığı |
| --- | ---: | --- | --- |
| Barkod bulunamadı, manuel eklemeye geçildi | 3 | Alanları kaybetmeden manuel ekleme seçeneğini aynı akışta tut | [`ScannerScreen.tsx`](../../src/screens/ScannerScreen.tsx) |
| Haftalık planda geri dönüş arandı | 2 | Modal kapatma ve Android geri davranışını açık tut | [`RoutineScreen.tsx`](../../src/screens/RoutineScreen.tsx) |
| Ürün kategorisi düzeltildi | 1 | Tahmin edilen kategoriyi kullanıcı tarafından düzenlenebilir yap | [`ProductReviewScreen.tsx`](../../src/screens/ProductReviewScreen.tsx) |
| İlk ağ isteği başarısız oldu | 1 | Tekrar deneme ve manuel devam seçeneklerini birlikte göster | [`ScannerScreen.tsx`](../../src/screens/ScannerScreen.tsx) |
| Bildirim izni reddedildi | 1 | İzin istemeden önce bildirimin değerini açıklamayı sürdür | [`notificationScheduler.ts`](../../src/services/notificationScheduler.ts) |

## Raporlar

- [GitHub'da görüntülenebilir PDF raporu](skinshelf-10-day-anonymous-user-pilot.pdf)
- [Düzenlenebilir Word raporu](skinshelf-10-day-anonymous-user-pilot.docx)

Tam rapor; çalışma tasarımını, günlük ve katılımcı bazlı toplu sonuçları, Shelly
etkileşim dağılımını, gözlenen sürtünmeleri, bulgudan koda izlenebilirliği,
teknik kanıt kapsamını ve sonraki ölçüm planını içerir. Kimliği açığa çıkarma
riski taşıyabilecek ayrıntılı kişi-gün kayıtları kamuya açık rapora eklenmemiştir.

## Yorumlama Sınırları

- Örneklem 10 katılımcıyla sınırlıdır; sonuçlar ürün kararı vermek için yön
  gösterir ancak genel kullanıcı kitlesini temsil ettiği iddia edilmez.
- Cilt günlüğü verileri öz bildirime dayanır. Cilt durumunda iyileşme veya ürünün
  tedavi etkisi hakkında sonuç üretilmez.
- Bildirim oranı yalnızca bildirim tercih eden aktif katılımcılar üzerinden
  değerlendirilmiştir.
- Ürün formülleri zamanla değişebileceği için canlı üründe ambalajdaki güncel
  INCI ve kullanım talimatı esas alınmalıdır.
