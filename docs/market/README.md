# Pazar Potansiyeli ve Ürün Stratejisi

## Problem ve Doğrulanmış Sinyal

SkinShelf'in hedeflediği sorun, kullanıcının elindeki ürünleri tek tek analiz
etmekten daha geniştir: ürün sahipliği, rutin sırası, aktif içerik yoğunluğu ve
cilt değişimi çoğu araçta ayrı akışlarda kalır. SkinShelf bu verileri Shelly'nin
açıklanabilir rutin kararında birleştirir.

10 katılımcılı, 10 günlük anonim pilotta 91 aktif kullanıcı-günü ve 137/182
tamamlanan rutin kaydedildi. Rutin tamamlama oranı `%75,3`, ilk rutine ulaşma
medyanı `3:05`, 10. gün aktifliği `%80` oldu. Bu küçük örneklem pazar büyüklüğü
kanıtı değildir; ürünün temel akışının kullanılabildiğine dair erken sinyaldir.
[Pilot yöntemi ve sınırlar](../user-research/README.md) ayrı raporda yer alır.

Türkiye'de 2025 sonunda nüfus 86.092.168 kişidir. TÜİK'in 2025 Hanehalkı BİT
araştırmasına göre 16-74 yaş grubunda internet kullanımı `%90,9`, internetten
mal veya hizmet satın alma oranı `%55,7` olmuştur. Üretken AI kullanımı 16-24
yaşta `%39,4`, 25-34 yaşta `%30,0`, 35-44 yaşta `%15,5` olarak raporlanmıştır.
Bu göstergeler mobil ve AI destekli bir ürün için erişilebilirlik sinyali verir;
tek başına cilt bakımı talebini ölçmez.

## Rakip Haritası

| Yetkinlik | Yuka | SkinSort | Skin Bliss | SkinShelf |
| --- | :---: | :---: | :---: | :---: |
| Kozmetik ürün/INCI inceleme | Evet | Evet | Evet | Evet |
| Barkod veya ürün tarama | Evet | Evet | Evet | Evet |
| Kişisel cilt profili | Sınırlı/puan odaklı | Evet | Evet | Evet |
| Rutin oluşturma | İncelenen kaynakta yok | Evet | Evet | Evet |
| Günlük ilerleme takibi | İncelenen kaynakta yok | Evet | Evet | Evet |
| Kullanıcının sahip olduğu rafı rutin girdisi yapma | İncelenen kaynakta yok | Kısmi | Kısmi | Evet |
| Modelden bağımsız aktif içerik zamanlama politikası | Belirtilmiyor | Belirtilmiyor | Çakışma kontrolü var | Evet, otomatik testli |
| Türkçe raf + rutin + sohbet hafızası akışı | Belirtilmiyor | Belirtilmiyor | Belirtilmiyor | Evet |

Rakip sütunları yalnız incelenen resmi ürün sayfalarında açıkça tanıtılan
özelliklere dayanır; “yok” yerine kaynakta kanıtlanamayan alanlarda
“belirtilmiyor” kullanılmıştır. Skin Bliss en yakın kapsam rakibidir; SkinSort
ürün/ingredient keşfi ve rutin araçlarında güçlüdür; Yuka'nın temel değeri
ürünü tarayıp içerik etkisini anlaşılır puana dönüştürmektir.

SkinShelf'in savunulabilir farkı daha fazla özellik sayısı değil, şu kapalı
döngüdür:

1. Kullanıcı ürünü barkod, fotoğraf veya manuel girişle kendi rafına ekler.
2. Shelly yalnız sahip olunan ve rutin için aktif ürünleri kullanır.
3. Deterministik policy güçlü aktifleri güvenli zamanlara ayırır.
4. Cilt günlüğü ve sohbet hafızası bir sonraki yoruma bağlam olur.
5. Kullanıcı ürün kullanımını değiştirince raf, rutin ve Shelly çıktısı birlikte değişir.

## TAM, SAM ve SOM Yaklaşımı

Güvenilir bir Türkiye cilt bakım uygulaması kullanım oranı bulunmadan, toplam
nüfusa varsayımsal bir “cilt bakımı ilgisi” yüzdesi uygulayıp kesin pazar sayısı
vermek yanıltıcı olur. Bu nedenle model iki parçaya ayrılmıştır:

