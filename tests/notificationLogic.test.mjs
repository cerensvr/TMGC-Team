import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import ts from 'typescript';

const nodeRequire = createRequire(import.meta.url);
const moduleCache = new Map();

const loadTypeScriptModule = (filePath) => {
  const absolutePath = resolve(filePath);
  if (moduleCache.has(absolutePath)) return moduleCache.get(absolutePath).exports;

  const module = { exports: {} };
  moduleCache.set(absolutePath, module);
  const source = readFileSync(absolutePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: absolutePath,
  }).outputText;

  const localRequire = (specifier) => {
    if (!specifier.startsWith('.')) return nodeRequire(specifier);
    const dependencyPath = resolve(dirname(absolutePath), specifier);
    return loadTypeScriptModule(
      dependencyPath.endsWith('.ts') ? dependencyPath : `${dependencyPath}.ts`
    );
  };

  const execute = new Function('exports', 'require', 'module', '__filename', '__dirname', compiled);
  execute(module.exports, localRequire, module, absolutePath, dirname(absolutePath));
  return module.exports;
};

const expiryDates = loadTypeScriptModule('src/services/expiryDate.ts');
const notificationPreferences = loadTypeScriptModule(
  'src/services/notificationPreferences.ts'
);
const notificationContent = loadTypeScriptModule(
  'src/services/notificationContent.ts'
);

const baseProfile = {
  skinType: 'Karma',
  gender: null,
  isPregnant: false,
  conditions: [],
  allergens: [],
  isOnboarded: true,
};

const sampleProduct = {
  id: 'product-1',
  name: 'Nemlendirici',
  brand: 'SkinShelf',
  category: 'Nemlendirici',
  timeOfDay: 'both',
  imageUrl: '',
  description: '',
  expiryDate: '2026-08',
};

test('YYYY-AA SKT ayın son günü olarak yorumlanır', () => {
  const parsed = expiryDates.parseExpiryDate('2028-02');
  assert.equal(parsed.getFullYear(), 2028);
  assert.equal(parsed.getMonth(), 1);
  assert.equal(parsed.getDate(), 29);
  assert.equal(
    expiryDates.getRemainingDays('2026-08', new Date(2026, 6, 31, 12)),
    31
  );
  assert.equal(expiryDates.parseExpiryDate('2026-13'), null);
});

test('bildirim istemiyorum seçimi aktif tercih sayılmaz', () => {
  const { NOTIFICATION_PREFERENCES } = notificationPreferences;
  assert.equal(
    notificationPreferences.hasEnabledNotificationPreference([
      NOTIFICATION_PREFERENCES.none,
    ]),
    false
  );
  assert.equal(
    notificationPreferences.hasEnabledNotificationPreference([
      NOTIFICATION_PREFERENCES.morningRoutine,
    ]),
    true
  );
});

test('sabah rutin bildirimi sıcak bir dil ve günlük benzersiz kimlik kullanır', () => {
  const { NOTIFICATION_PREFERENCES } = notificationPreferences;
  const profile = {
    ...baseProfile,
    reminderPreferences: [NOTIFICATION_PREFERENCES.morningRoutine],
  };
  const firstDay = notificationContent.buildNotifications(
    [sampleProduct],
    profile,
    null,
    new Date(2026, 6, 31, 9)
  );
  const nextDay = notificationContent.buildNotifications(
    [sampleProduct],
    profile,
    null,
    new Date(2026, 7, 1, 9)
  );

  const routine = firstDay.find((item) => item.kind === 'routine');
  assert.match(routine.title, /^☀️/);
  assert.match(routine.body, /birlikte/);
  assert.notEqual(
    firstDay.find((item) => item.kind === 'tip').id,
    nextDay.find((item) => item.kind === 'tip').id
  );
});

test('haftalık özet yalnızca pazar günü bildirim merkezinde görünür', () => {
  const { NOTIFICATION_PREFERENCES } = notificationPreferences;
  const profile = {
    ...baseProfile,
    reminderPreferences: [NOTIFICATION_PREFERENCES.weeklySummary],
  };
  const sunday = notificationContent.buildNotifications(
    [sampleProduct],
    profile,
    null,
    new Date(2026, 7, 2, 18)
  );
  const monday = notificationContent.buildNotifications(
    [sampleProduct],
    profile,
    null,
    new Date(2026, 7, 3, 18)
  );

  assert.ok(sunday.some((item) => item.kind === 'weekly'));
  assert.ok(!monday.some((item) => item.kind === 'weekly'));
});

test('Android rutin zamanlayıcısı desteklenen DAILY tetikleyicisini kullanır', () => {
  const schedulerSource = readFileSync('src/services/notificationScheduler.ts', 'utf8');
  assert.match(schedulerSource, /SchedulableTriggerInputTypes\.DAILY/);
  assert.match(schedulerSource, /SchedulableTriggerInputTypes\.WEEKLY/);
  assert.doesNotMatch(schedulerSource, /SchedulableTriggerInputTypes\.CALENDAR/);
  assert.match(schedulerSource, /channelId: ANDROID_CHANNEL_ID/);
});
