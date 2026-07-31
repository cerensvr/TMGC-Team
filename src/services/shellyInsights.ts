import { Product } from '../types';
import { getRemainingDays } from './expiryDate';

export type ProductRole =
  | 'retinol'
  | 'peeling'
  | 'vitaminC'
  | 'spf'
  | 'barrier'
  | 'hydration'
  | 'acne'
  | 'basic';

export type ProductStatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export type ProductStatus = {
  label: string;
  note: string;
  tone: ProductStatusTone;
};

export type RoutineReview = {
  morningNote: string;
  eveningNote: string;
  riskNote: string;
  /** 10 üzerinden rutin uyum skoru. */
  score: number;
  riskLevel: 'Düşük' | 'Orta' | 'Yüksek';
};

const normalize = (value = '') => value.toLocaleLowerCase('tr-TR');

const productText = (product: Product) =>
  normalize(`${product.brand} ${product.name} ${product.description} ${(product.activeIngredients || []).join(' ')}`);

const hasAny = (value: string, terms: string[]) => terms.some(term => value.includes(term));

export const getProductRole = (product: Product): ProductRole => {
  const text = productText(product);

  if (hasAny(text, ['retinol', 'retinal', 'retinoid'])) return 'retinol';
  if (hasAny(text, ['peeling', 'aha', 'bha', 'glycolic', 'lactic', 'salisilik', 'salicylic acid'])) return 'peeling';
  if (hasAny(text, ['vitamin c', 'c vitamini', 'ascorbic'])) return 'vitaminC';
  if (product.category === 'Güneş Kremi' || hasAny(text, ['spf', 'uv'])) return 'spf';
  if (hasAny(text, ['ceramide', 'panthenol', 'madecassoside', 'cica', 'barrier'])) return 'barrier';
  if (hasAny(text, ['hyaluronic', 'hyaluronik', 'glycerin', 'squalane', 'moisture'])) return 'hydration';
  if (hasAny(text, ['niacinamide', 'zinc', 'azelaic', 'akne', 'acne'])) return 'acne';

  return 'basic';
};

export const getProductStatus = (product: Product): ProductStatus => {
  const remainingDays = getRemainingDays(product.expiryDate);
  const role = getProductRole(product);

  if (remainingDays !== null && remainingDays < 0) {
    return { label: 'Bitti', note: 'Dolaptan kontrol et', tone: 'danger' };
  }

  if (remainingDays !== null && remainingDays <= 60) {
    return { label: 'Az kaldı', note: `${remainingDays} gün içinde kontrol`, tone: 'warning' };
  }

  if (role === 'retinol') {
    return { label: 'Dikkat', note: 'Akşam • haftada 2', tone: 'warning' };
  }

  if (role === 'peeling') {
    return { label: 'Dikkat', note: 'Retinol ile aynı gece değil', tone: 'warning' };
  }

  if (role === 'vitaminC') {
    return { label: 'Rutinde', note: 'Sabah SPF ile kullan', tone: 'success' };
  }

  if (role === 'spf') {
    return { label: 'Temel adım', note: 'Sabah son adım', tone: 'success' };
  }

  if (role === 'barrier' || role === 'hydration') {
    return { label: 'Uyumlu', note: 'Bariyer desteği', tone: 'success' };
  }

  if ((product.activeIngredients || []).length > 0) {
    return { label: 'Aktif içerik', note: 'Shelly takipte', tone: 'info' };
  }

  return { label: 'Uyumlu', note: 'Rutinde kullanılabilir', tone: 'neutral' };
};

export const getRoutineReview = (morningProducts: Product[], eveningProducts: Product[]): RoutineReview => {
  const hasMorningVitaminC = morningProducts.some(product => getProductRole(product) === 'vitaminC');
  const hasMorningSpf = morningProducts.some(product => getProductRole(product) === 'spf');
  const hasEveningRetinol = eveningProducts.some(product => getProductRole(product) === 'retinol');
  const hasEveningPeeling = eveningProducts.some(product => getProductRole(product) === 'peeling');

  let score = 10;
  if (!hasMorningSpf) score -= 2;
  if (hasEveningRetinol && hasEveningPeeling) score -= 3;
  else if (hasEveningRetinol || hasEveningPeeling) score -= 1;
  if (hasMorningVitaminC && !hasMorningSpf) score -= 1;
  score = Math.max(3, score);

  const riskLevel: RoutineReview['riskLevel'] =
    hasEveningRetinol && hasEveningPeeling ? 'Yüksek' : score <= 7 ? 'Orta' : 'Düşük';

  return {
    score,
    riskLevel,
    morningNote: hasMorningVitaminC && hasMorningSpf
      ? 'C vitamini sonrası SPF50+ kullanman leke görünümü hedefini destekler.'
      : hasMorningSpf
        ? 'SPF sabah rutininin son adımı olarak doğru yerde.'
        : 'Sabah rutininde SPF eklemek leke ve hassasiyet hedefleri için önemli.',
    eveningNote: hasEveningRetinol && hasEveningPeeling
      ? 'Retinol ve peeling aynı gece önerilmez; Shelly bu ikisini haftalık planda ayırır.'
      : hasEveningRetinol
        ? 'Retinol gecesi bariyer destekli nemlendiriciyle tamamlanmalı.'
        : hasEveningPeeling
          ? 'Peeling gecesi rutini kısa tutmak hassasiyet riskini azaltır.'
          : 'Akşam rutini bariyer desteği odaklı ve düşük riskli görünüyor.',
    riskNote: hasEveningRetinol || hasEveningPeeling
      ? 'Shelly aktif içerikleri haftaya yayar; retinol ve peeling aynı geceye alınmaz.'
      : 'Shelly bugünkü planı kontrol etti; aktif içerik çakışması görünmüyor.',
  };
};

export const getProductShellyComment = (product: Product) => {
  const role = getProductRole(product);

  if (role === 'vitaminC') {
    return `${product.brand} ${product.name}, aydınlık görünüm hedefi için sabah rutininde anlamlı. SPF ile birlikte kullanman iyi bir eşleşme olur; hassasiyet hissedersen sıklığı azalt.`;
  }

  if (role === 'peeling') {
    return `${product.brand} ${product.name} aktif içerik içeren bir bakım adımı. Retinol kullanılan gecelerle aynı rutine koymamak ve bariyer destekli nemlendiriciyle tamamlamak daha güvenli.`;
  }

  if (role === 'retinol') {
    return `${product.brand} ${product.name} akşam rutininde kontrollü kullanılmalı. Shelly bunu peeling gecelerinden ayırır ve başlangıçta haftada 2 geceyi aşmayan bir plan önerir.`;
  }

  if (role === 'spf') {
    return `${product.brand} ${product.name} sabah rutininin son adımı olmalı. Leke, hassasiyet ve aktif içerik kullanılan dönemlerde rutinin temel koruma adımıdır.`;
  }

  if (role === 'barrier' || role === 'hydration') {
    return `${product.brand} ${product.name} bariyer ve nem desteği için uyumlu görünüyor. Aktif içerikli gecelerde rutini dengelemek için iyi bir tamamlayıcı olabilir.`;
  }

  return `${product.brand} ${product.name}, ${product.category.toLocaleLowerCase('tr-TR')} adımı için rafında kayıtlı. Shelly bu ürünün içeriklerini, kullanım zamanını ve cilt profilinle uyumunu birlikte takip eder.`;
};
