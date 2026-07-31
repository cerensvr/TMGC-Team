import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const AUTH_TOKEN_KEY = 'skinshelf.authToken';
const AUTH_USER_ID_KEY = 'skinshelf.userId';

const isNative = Platform.OS === 'android' || Platform.OS === 'ios';
const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

let cachedToken: string | null | undefined;
let cachedUserId: string | null | undefined;
let hydrationPromise: Promise<void> | null = null;

const removeLegacySession = () =>
  AsyncStorage.multiRemove([AUTH_TOKEN_KEY, AUTH_USER_ID_KEY]);

const deleteSecureSession = async () => {
  if (!isNative) return;

  await Promise.all([
    SecureStore.deleteItemAsync(AUTH_TOKEN_KEY, secureStoreOptions),
    SecureStore.deleteItemAsync(AUTH_USER_ID_KEY, secureStoreOptions),
  ]);
};

const writeSecureSession = async (token: string, userId: string) => {
  if (!isNative) return;

  // The token is written last so a partially interrupted write never leaves a
  // usable credential without its matching user id.
  await SecureStore.setItemAsync(AUTH_USER_ID_KEY, userId, secureStoreOptions);
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token, secureStoreOptions);
};

const hydrateSession = async () => {
  if (cachedToken !== undefined && cachedUserId !== undefined) return;
  if (hydrationPromise) return hydrationPromise;

  hydrationPromise = (async () => {
    if (!isNative) {
      // Persisting bearer tokens in browser-accessible storage would expose
      // them to injected JavaScript. Web sessions intentionally live only for
      // the current page lifetime until cookie-based auth is introduced.
      cachedToken = null;
      cachedUserId = null;
      await removeLegacySession();
      return;
    }

    const [secureToken, secureUserId] = await Promise.all([
      SecureStore.getItemAsync(AUTH_TOKEN_KEY, secureStoreOptions),
      SecureStore.getItemAsync(AUTH_USER_ID_KEY, secureStoreOptions),
    ]);

    if (secureToken && secureUserId) {
      cachedToken = secureToken;
      cachedUserId = secureUserId;
      await removeLegacySession();
      return;
    }

    // Clear a partial secure-store write before checking for a legacy session.
    await deleteSecureSession();

    const legacyEntries = await AsyncStorage.multiGet([AUTH_TOKEN_KEY, AUTH_USER_ID_KEY]);
    const legacySession = Object.fromEntries(legacyEntries);
    const legacyToken = legacySession[AUTH_TOKEN_KEY];
    const legacyUserId = legacySession[AUTH_USER_ID_KEY];

    if (legacyToken && legacyUserId) {
      await writeSecureSession(legacyToken, legacyUserId);
      cachedToken = legacyToken;
      cachedUserId = legacyUserId;
    } else {
      cachedToken = null;
      cachedUserId = null;
    }

    await removeLegacySession();
  })().finally(() => {
    hydrationPromise = null;
  });

  return hydrationPromise;
};

export const saveAuthSession = async (token: string, userId: string) => {
  const normalizedToken = token.trim();
  const normalizedUserId = userId.trim();
  if (!normalizedToken || !normalizedUserId) {
    throw new Error('Geçerli bir oturum tokenı ve kullanıcı kimliği gereklidir.');
  }

  if (isNative) {
    await writeSecureSession(normalizedToken, normalizedUserId);
  }
  await removeLegacySession();

  cachedToken = normalizedToken;
  cachedUserId = normalizedUserId;
};

export const getAuthToken = async () => {
  await hydrateSession();
  return cachedToken ?? null;
};

export const getAuthUserId = async () => {
  await hydrateSession();
  return cachedUserId ?? null;
};

export const getCachedAuthUserId = () => cachedUserId ?? null;

export const clearAuthSession = async () => {
  cachedToken = null;
  cachedUserId = null;
  await Promise.all([deleteSecureSession(), removeLegacySession()]);
};
