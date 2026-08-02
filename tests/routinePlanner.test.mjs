import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import ts from 'typescript';

const cache = new Map();

const loadTypeScriptModule = filePath => {
  const absolutePath = resolve(filePath);
  if (cache.has(absolutePath)) return cache.get(absolutePath).exports;

  const module = { exports: {} };
  cache.set(absolutePath, module);
  const compiled = ts.transpileModule(readFileSync(absolutePath, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const localRequire = specifier => {
    const dependencyPath = resolve(dirname(absolutePath), specifier);
    return loadTypeScriptModule(dependencyPath.endsWith('.ts') ? dependencyPath : `${dependencyPath}.ts`);
  };

  new Function('exports', 'require', 'module', compiled)(module.exports, localRequire, module);
  return module.exports;
};

const { buildWeekPlan } = loadTypeScriptModule('src/services/routinePlanner.ts');
const { getProductRole } = loadTypeScriptModule('src/services/shellyInsights.ts');
const { validateRoutinePlan } = loadTypeScriptModule('src/services/routineSafetyPolicy.ts');

const product = (id, name, category, timeOfDay, activeIngredients = []) => ({
  id,
  name,
  brand: 'Demo',
  category,
  timeOfDay,
  activeIngredients,
  description: '',
  imageUrl: '',
  addedDate: '2026-08-02',
  expiryDate: null,
});

const products = [
  product('cleanser', 'Temizleyici', 'Temizleyici', 'both'),
  product('bha', '%2 BHA', 'Serum', 'evening', ['Salicylic Acid', 'BHA']),
  product('retinol', 'Retinol 0.2%', 'Serum', 'evening', ['Retinol']),
  product('moisturizer', 'Bariyer Kremi', 'Nemlendirici', 'both', ['Panthenol']),
  product('spf', 'SPF 50+', 'Güneş Kremi', 'morning', ['SPF']),
];

test('BHA ve retinol haftalık planda aynı geceye konmaz', () => {
  const plan = buildWeekPlan(products, 'acne');

  for (const day of plan) {
    const roles = day.evening.map(getProductRole);
    assert.equal(roles.includes('retinol') && roles.includes('peeling'), false, day.day);
  }
});

test('retinol pazartesi, BHA perşembe gecesine yerleşir', () => {
  const plan = buildWeekPlan(products, 'acne');

  assert.equal(plan[0].evening.some(item => getProductRole(item) === 'retinol'), true);
  assert.equal(plan[0].evening.some(item => getProductRole(item) === 'peeling'), false);
  assert.equal(plan[3].evening.some(item => getProductRole(item) === 'peeling'), true);
  assert.equal(plan[3].evening.some(item => getProductRole(item) === 'retinol'), false);
});

test('aktif geceleri dışındaki akşamlar bariyer odaklı kalır', () => {
  const plan = buildWeekPlan(products, 'acne');

  for (const index of [1, 2, 4, 6]) {
    const roles = plan[index].evening.map(getProductRole);
    assert.equal(roles.includes('retinol'), false, plan[index].day);
    assert.equal(roles.includes('peeling'), false, plan[index].day);
  }
});

test('plan deterministik güvenlik doğrulamasından ihlalsiz geçer', () => {
  const plan = buildWeekPlan(products, 'acne');
  assert.deepEqual(validateRoutinePlan(plan, 'acne'), []);
});

test('gebelik bilgisinde retinol hiçbir güne eklenmez', () => {
  const plan = buildWeekPlan(products, 'standard', { isPregnant: true });
  const scheduledRoles = plan.flatMap(day => [...day.morning, ...day.evening]).map(getProductRole);

  assert.equal(scheduledRoles.includes('retinol'), false);
  assert.deepEqual(validateRoutinePlan(plan, 'standard', { isPregnant: true }), []);
});

test('hassasiyet rutininde retinol ve peeling yerine sade plan üretilir', () => {
  const plan = buildWeekPlan(products, 'sensitivity');
  const scheduledRoles = plan.flatMap(day => [...day.morning, ...day.evening]).map(getProductRole);

  assert.equal(scheduledRoles.includes('retinol'), false);
  assert.equal(scheduledRoles.includes('peeling'), false);
  assert.deepEqual(validateRoutinePlan(plan, 'sensitivity'), []);
});

test('son kullanma tarihi geçmiş ürün plan dışında kalır', () => {
  const expired = {
    ...product('expired', 'Eski Nemlendirici', 'Nemlendirici', 'both', ['Panthenol']),
    expiryDate: '2025-01',
  };
  const plan = buildWeekPlan([...products, expired], 'standard');

  assert.equal(plan.some(day => [...day.morning, ...day.evening].some(item => item.id === expired.id)), false);
  assert.deepEqual(validateRoutinePlan(plan, 'standard'), []);
});
