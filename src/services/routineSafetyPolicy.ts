import { Product } from '../types';
import { getRemainingDays } from './expiryDate';
import type { ConcernKey, DayPlan, RoutineSlot } from './routinePlanner';
import { getProductRole, ProductRole } from './shellyInsights';

export type RoutineSafetyContext = {
  isPregnant?: boolean;
};

export type RoutinePolicyViolation = {
  code:
    | 'EXPIRED_PRODUCT'
    | 'PREGNANCY_RETINOID'
    | 'REACTION_STRONG_ACTIVE'
    | 'STRONG_ACTIVE_IN_MORNING'
    | 'STRONG_ACTIVE_CONFLICT';
  day: string;
  slot: RoutineSlot;
  productIds: string[];
};

const strongActiveRoles = new Set<ProductRole>(['retinol', 'peeling']);

export const isStrongActive = (product: Product) =>
  strongActiveRoles.has(getProductRole(product));

export const isRoutineProductEligible = (
  product: Product,
  concern: ConcernKey,
  context: RoutineSafetyContext = {}
) => {
  if (product.isActive === false) return false;

  const remainingDays = getRemainingDays(product.expiryDate);
  if (remainingDays !== null && remainingDays < 0) return false;

  const role = getProductRole(product);
  if (context.isPregnant && role === 'retinol') return false;
  if ((concern === 'sensitivity' || concern === 'redness') && strongActiveRoles.has(role)) {
    return false;
  }

  return true;
};

export const getScheduledActiveRole = (
  dayIndex: number,
  concern: ConcernKey,
  context: RoutineSafetyContext = {}
): Extract<ProductRole, 'retinol' | 'peeling'> | null => {
  if (concern === 'sensitivity' || concern === 'redness') return null;
  if ((dayIndex === 0 || dayIndex === 5) && !context.isPregnant) return 'retinol';
  if (dayIndex === 3) return 'peeling';
  return null;
};

/** Final planı prompttan bağımsız kurallarla denetler. Boş liste güvenli plan demektir. */
export const validateRoutinePlan = (
  plan: DayPlan[],
  concern: ConcernKey,
  context: RoutineSafetyContext = {}
): RoutinePolicyViolation[] => {
  const violations: RoutinePolicyViolation[] = [];

  for (const day of plan) {
    const slots: [RoutineSlot, Product[]][] = [
      ['morning', day.morning],
      ['evening', day.evening],
    ];

    for (const [slot, products] of slots) {
      for (const product of products) {
        const role = getProductRole(product);
        const remainingDays = getRemainingDays(product.expiryDate);
        if (remainingDays !== null && remainingDays < 0) {
          violations.push({ code: 'EXPIRED_PRODUCT', day: day.day, slot, productIds: [product.id] });
        }
        if (context.isPregnant && role === 'retinol') {
          violations.push({ code: 'PREGNANCY_RETINOID', day: day.day, slot, productIds: [product.id] });
        }
        if ((concern === 'sensitivity' || concern === 'redness') && strongActiveRoles.has(role)) {
          violations.push({ code: 'REACTION_STRONG_ACTIVE', day: day.day, slot, productIds: [product.id] });
        }
        if (slot === 'morning' && strongActiveRoles.has(role)) {
          violations.push({ code: 'STRONG_ACTIVE_IN_MORNING', day: day.day, slot, productIds: [product.id] });
        }
      }

      if (slot === 'evening') {
        const retinoids = products.filter(product => getProductRole(product) === 'retinol');
        const peelings = products.filter(product => getProductRole(product) === 'peeling');
        if (retinoids.length && peelings.length) {
          violations.push({
            code: 'STRONG_ACTIVE_CONFLICT',
            day: day.day,
            slot,
            productIds: [...retinoids, ...peelings].map(product => product.id),
          });
        }
      }
    }
  }

  return violations;
};
