import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Product } from '../types';

const ROUTINE_MORNING_ID = 'skinshelf.routine.morning';
const ROUTINE_EVENING_ID = 'skinshelf.routine.evening';
const EXPIRY_ID_PREFIX = 'skinshelf.expiry.';
const ANDROID_CHANNEL_ID = 'skinshelf-default';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** İzin reddedilirse false döner; uygulama çökmeden normal çalışmaya devam eder. */
export const requestNotificationPermissions = async (): Promise<boolean> => {
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
    importance: Notifications.AndroidImportance.DEFAULT,
  });
};

const cancelIfExists = async (id: string) => {
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
};

const scheduleDailyReminder = async (id: string, hour: number, title: string, body: string, screen: string) => {
  await cancelIfExists(id);
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title, body, data: { screen } },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour,
      minute: 0,
      repeats: true,
    },
  });
};

/**
 * Sabah/akşam rutin hatırlatmalarını kullanıcı tercihine göre planlar.
 * Her çağrıda önce mevcut planı iptal edip yeniden kurar; böylece hem çift
 * bildirim oluşmaz hem de tercih kapatılınca ilgili hatırlatma otomatik silinir.
 */
export const syncRoutineReminders = async (reminderPreferences: string[] = []) => {
  const granted = await requestNotificationPermissions();
  if (!granted) return;
  await ensureAndroidChannel();

  if (reminderPreferences.includes('Sabah rutinim için')) {
    await scheduleDailyReminder(
      ROUTINE_MORNING_ID,
      9,
      'Sabah rutinin seni bekliyor',
      'Bugünkü sabah adımlarını Rutinim sekmesinden kontrol edebilirsin.',
      'Routine'
    );
  } else {
    await cancelIfExists(ROUTINE_MORNING_ID);
  }

  if (reminderPreferences.includes('Akşam rutinim için')) {
    await scheduleDailyReminder(
      ROUTINE_EVENING_ID,
      20,
      'Akşam rutinin seni bekliyor',
      'Günü kapatmadan önce akşam adımlarını tamamlayabilirsin.',
      'Routine'
    );
  } else {
    await cancelIfExists(ROUTINE_EVENING_ID);
  }
};

const getRemainingDays = (dateString?: string) => {
  if (!dateString) return null;
  const expiry = new Date(dateString);
  const now = new Date();
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

/**
 * SKT'si yaklaşan (0-60 gün kalan) ürünler için tek seferlik bildirim planlar.
 * Önce bu uygulamanın daha önce planladığı tüm SKT bildirimlerini temizler,
 * sonra güncel rafa göre yeniden kurar — hem duplicate önlenir hem rafından
 * kaldırılan bir ürünün bildirimi otomatik iptal edilmiş olur.
 */
export const syncExpiryReminders = async (products: Product[]) => {
  const granted = await requestNotificationPermissions();
  if (!granted) return;
  await ensureAndroidChannel();

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(n => n.identifier.startsWith(EXPIRY_ID_PREFIX))
      .map(n => cancelIfExists(n.identifier))
  );

  for (const product of products) {
    const days = getRemainingDays(product.expiryDate);
    if (days === null || days <= 0 || days > 60) continue;

    const triggerDate = new Date();
    triggerDate.setDate(triggerDate.getDate() + 1);
    triggerDate.setHours(10, 0, 0, 0);

    await Notifications.scheduleNotificationAsync({
      identifier: `${EXPIRY_ID_PREFIX}${product.id}`,
      content: {
        title: 'SKT yaklaşıyor',
        body: `${product.brand} ${product.name} için ${days} gün kaldı.`,
        data: { screen: 'ProductDetail', productId: product.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
  }
};

export const syncAllNotifications = async (reminderPreferences: string[] | undefined, products: Product[]) => {
  await syncRoutineReminders(reminderPreferences ?? []);
  await syncExpiryReminders(products);
};

/** Bildirime dokununca doğru ekrana yönlendirir. */
export const attachNotificationResponseListener = (
  onNavigate: (screen: string, params?: Record<string, unknown>) => void
) => {
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data as { screen?: string; productId?: string };
    if (!data?.screen) return;
    onNavigate(data.screen, data.productId ? { productId: data.productId } : undefined);
  });
  return () => subscription.remove();
};