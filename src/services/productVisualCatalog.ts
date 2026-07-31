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
};

const normalize = (value = '') => value.toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim();

export const matchProductCutout = (brand?: string, name?: string) => {
  const text = normalize(`${brand || ''} ${name || ''}`);

  if (text.includes('la roche') && text.includes('effaclar')) {
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