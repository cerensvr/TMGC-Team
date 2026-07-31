import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Product } from '../types';
import { getRemainingDays, parseExpiryDate } from './expiryDate';
import { warnDev } from './logger';
import {
  hasEnabledNotificationPreference,
  hasNotificationPreference,
  NOTIFICATION_PREFERENCES,
} from './notificationPreferences';

const ROUTINE_MORNING_ID = 'skinshelf.routine.morning';
const ROUTINE_EVENING_ID = 'skinshelf.routine.evening';
const PRODUCT_TRACKING_ID = 'skinshelf.product.tracking';
const WEEKLY_SUMMARY_ID = 'skinshelf.skin.weekly';
const EXPIRY_ID_PREFIX = 'skinshelf.expiry.';
const OWNED_ID_PREFIX = 'skinshelf.';
const ANDROID_CHANNEL_ID = 'skinshelf-default';
const EXPIRY_STATE_KEY = 'skinshelf.expiryNotificationState.v2';

type NotificationDestination =
  | { screen: 'Routine' }
  | { screen: 'SkinTracking' }
  | { screen: 'ProductDetail'; params: { productId: string } };

type ExpiryReminderState = Record<string, string[]>;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const notificationScope = (userId?: string | null) => userId ?? 'anonymous';

const readExpiryReminderState = async (): Promise<ExpiryReminderState> => {
  const raw = await AsyncStorage.getItem(EXPIRY_STATE_KEY);
  if (!raw) return {};

  try {
    return JSON.parse(raw) as ExpiryReminderState;
  } catch {
    return {};
  }
};

const writeExpiryReminderState = async (state: ExpiryReminderState) => {
  if (Object.keys(state).length === 0) {
    await AsyncStorage.removeItem(EXPIRY_STATE_KEY);
    return;
  }
  await AsyncStorage.setItem(EXPIRY_STATE_KEY, JSON.stringify(state));
};

const clearExpiryReminderState = async (userId?: string | null) => {
  if (userId === undefined) {
    await AsyncStorage.removeItem(EXPIRY_STATE_KEY);
    return;
  }

  const state = await readExpiryReminderState();
  delete state[notificationScope(userId)];
  await writeExpiryReminderState(state);
};

/** İzin reddedilirse false döner; uygulama çökmeden normal çalışmaya devam eder. */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;

  try {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted) return true;

    const request = await Notifications.requestPermissionsAsync();
    return request.granted;
  } catch {
    return false;
  }
};

const ensureAndroidChannel = async () => {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'SkinShelf Hatırlatmaları',
    description: 'Rutin, cilt takibi ve ürün son kullanma tarihi hatırlatmaları',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
    vibrationPattern: [0, 180, 120, 180],
  });
};

const androidChannel = () =>
  Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {};

const cancelIfExists = async (id: string) => {
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
};

const getOwnedScheduledNotifications = async () => {
  if (Platform.OS === 'web') return [];
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.filter((notification) => notification.identifier.startsWith(OWNED_ID_PREFIX));
};

const cancelExpiryNotifications = async () => {
  const scheduled = await getOwnedScheduledNotifications();
  await Promise.all(
    scheduled
      .filter((notification) => notification.identifier.startsWith(EXPIRY_ID_PREFIX))
      .map((notification) => cancelIfExists(notification.identifier))
  );
};

/**
 * SkinShelf'in cihazda planladığı bütün bildirimleri ve SKT tekrar korumasını
 * temizler. Çıkış, hesap silme ve tüm tercihlerin kapatılması sırasında kullanılır.
 */
export const clearScheduledNotifications = async (userId?: string | null) => {
  try {
    const scheduled = await getOwnedScheduledNotifications();
    await Promise.all(
      scheduled.map((notification) => cancelIfExists(notification.identifier))
    );
    await clearExpiryReminderState(userId);
  } catch (error) {
    warnDev('Planlanmış bildirimler temizlenemedi:', error);
  }
};

const scheduleDailyReminder = async (
  id: string,
  hour: number,
  title: string,
  body: string,
  screen: 'Routine'
) => {
  await cancelIfExists(id);
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title,
      body,
      sound: 'default',
      data: { screen },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute: 0,
      ...androidChannel(),
    },
  });
};

