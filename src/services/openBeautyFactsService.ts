import { Category, ProductDraft } from '../types';
import { matchProductCutout } from './productVisualCatalog';

interface OpenBeautyFactsProduct {
  product_name?: string;
  brands?: string;
  ingredients_text?: string;
  categories_tags?: string[];
  image_front_url?: string;
}

interface OpenBeautyFactsResponse {
  product?: OpenBeautyFactsProduct;
  status?: number;
}

const OPEN_BEAUTY_FACTS_BASE_URL = 'https://world.openbeautyfacts.org/api/v2';

const fields = [
  'product_name',
  'brands',
  'ingredients_text',
  'categories_tags',
  'image_front_url',
].join(',');

const normalizeCategory = (product: OpenBeautyFactsProduct): Category => {
  const text = [
    product.product_name,
    product.categories_tags?.join(' '),
  ].join(' ').toLocaleLowerCase('tr-TR');

  if (text.includes('cleanser') || text.includes('temizleyici') || text.includes('gel')) return 'Temizleyici';
  if (text.includes('toner') || text.includes('tonik')) return 'Tonik';
  if (text.includes('serum') || text.includes('effaclar') || text.includes('treatment')) return 'Serum';
  if (text.includes('eye') || text.includes('göz')) return 'Göz Kremi';
  if (text.includes('spf') || text.includes('sun') || text.includes('güneş') || text.includes('sunscreen')) return 'Güneş Kremi';
  if (text.includes('cream') || text.includes('crème') || text.includes('krem') || text.includes('moistur')) return 'Nemlendirici';
  if (text.includes('mask') || text.includes('maske')) return 'Maske';

  return 'Diğer';
};

const parseIngredients = (ingredientsText?: string) => {
  if (!ingredientsText) return [];

  return ingredientsText
    .split(/[,•\n-]+/)
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 8);
};

const getRoutineTime = (category: Category): ProductDraft['timeOfDay'] => {
  if (category === 'Güneş Kremi') return 'morning';
  return 'both';
};

const toProductDraft = (product: OpenBeautyFactsProduct): ProductDraft => {
  const category = normalizeCategory(product);
  const activeIngredients = parseIngredients(product.ingredients_text);

  return {
    name: product.product_name || 'Bilinmeyen Ürün',
    brand: product.brands || 'Bilinmeyen Marka',
    category,
    timeOfDay: getRoutineTime(category),
    imageUrl: product.image_front_url || '',
    cutoutImageUrl: matchProductCutout(product.brands, product.product_name),
    description: product.ingredients_text
      ? `Open Beauty Facts verisine göre içerik özeti: ${product.ingredients_text.slice(0, 220)}${product.ingredients_text.length > 220 ? '...' : ''}`
      : 'Open Beauty Facts üzerinde ürün bilgisi bulundu, ancak içerik metni eksik.',
    activeIngredients,
  };
};

export const openBeautyFactsService = {
  getProductByBarcode: async (barcode: string): Promise<ProductDraft | null> => {
    const normalizedBarcode = barcode.replace(/\s+/g, '');
    if (!/^\d{8,14}$/.test(normalizedBarcode)) {
      throw new Error('Geçersiz barkod formatı.');
    }

    const url = `${OPEN_BEAUTY_FACTS_BASE_URL}/product/${encodeURIComponent(normalizedBarcode)}?fields=${fields}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Open Beauty Facts request failed: ${response.status}`);
    }

    const data = (await response.json()) as OpenBeautyFactsResponse;
    if (!data.product || data.status === 0) return null;

    return toProductDraft(data.product);
  },
};
