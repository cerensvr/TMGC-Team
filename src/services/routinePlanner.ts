import { Product } from '../types';
import { getProductRole } from './shellyInsights';
import {
  getScheduledActiveRole,
  isRoutineProductEligible,
  RoutineSafetyContext,
} from './routineSafetyPolicy';

export type ConcernKey = 'standard' | 'acne' | 'sensitivity' | 'dryness' | 'spot' | 'redness' | 'custom';
export type RoutineSlot = 'morning' | 'evening';

export type DayPlan = {
  day: string;
  focus: string;
  morning: Product[];
  evening: Product[];
};

export const concernOptions: { key: Exclude<ConcernKey, 'standard' | 'custom'>; label: string; prompt: string }[] = [
  { key: 'acne', label: 'Sivilce', prompt: 'Sivilce ve komedon görünümünü sakinleştirmeye odaklan.' },
  { key: 'sensitivity', label: 'Hassasiyet', prompt: 'Cildi yormayan, bariyer destekleyen ürünleri seç.' },
  { key: 'dryness', label: 'Kuruluk', prompt: 'Nem ve bariyer desteğini artır.' },
  { key: 'spot', label: 'Leke', prompt: 'Aydınlatıcı ve SPF odaklı rutin oluştur.' },
  { key: 'redness', label: 'Kızarıklık', prompt: 'Sakinleştirici ve düşük riskli ürünleri öne al.' },
];

export const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const nightFocus = [
  'Retinol',
  'Bariyer onarım',
  'C vitamini + nem',
  'Peeling',
  'Dinlenme',
  'Retinol',
  'Nem maskesi',
];

const slotCategories: Record<ConcernKey, Record<RoutineSlot, Product['category'][]>> = {
  standard: {
    morning: ['Temizleyici', 'Tonik', 'Serum', 'Nemlendirici', 'Güneş Kremi'],
    evening: ['Temizleyici', 'Serum', 'Nemlendirici'],
  },
  acne: {
    morning: ['Temizleyici', 'Serum', 'Nemlendirici', 'Güneş Kremi'],
    evening: ['Temizleyici', 'Serum', 'Nemlendirici'],
  },
  sensitivity: {
    morning: ['Temizleyici', 'Nemlendirici', 'Güneş Kremi'],
    evening: ['Temizleyici', 'Nemlendirici', 'Maske'],
  },
  dryness: {
    morning: ['Tonik', 'Serum', 'Nemlendirici', 'Güneş Kremi'],
    evening: ['Temizleyici', 'Tonik', 'Nemlendirici', 'Maske'],
  },
  spot: {
    morning: ['Serum', 'Nemlendirici', 'Güneş Kremi'],
    evening: ['Temizleyici', 'Serum', 'Nemlendirici'],
  },
  redness: {
    morning: ['Temizleyici', 'Nemlendirici', 'Güneş Kremi'],
    evening: ['Temizleyici', 'Nemlendirici', 'Maske'],
  },
  custom: {
    morning: ['Temizleyici', 'Serum', 'Nemlendirici', 'Güneş Kremi'],
    evening: ['Temizleyici', 'Serum', 'Nemlendirici'],
  },
};

const concernTerms: Record<ConcernKey, string[]> = {
  standard: [],
  acne: ['niacinamide', 'zinc', 'salicylic', 'bha', 'azelaic'],
  sensitivity: ['hyaluronic', 'centella', 'ceramide', 'panthenol', 'barrier'],
  dryness: ['hyaluronic', 'glycerin', 'ceramide', 'squalane', 'moisture'],
  spot: ['vitamin c', 'niacinamide', 'retinol', 'spf', 'acid'],
  redness: ['centella', 'panthenol', 'ceramide', 'cica', 'barrier'],
  custom: ['niacinamide', 'hyaluronic', 'glycerin', 'spf'],
};

const concernKeywords: { key: ConcernKey; words: string[] }[] = [
  { key: 'acne', words: ['sivilce', 'akne', 'komedon', 'yağlanma', 'yaglanma'] },
  { key: 'sensitivity', words: ['hassas', 'yanma', 'batma', 'tahriş', 'tahris'] },
  { key: 'dryness', words: ['kuru', 'kuruluk', 'gergin', 'pul pul'] },
  { key: 'spot', words: ['leke', 'ton eşitsizliği', 'ton esitsizligi', 'kararma'] },
  { key: 'redness', words: ['kızarıklık', 'kizariklik', 'kırmızı', 'kirmizi'] },
];

const normalize = (value: string) => value.toLocaleLowerCase('tr-TR');

const productText = (product: Product) =>
  normalize(`${product.name} ${product.brand} ${product.description} ${(product.activeIngredients || []).join(' ')}`);

