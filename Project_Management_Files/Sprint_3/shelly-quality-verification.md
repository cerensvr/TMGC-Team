# Shelly Yanıt Kalitesi Doğrulama Raporu

Tarih: 31 Temmuz 2026

## Amaç

Shelly'nin ücretli Gemini hesabı gerektirmeden daha kişisel, tutarlı ve güvenli
cevap vermesi; dolaptaki gerçek ürünleri öncelemesi ve ücretsiz kota dolduğunda
da üretken AI yanıtının devam etmesi.

## Uygulanan kalite katmanları

- Her soru backend tarafından `PRODUCT_ANALYSIS`, `ROUTINE_CHECK`,
  `INGREDIENT_ANALYSIS`, `SKIN_REACTION`, `WEEKLY_PLAN` veya `GENERAL_CHAT`
  modlarından birine ayrılıyor.
- Her istekte yalnızca seçilen moda ait iki sentetik iyi cevap örneği Gemini'ye
  gönderiliyor.
- System instruction, kullanıcı mesajı ve profil verisinden API seviyesinde
  ayrılıyor.
- Son 50 mesajdan aktif hedef, kullanıcının açık kısıtları ve reaksiyon ifadeleri
  yapılandırılmış hafızaya dönüştürülüyor; ham sohbet yalnızca son dört turla
  sınırlandırılıyor.
- Önerilen ve ara verilecek ürün ID'leri kullanıcının dolabındaki gerçek
  ürünlerle doğrulanıyor. Aynı ürün iki listede gelirse ihtiyatlı karar üstün
  geliyor.
- Dolaptaki sahiplik ile rutin aktifliği ayrıldı. `rutinde_pasif` ürünler de
  kullanıcının sahip olduğu seçenekler olarak Shelly bağlamına giriyor; rutin ve
  haftalık planlar yalnız `rutinde_aktif` ürünleri kullanıyor.
- Kullanıcı bir ürün satın almayı sorduğunda aynı ihtiyacı karşılayan dolap ürünü
  önce değerlendiriliyor. Model buna rağmen yeni satın alma önerirse backend
  öneriyi mevcut dolap ürünüyle değiştiriyor.
- “Yeni sohbet başlat” işlemi artık yalnız mobil ekranı değil, backend'deki
  konuşma hafızasını da siliyor; eski konuşmalar yeni sohbeti etkilemiyor.
- İçerik eşleştirmelerinde kelime sınırı kullanılıyor; örneğin `AHA`, `daha`
  kelimesi içinde yanlış eşleşmiyor.
- Retinoid/eksfolyan, çoklu eksfolyan ve nem/bariyer etkileşim kontrolleri yerel
  bilgi tabanında çalışıyor.
- Tanınan içerik analizleri Gemini çağrısı harcamadan yerel bilgi tabanından
  hazırlanıyor.
- Ana `gemini-3.6-flash` kotası dolduğunda `gemini-3.5-flash-lite` ücretsiz
  yedek modeli otomatik deneniyor. İki model de kullanılamazsa kişisel ve güvenli
  fallback yanıtı korunuyor.
- Serbest metin model yanıtı, backend tarafından doğrulanan bir karar sözleşmesi
  ile zenginleştiriliyor: `usedContext`, `shelfProducts`, `missingCategories`,
  `routineSteps`, `safetyWarnings` ve `fallbackUsed`. Mobil istemci model
  metnini ayrıştırmak yerine bu güvenilir alanları kartlara dönüştürüyor.
- Shelly, öneride hangi profil/dolap/geçmiş/bilgi tabanı verisini kullandığını
  “Bu öneriyi neden verdim?” bölümünde gösteriyor. Gemini çalışmadığında kaynak
  açıkça güvenli bilgi tabanı olarak etiketleniyor.
- Rutin yanıtları sabah, akşam ve haftalık günlere ayrılmış uygulanabilir
  adımlar üretiyor; dolaptaki ürünler ile eksik ihtiyaç kategorileri görsel ve
  anlamsal olarak ayrılıyor.