const scheduleWeeklyReminder = async () => {
  await cancelIfExists(WEEKLY_SUMMARY_ID);
  await Notifications.scheduleNotificationAsync({
    identifier: WEEKLY_SUMMARY_ID,
    content: {
      title: '📊 Haftana birlikte bakalım',
      body: 'Cildindeki değişimleri ve haftalık özetini Cilt Takibi’nde görebilirsin.',
      sound: 'default',
      data: { screen: 'SkinTracking' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1,
      hour: 18,
      minute: 0,
      ...androidChannel(),
    },
  });
};

/** Sabah, akşam, ürün takibi ve haftalık özet tercihlerini cihazla eşitler. */
export const syncRoutineReminders = async (
  reminderPreferences: string[] = [],
  hasProducts = true
) => {
  const tasks: Promise<unknown>[] = [];

  if (
    hasProducts &&
    hasNotificationPreference(
      reminderPreferences,
      NOTIFICATION_PREFERENCES.morningRoutine
    )
  ) {
    tasks.push(
      scheduleDailyReminder(
        ROUTINE_MORNING_ID,
        9,
        '☀️ Günaydın! Cildin için mini bir mola',
        'Sabah rutinin hazır. Birkaç dakikada birlikte tamamlayalım 💚',
        'Routine'
      )
    );
  } else {
    tasks.push(cancelIfExists(ROUTINE_MORNING_ID));
  }

  if (
    hasProducts &&
    hasNotificationPreference(
      reminderPreferences,
      NOTIFICATION_PREFERENCES.eveningRoutine
    )
  ) {
    tasks.push(
      scheduleDailyReminder(
        ROUTINE_EVENING_ID,
        20,
        '🌙 Akşam bakım zamanı',
        'Günü cildine küçük bir iyilik yaparak kapatalım ✨',
        'Routine'
      )
    );
  } else {
    tasks.push(cancelIfExists(ROUTINE_EVENING_ID));
  }

  if (
    hasProducts &&
    hasNotificationPreference(
      reminderPreferences,
      NOTIFICATION_PREFERENCES.productTracking
    )
  ) {
    tasks.push(
      scheduleDailyReminder(
        PRODUCT_TRACKING_ID,
        21,
        '🧴 Bugünün ürünlerine göz atalım',
        'Kullandığın ürünleri Rutinim’den hızlıca kontrol edebilirsin.',
        'Routine'
      )
    );
  } else {
    tasks.push(cancelIfExists(PRODUCT_TRACKING_ID));
  }

  if (
    hasNotificationPreference(
      reminderPreferences,
      NOTIFICATION_PREFERENCES.weeklySummary
    )
  ) {
    tasks.push(scheduleWeeklyReminder());
  } else {
    tasks.push(cancelIfExists(WEEKLY_SUMMARY_ID));
  }

  const results = await Promise.allSettled(tasks);
  results.forEach((result) => {
    if (result.status === 'rejected') {
      warnDev('Rutin bildirimi planlanamadı:', result.reason);
    }
  });
};

const expiryReminderKey = (product: Product) =>
  `${product.id}:${product.expiryDate ?? 'unknown'}`;

const nextExpiryReminderDate = (expiryDate: Date, now = new Date()) => {
  const nextAtTen = new Date(now);
  nextAtTen.setHours(10, 0, 0, 0);
  if (nextAtTen.getTime() <= now.getTime()) {
    nextAtTen.setDate(nextAtTen.getDate() + 1);
  }

  if (nextAtTen.getTime() <= expiryDate.getTime()) {
    return nextAtTen;
  }

  return new Date(now.getTime() + 60 * 1000);
};

const expiryBody = (product: Product, days: number) => {
  const productName = `${product.brand} ${product.name}`.trim();
  if (days === 0) {
    return `${productName} ürününün SKT’si bugün doluyor. Kullanım durumunu birlikte kontrol edelim.`;
  }
  if (days === 1) {
    return `${productName} ürününün SKT’sine 1 gün kaldı. Küçük bir kontrol iyi olabilir.`;
  }
  return `${productName} ürününün SKT’sine ${days} gün kaldı. Rafını birlikte gözden geçirelim.`;
};

/**
 * SKT'si 0-60 gün içinde olan her ürün için yalnızca bir kez cihaz bildirimi
 * planlar. Uygulamanın yeniden açılması aynı bildirimi ileri tarihe taşımaz.
 */
export const syncExpiryReminders = async (
  reminderPreferences: string[],
  products: Product[],
  userId?: string | null
) => {
  const wantsExpiryReminder = hasNotificationPreference(
    reminderPreferences,
    NOTIFICATION_PREFERENCES.expiry
  );

  if (!wantsExpiryReminder) {
    await cancelExpiryNotifications();
    await clearExpiryReminderState(userId);
    return;
  }

  const state = await readExpiryReminderState();
  const scope = notificationScope(userId);
  const rememberedKeys = new Set(state[scope] ?? []);
  const currentProductKeys = new Set(
    products.filter((product) => product.expiryDate).map(expiryReminderKey)
  );
  const nextRememberedKeys = new Set(
    [...rememberedKeys].filter((key) => currentProductKeys.has(key))
  );

  const scheduled = await getOwnedScheduledNotifications();
  const scheduledExpiryById = new Map(
    scheduled
      .filter((notification) => notification.identifier.startsWith(EXPIRY_ID_PREFIX))
      .map((notification) => [notification.identifier, notification])
  );
  const eligibleIds = new Set<string>();

  for (const product of products) {
    const days = getRemainingDays(product.expiryDate);
    const expiryDate = parseExpiryDate(product.expiryDate);
    const identifier = `${EXPIRY_ID_PREFIX}${product.id}`;
    const reminderKey = expiryReminderKey(product);

    if (days === null || !expiryDate || days < 0 || days > 60) {
      continue;
    }

    eligibleIds.add(identifier);
    const existing = scheduledExpiryById.get(identifier);
    const existingKey = existing?.content.data?.expiryReminderKey;

    if (existing && existingKey === reminderKey) {
      nextRememberedKeys.add(reminderKey);
      continue;
    }

    if (existing) {
      await cancelIfExists(identifier);
    }

    if (nextRememberedKeys.has(reminderKey)) {
      continue;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title: '⏳ Ürünün için küçük bir hatırlatma',
          body: expiryBody(product, days),
          sound: 'default',
          data: {
            screen: 'ProductDetail',
            productId: product.id,
            expiryReminderKey: reminderKey,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: nextExpiryReminderDate(expiryDate),
          ...androidChannel(),
        },
      });
      nextRememberedKeys.add(reminderKey);
    } catch (error) {
      warnDev(`${product.name} için SKT bildirimi planlanamadı:`, error);
    }
  }

  await Promise.all(
    [...scheduledExpiryById.keys()]
      .filter((identifier) => !eligibleIds.has(identifier))
      .map(cancelIfExists)
  );

  if (nextRememberedKeys.size > 0) {
    state[scope] = [...nextRememberedKeys];
  } else {
    delete state[scope];
  }
  await writeExpiryReminderState(state);
};