const rankProductForRoutine = (product: Product, concern: ConcernKey, slot: RoutineSlot, dayIndex: number) => {
  let rank = 0;
  const text = productText(product);

  concernTerms[concern].forEach(term => {
    if (text.includes(term)) rank += 3;
  });

  if (slot === 'morning' && product.timeOfDay === 'morning') rank += 2;
  if (slot === 'evening' && product.timeOfDay === 'evening') rank += 2;
  if (product.timeOfDay === 'both') rank += 1;
  if (slot === 'morning' && product.category === 'Güneş Kremi') rank += 4;
  if (slot === 'evening' && product.category === 'Güneş Kremi') rank -= 5;
  if (concern === 'sensitivity' && product.category === 'Serum' && dayIndex % 2 === 1) rank -= 2;
  if (concern === 'acne' && product.category === 'Serum' && dayIndex % 2 === 0) rank += 2;
  if (concern === 'dryness' && product.category === 'Nemlendirici') rank += 3;

  return rank;
};

export const selectRoutineProducts = (
  products: Product[],
  concern: ConcernKey,
  slot: RoutineSlot,
  dayIndex: number,
  context: RoutineSafetyContext = {}
) => {
  const selectedIds = new Set<string>();

  return slotCategories[concern][slot]
    .map(category => {
      const candidates = products
        .filter(product => isRoutineProductEligible(product, concern, context))
        .filter(product => product.category === category && !selectedIds.has(product.id))
        .filter(product => product.timeOfDay === slot || product.timeOfDay === 'both' || product.category === 'Güneş Kremi');

      const selected = candidates.sort((a, b) => rankProductForRoutine(b, concern, slot, dayIndex) - rankProductForRoutine(a, concern, slot, dayIndex))[0];
      if (selected) selectedIds.add(selected.id);
      return selected;
    })
    .filter(Boolean) as Product[];
};

const buildEveningProducts = (
  products: Product[],
  concern: ConcernKey,
  dayIndex: number,
  context: RoutineSafetyContext
) => {
  const eligibleProducts = products.filter(product => isRoutineProductEligible(product, concern, context));
  const selected = selectRoutineProducts(eligibleProducts, concern, 'evening', dayIndex, context);
  const scheduledRole = getScheduledActiveRole(dayIndex, concern, context);
  const withoutStrongActives = selected.filter(product => {
    const role = getProductRole(product);
    return role !== 'retinol' && role !== 'peeling';
  });

  if (!scheduledRole) return withoutStrongActives;

  const scheduledActive = eligibleProducts.find(product => {
    const isAvailableInEvening = product.timeOfDay === 'evening' || product.timeOfDay === 'both';
    return isAvailableInEvening && getProductRole(product) === scheduledRole;
  });

  if (!scheduledActive) return withoutStrongActives;

  const moisturizerIndex = withoutStrongActives.findIndex(
    product => product.category === 'Nemlendirici' || product.category === 'Maske'
  );
  const insertIndex = moisturizerIndex === -1 ? withoutStrongActives.length : moisturizerIndex;

  return [
    ...withoutStrongActives.slice(0, insertIndex),
    scheduledActive,
    ...withoutStrongActives.slice(insertIndex),
  ];
};

export const buildWeekPlan = (
  products: Product[],
  concern: ConcernKey,
  context: RoutineSafetyContext = {}
): DayPlan[] =>
  weekDays.map((day, index) => {
    const morning = selectRoutineProducts(products, concern, 'morning', index, context);
    const evening = buildEveningProducts(products, concern, index, context);

    return {
      day,
      focus: nightFocus[index],
      morning,
      evening,
    };
  });

export const detectConcern = (message: string): ConcernKey => {
  const normalized = normalize(message);
  return concernKeywords.find(item => item.words.some(word => normalized.includes(word)))?.key || 'custom';
};

export const getConcernLabel = (concern: ConcernKey, customConcern?: string) => {
  if (concern === 'standard') return 'Standart rutin';
  if (concern === 'custom') return customConcern?.trim() || 'Özel şikayet';
  return concernOptions.find(option => option.key === concern)?.label || 'Özel şikayet';
};

export const getConcernPrompt = (concern: ConcernKey, customConcern?: string) => {
  if (concern === 'standard') return 'Cilt dengeni koruyan standart rutin dolabındaki ürünlerden oluşturuldu.';
  if (concern === 'custom') return customConcern?.trim() || 'Yeni şikayete göre dolabındaki en uygun ürünler seçiliyor.';
  return concernOptions.find(option => option.key === concern)?.prompt || 'Dolabındaki ürünlerden hedefli bir rutin oluşturuldu.';
};
