import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appConfig = JSON.parse(readFileSync('app.json', 'utf8')).expo;

test('Android release manifesti yalnız kullanılan hassas izinleri kabul eder', () => {
  assert.deepEqual(appConfig.android.permissions, ['android.permission.CAMERA']);
  assert.deepEqual(appConfig.android.blockedPermissions, [
    'android.permission.RECORD_AUDIO',
    'android.permission.SYSTEM_ALERT_WINDOW',
    'android.permission.READ_EXTERNAL_STORAGE',
    'android.permission.WRITE_EXTERNAL_STORAGE',
  ]);
});

test('Image Picker mikrofon iznini devre dışı bırakır', () => {
  const imagePickerPlugin = appConfig.plugins.find(
    plugin => Array.isArray(plugin) && plugin[0] === 'expo-image-picker',
  );

  assert.equal(imagePickerPlugin?.[1]?.microphonePermission, false);
});