- **TAM tanımı:** Türkiye'de internet kullanan ve cilt bakım ürünlerini takip
  etmek isteyen 16-74 yaş kullanıcılar. TÜİK internet oranı erişilebilirliği
  doğrular; cilt bakımı ilgi oranı ayrıca araştırılmalıdır.
- **SAM tanımı:** Android kullanan, en az üç bakım ürünü bulunan, rutin veya
  içerik uyumu sorunu yaşayan Türkçe kullanıcılar. Sayısallaştırma için en az
  300 kişilik hedef kitle anketi ve mağaza anahtar kelime testi planlanmıştır.
- **SOM hedefi:** Üçüncü yıl sonunda 25.000 aylık aktif kullanıcı. Bu gerçek
  pazar verisi değil, ekip kapasitesi ve ürün büyüme planı için iç hedeftir.

### Şeffaf Gelir Senaryosu

| Varsayım | Değer |
| --- | ---: |
| 3. yıl aylık aktif kullanıcı hedefi | 25.000 |
| Premium dönüşüm varsayımı | %4 |
| Premium kullanıcı | 1.000 |
| Aylık fiyat varsayımı | 149 TL |
| Aylık tekrar eden gelir senaryosu | 149.000 TL |
| Yıllık tekrar eden gelir senaryosu | 1.788.000 TL |

Fiyat ve dönüşüm oranı doğrulanmış sonuç değildir. Ödeme isteği görüşmeleri ve
A/B fiyat testi yapılmadan gelir tahmini karar verisi olarak kullanılmamalıdır.

## İş Modeli

**Ücretsiz çekirdek:** Dijital raf, manuel/barkod ürün ekleme, temel günlük
rutin, ürün bitiş tarihi ve yerel güvenlik kuralları.

**Premium yön:** Derin Shelly analiz geçmişi, gelişmiş haftalık özetler,
kişisel trend karşılaştırmaları ve daha yüksek AI kullanım kotası. Güvenlik
uyarıları veya hesap/veri silme hiçbir zaman ücretli duvarın arkasına konmaz.

**B2B olasılığı:** Marka sponsorluğu yerine şeffaf ve etiketli katalog veri
entegrasyonu değerlendirilebilir. Öneri sıralaması için ödeme alınması ürünün
güven ilişkisini zedeleyeceği için kapsam dışıdır.

## Pazara Çıkış ve Ölçüm

| Aşama | Kanal | Başarı ölçütü |
| --- | --- | --- |
| Kapalı beta | Pilot katılımcıları + üniversite toplulukları | İlk rutine süre, 7. gün aktifliği, hata oranı |
| İçerik doğrulama | Kısa ürün/rutin eğitim içerikleri | Ürün eklemeye dönüşüm, organik kurulum |
| Açık Android beta | Google Play test kanalı | Crash-free session, D7/D30 retention |
| Premium deneme | Uygulama içi kontrollü teklif | Deneme başlatma, ödeme dönüşümü, iptal nedeni |

Bir sonraki araştırma kararı: 30 nitel görüşme ve en az 300 yanıtlı hedef kitle
anketinde “kaç ürün kullanılıyor, rutin kararı nerede zorlaşıyor, hangi özellik
için ödeme yapılır” sorularını ölçmek. Ürün metriği olarak tanı veya tedavi
sonucu değil, rutin tutarlılığı, görev tamamlama, anlaşılabilirlik ve güvenli
yönlendirme izlenir.

## Kaynaklar

- [TÜİK, ADNKS 2025](https://veriportali.tuik.gov.tr/tr/press/53899/metadata)
- [TÜİK, Hanehalkı BİT Kullanım Araştırması 2025](https://veriportali.tuik.gov.tr/Bulten/Index?p=Survey-on-Information-and-Communication-Technology-%28ICT%29-Usage-in-Households-and-by-Individuals-2025-53925)
- [TÜİK, Yapay Zeka İstatistikleri 2025](https://veriportali.tuik.gov.tr/Bulten/Index?p=Yapay-Zeka-Istatistikleri-2025-57945)
- [Yuka resmi ürün sayfası](https://yuka.io/en/)
- [SkinSort resmi ürün sayfası](https://skinsort.com/)
- [Skin Bliss resmi ürün sayfası](https://getskinbliss.com/)
- [Avrupa Komisyonu CosIng veritabanı](https://single-market-economy.ec.europa.eu/sectors/cosmetics/cosmetic-ingredient-database_en)
