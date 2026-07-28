# Shelly Yanıt Kalitesi Doğrulama Raporu

Tarih: 28 Temmuz 2026

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
- İçerik eşleştirmelerinde kelime sınırı kullanılıyor; örneğin `AHA`, `daha`
  kelimesi içinde yanlış eşleşmiyor.
- Retinoid/eksfolyan, çoklu eksfolyan ve nem/bariyer etkileşim kontrolleri yerel
  bilgi tabanında çalışıyor.
- Tanınan içerik analizleri Gemini çağrısı harcamadan yerel bilgi tabanından
  hazırlanıyor.
- Ana `gemini-3.6-flash` kotası dolduğunda `gemini-3.5-flash-lite` ücretsiz
  yedek modeli otomatik deneniyor. İki model de kullanılamazsa kişisel ve güvenli
  fallback yanıtı korunuyor.

## Otomatik doğrulama

```text
./mvnw test
Tests run: 22, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

- 42 altın sohbet cümlesinin 42'si doğru cevap moduna ayrıldı.
- Altı sohbet modunun her biri için iki örneğin JSON sözleşmesi doğrulandı.
- Uydurma ürün ID'si, çelişkili öneri/kaçınma kararı, yüksek riskte boş uyarı ve
  yanlış model modu senaryoları test edildi.
- Bilinen içeriklerin Gemini kotası harcamadığı test edildi.

```text
npm run build
tsc --noEmit: başarılı
```

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

## Kapsam sınırı

Shelly tıbbi teşhis veya tedavi üretmez. Şişlik, nefes darlığı, su toplama ve
açık yara gibi riskli ifadeler üretken modele gönderilmeden güvenlik filtresinde
sağlık profesyoneline yönlendirilir.
