import { ImageSourcePropType } from 'react-native';
import { Category, ProductDraft } from '../types';

// imageUrl alanını da Pick tipine ekledik
type ProductVisualInput = Pick<ProductDraft, 'brand' | 'name' | 'category' | 'cutoutImageUrl' | 'imageUrl'>;

const fallbackProductAssets: Record<Category, ImageSourcePropType> = {
  Temizleyici: require('../../assets/products/cleanser-pump.png'),
  Tonik: require('../../assets/products/toner-bottle.png'),
  Serum: require('../../assets/products/serum-bottle.png'),
  'Göz Kremi': require('../../assets/products/eye-cream-tube.png'),
  Nemlendirici: require('../../assets/products/moisturizer-jar.png'),
  'Güneş Kremi': require('../../assets/products/sunscreen-tube.png'),
  Maske: require('../../assets/products/mask-jar.png'),
  Diğer: require('../../assets/products/generic-bottle.png'),
};

const localCutoutAssets: Record<string, ImageSourcePropType> = {
  'local:la-roche-effaclar-kplus': require('../../assets/product-cutouts/la-roche-effaclar-kplus.png'),
  'local:la-roche-posay-effaclar-duo-m': require('../../assets/product-cutouts/la-roche-posay-effaclar-duo-m.png'),
  'local:cerave-kopuren-temizleyici': require('../../assets/product-cutouts/cerave-kopuren-temizleyici.png'),
  'local:anthelios-uvair-spf50': require('../../assets/product-cutouts/anthelios-uvair-spf50.png'),
  'local:la-roche-posay-mela-b3-serum': require('../../assets/product-cutouts/la-roche-posay-mela-b3-serum.png'),
  'local:la-roche-posay-mela-b3-cleanser': require('../../assets/product-cutouts/la-roche-posay-mela-b3-cleanser.png'),
  'local:la-roche-posay-cicaplast-baume-b5': require('../../assets/product-cutouts/la-roche-posay-cicaplast-baume-b5.png'),
};

const normalize = (value = '') => value.toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim();

export const matchProductCutout = (brand?: string, name?: string) => {
  const text = normalize(`${brand || ''} ${name || ''}`);

  if (text.includes('cerave') && (text.includes('köpüren') || text.includes('kopuren') || text.includes('foaming'))) {
    return 'local:cerave-kopuren-temizleyici';
  }

  if (text.includes('la roche') && text.includes('effaclar') && text.includes('duo')) {
    return 'local:la-roche-posay-effaclar-duo-m';
  }

  if (text.includes('la roche') && text.includes('mela b3') && text.includes('serum')) {
    return 'local:la-roche-posay-mela-b3-serum';
  }

  if (
    text.includes('la roche') &&
    text.includes('mela b3') &&
    (text.includes('cleanser') || text.includes('temizleme') || text.includes('temizleyici') || text.includes('jel'))
  ) {
    return 'local:la-roche-posay-mela-b3-cleanser';
  }

  if (text.includes('la roche') && (text.includes('anthelios') || text.includes('uvair'))) {
    return 'local:anthelios-uvair-spf50';
  }

  if (text.includes('la roche') && text.includes('cicaplast') && text.includes('b5')) {
    return 'local:la-roche-posay-cicaplast-baume-b5';
  }

  if (
    text.includes('la roche') &&
    text.includes('effaclar') &&
    (text.includes('k+') || text.includes('k plus'))
  ) {
    return 'local:la-roche-effaclar-kplus';
  }

  return undefined;
};

export const getProductVisualSource = (product: ProductVisualInput, imageFailed = false): ImageSourcePropType => {
  // 1. ÖNCE ÖZEL YEREL DEKUPE RESİM VAR MI KONTROL ET (local:la-roche-...)
  const matchedCutout = product.cutoutImageUrl || matchProductCutout(product.brand, product.name);

  if (matchedCutout && localCutoutAssets[matchedCutout]) {
    return localCutoutAssets[matchedCutout];
  }

  // 2. EĞER İNTERNET RESMİ HATA VERMEDİYDSE VE OPEN BEAUTY FACTS'TEN GELEN 'imageUrl' VARSA O RESMİ GÖSTER
  if (!imageFailed && product.imageUrl?.trim()) {
    return { uri: product.imageUrl.trim() };
  }

  // 3. HİÇBİRİ YOKSA VEYA İNTERNET RESMİ YÜKLENEMEDİYSE (imageFailed=true) KATEGORİ VARSAYILAN RESMİNİ DÖN
  return fallbackProductAssets[product.category] || fallbackProductAssets['Diğer'];
};