export const syncAllNotifications = async (
  reminderPreferences: string[] | undefined,
  products: Product[],
  userId?: string | null
) => {
  const preferences = reminderPreferences ?? [];
  const explicitlyDisabled = hasNotificationPreference(
    preferences,
    NOTIFICATION_PREFERENCES.none
  );

  if (explicitlyDisabled || !hasEnabledNotificationPreference(preferences)) {
    await clearScheduledNotifications(userId);
    return;
  }

  try {
    await ensureAndroidChannel();
    const granted = await requestNotificationPermissions();
    if (!granted) {
      await clearScheduledNotifications(userId);
      return;
    }
  } catch (error) {
    warnDev('Bildirim izni veya kanalı hazırlanamadı:', error);
    await clearScheduledNotifications(userId);
    return;
  }

  await syncRoutineReminders(preferences, products.length > 0);
  await syncExpiryReminders(preferences, products, userId).catch((error) => {
    warnDev('SKT bildirimleri eşitlenemedi:', error);
  });
};

/** Bildirime dokununca doğru ekrana yönlendirir. */
export const attachNotificationResponseListener = (
  onNavigate: (destination: NotificationDestination) => void
) => {
  const navigateFromResponse = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;

    if (data?.screen === 'Routine') {
      onNavigate({ screen: 'Routine' });
      return;
    }

    if (data?.screen === 'SkinTracking') {
      onNavigate({ screen: 'SkinTracking' });
      return;
    }

    if (data?.screen === 'ProductDetail' && typeof data.productId === 'string') {
      onNavigate({ screen: 'ProductDetail', params: { productId: data.productId } });
    }
  };

  const subscription =
    Notifications.addNotificationResponseReceivedListener(navigateFromResponse);
  const lastResponse = Notifications.getLastNotificationResponse();
  if (lastResponse) {
    navigateFromResponse(lastResponse);
    Notifications.clearLastNotificationResponse();
  }

  return () => subscription.remove();
};