- Yeni ürün analizinde Gemini'nin verdiği ürün ID'leri kullanıcı dolabına karşı
  doğrulanıyor. Yerel bilgi tabanı retinoid + AHA/BHA, çoklu asit ve hassas
  ciltte C vitamini + asit çatışmalarını tam ürün adı ve güvenli kullanım
  önerisiyle yapılandırılmış olarak döndürüyor.
- Cilt fotoğrafı/günlük analizi görünür sinyalleri önceki kayıtla
  `increased|decreased|stable|unknown` olarak karşılaştırıyor; kullanılan
  bağlamı ve Gemini/fallback kaynağını görünür kılıyor. Bu karşılaştırma tıbbi
  teşhis olarak sunulmuyor.

## Otomatik doğrulama

```text
./mvnw test
Tests run: 63, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

- 100 golden sohbet cümlesinin 100'ü doğru cevap moduna ayrıldı.
- Altı sohbet modunun her biri için iki örneğin JSON sözleşmesi doğrulandı.
- Uydurma ürün ID'si, çelişkili öneri/kaçınma kararı, yüksek riskte boş uyarı ve
  yanlış model modu senaryoları test edildi.
- Pasif dolap ürününü yeniden satın alma önerisi, Gemini'nin yanlış satın alma
  tavsiyesi, pasif ürünün rutine sızması ve kalıcı sohbet hafızasının gerçekten
  temizlenmesi test edildi.
- Bilinen içeriklerin Gemini kotası harcamadığı test edildi.
- Haftalık retinoid/BHA ayrımı, eksik temel rutin adımları, açıklanabilir bağlam
  alanları, dolaptaki ürünle yapılandırılmış çatışma ve önceki cilt kaydıyla
  görünür değişim karşılaştırması test edildi.

```text
npm run build
tsc --noEmit: başarılı

npm test
Tests: 19 passed, 0 failed

npx expo-doctor
18/18 checks passed
```

Yeni karar sözleşmesini de doğrulayan `npm run smoke:api`, izole H2 test
veritabanında üç profille çalıştırıldı. Kayıt, profil, ürün, içerik analizi,
Shelly bağlamı, rutin/eksik kategori alanları, cilt karşılaştırması ve veri
temizliği kontrollerinin tamamı geçti.

## Gerçek Gemini uçtan uca testi

İzole H2 veritabanı ve sentetik kullanıcılarla yerel backend üzerinde üç profil
çalıştırıldı:

- Kuru/hassas cilt ve kızarıklık
- Yağlı cilt ve BHA içerik uyumu
- Karma cilt ve rutin kontrolü

Üç profil de kayıt, giriş, profil, ürün, içerik analizi, Shelly sohbeti, geçmiş,
cilt günlüğü ve hesap silme adımlarını tamamladı. Ana modelin ücretsiz kota
yanıtı `429` olduğunda üç sohbetin üçü de yedek modelden `200` aldı; test
verileri çalışma sonunda silindi.

## Canlı Render doğrulaması

Shelly iyileştirmelerini içeren `5596e0d` release commit'i
`https://skinshelf-backend.onrender.com` adresine manuel olarak yayınlandı.
Canlı sağlık kontrolü `HTTP 200` ve `status: ok` döndürdü.

Ardından aynı üretim API'sinde üç sentetik profil ile tam smoke testi çalıştı:

- Kuru/hassas profil: `SKIN_REACTION`
- Yağlı/akne eğilimli profil: `INGREDIENT_ANALYSIS`
- Karma/rutin odaklı profil: `ROUTINE_CHECK`

Üç senaryonun üçünde de backend'in belirlediği cevap modu doğru geldi, Shelly
özeti güncellenmiş profil adını içerdi ve dolaba eklenen ürün akış boyunca
erişilebilir kaldı. Kayıt, giriş, profil, ürün, içerik analizi, sohbet geçmişi,
cilt günlüğü, haftalık özet ve silme kontrollerinin tamamı geçti. Smoke betiği
oluşturduğu hesapları, ürünleri ve cilt günlüklerini test sonunda sildi.

## Kapsam sınırı

Shelly tıbbi teşhis veya tedavi üretmez. Şişlik, nefes darlığı, su toplama ve
açık yara gibi riskli ifadeler üretken modele gönderilmeden güvenlik filtresinde
sağlık profesyoneline yönlendirilir.
