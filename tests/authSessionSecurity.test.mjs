import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const compileAuthSession = ({ platform = 'ios', legacyEntries = {}, secureEntries = {} } = {}) => {
  const legacy = new Map(Object.entries(legacyEntries));
  const secure = new Map(Object.entries(secureEntries));
  const asyncStorage = {
    multiGet: async keys => keys.map(key => [key, legacy.get(key) ?? null]),
    multiRemove: async keys => keys.forEach(key => legacy.delete(key)),
  };
  const secureStore = {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
    getItemAsync: async key => secure.get(key) ?? null,
    setItemAsync: async (key, value) => secure.set(key, value),
    deleteItemAsync: async key => secure.delete(key),
  };

  const source = readFileSync('src/services/authSession.ts', 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  const mocks = {
    '@react-native-async-storage/async-storage': { __esModule: true, default: asyncStorage },
    'expo-secure-store': secureStore,
    'react-native': { Platform: { OS: platform } },
  };
  const localRequire = specifier => {
    if (!(specifier in mocks)) throw new Error(`Unexpected module: ${specifier}`);
    return mocks[specifier];
  };

  const execute = new Function('exports', 'require', 'module', compiled);
  execute(module.exports, localRequire, module);
  return { authSession: module.exports, legacy, secure };
};

test('native oturum yalnız SecureStore içine yazılır', async () => {
  const { authSession, legacy, secure } = compileAuthSession();

  await authSession.saveAuthSession('signed.jwt.token', '42');

  assert.equal(secure.get('skinshelf.authToken'), 'signed.jwt.token');
  assert.equal(secure.get('skinshelf.userId'), '42');
  assert.equal(legacy.size, 0);
  assert.equal(await authSession.getAuthToken(), 'signed.jwt.token');
});

test('eski AsyncStorage oturumu ilk okumada SecureStore alanına taşınır', async () => {
  const { authSession, legacy, secure } = compileAuthSession({
    legacyEntries: {
      'skinshelf.authToken': 'legacy.jwt.token',
      'skinshelf.userId': '7',
    },
  });

  assert.equal(await authSession.getAuthToken(), 'legacy.jwt.token');
  assert.equal(await authSession.getAuthUserId(), '7');
  assert.equal(secure.get('skinshelf.authToken'), 'legacy.jwt.token');
  assert.equal(secure.get('skinshelf.userId'), '7');
  assert.equal(legacy.size, 0);
});

test('web oturumu browser depolamasına kalıcı olarak yazılmaz', async () => {
  const { authSession, legacy, secure } = compileAuthSession({ platform: 'web' });

  await authSession.saveAuthSession('page-only.jwt.token', '9');

  assert.equal(await authSession.getAuthToken(), 'page-only.jwt.token');
  assert.equal(legacy.size, 0);
  assert.equal(secure.size, 0);
});

test('çıkış hem güvenli hem eski oturum alanlarını temizler', async () => {
  const { authSession, legacy, secure } = compileAuthSession({
    legacyEntries: {
      'skinshelf.authToken': 'legacy-token',
      'skinshelf.userId': '5',
    },
    secureEntries: {
      'skinshelf.authToken': 'secure-token',
      'skinshelf.userId': '5',
    },
  });

  await authSession.clearAuthSession();

  assert.equal(legacy.size, 0);
  assert.equal(secure.size, 0);
  assert.equal(await authSession.getAuthToken(), null);
});
