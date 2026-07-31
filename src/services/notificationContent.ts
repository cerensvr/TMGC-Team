import type { UserProfile } from '../context/UserContext';
import type { Product } from '../types';
import { getRemainingDays } from './expiryDate';
import {
  hasNotificationPreference,
  NOTIFICATION_PREFERENCES,
} from './notificationPreferences';

export type NotificationKind = 'expiry' | 'routine' | 'weekly' | 'tip' | 'safety' | 'product';

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  timeLabel: string;
  productId?: string;
  priority: 'high' | 'normal' | 'low';
};

const shellyTips = [
  'Retinol ve peeling gibi güçlü aktifleri aynı gece kullanmamak cildini daha az yorabilir.',
  'Yeni bir ürünü yavaşça rutine eklemek, cildinin tepkisini anlamanı kolaylaştırır.',
  'Gündüz SPF kullanmak, akşam bakımını destekleyen en güzel alışkanlıklardan biri.',
  'Serumdan sonra nemlendirici uygulamak, rutininin daha dengeli hissettirmesine yardımcı olabilir.',
];

const localDateId = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getRoutineCopy = (
  now: Date,
  reminders: string[]
): Pick<AppNotification, 'title' | 'body'> | null => {
  const hour = now.getHours();
  const morningWindow =
    hour >= 5 &&
    hour < 12 &&
    hasNotificationPreference(reminders, NOTIFICATION_PREFERENCES.morningRoutine);
  const eveningWindow =
    hour >= 17 &&
    hour < 23 &&
    hasNotificationPreference(reminders, NOTIFICATION_PREFERENCES.eveningRoutine);
  const trackingWindow =
    !morningWindow &&
    !eveningWindow &&
    hasNotificationPreference(reminders, NOTIFICATION_PREFERENCES.productTracking);

  if (morningWindow) {
    return {
      title: '☀️ Günaydın! Cildin için mini bir mola',
      body: 'Sabah rutinin hazır. Birkaç dakikada birlikte tamamlayalım 💚',
    };
  }
  if (eveningWindow) {
    return {
      title: '🌙 Akşam bakım zamanı',
      body: 'Günü cildine küçük bir iyilik yaparak kapatalım ✨',
    };
  }
  if (trackingWindow) {
    return {
      title: '🧴 Bugünün ürünlerine göz atalım',
      body: 'Kullandığın ürünleri Rutinim’den hızlıca kontrol edebilirsin.',
    };
  }
  return null;
};

export const buildNotifications = (
  products: Product[],
  profile: UserProfile,
  activeIssue: string | null,
  now = new Date()
): AppNotification[] => {
  const items: AppNotification[] = [];
  const dateId = localDateId(now);
  const tipIndex = now.getDate() % shellyTips.length;

  products.forEach((product) => {
    const days = getRemainingDays(product.expiryDate, now);
    const productName = `${product.brand} ${product.name}`.trim();

    if (days !== null && days < 0) {
      items.push({
        id: `expired-${product.id}-${product.expiryDate}`,
        kind: 'expiry',
        title: '⚠️ Bu ürünü kontrol edelim',
        body: `${productName} ürününün SKT’si geçti. Güvenli kullanım için ürünü gözden geçirmeni öneririm.`,
        timeLabel: 'Bugün',
        productId: product.id,
        priority: 'high',
      });
    } else if (days !== null && days <= 60) {
      const remainingText =
        days === 0 ? 'SKT’si bugün doluyor' : days === 1 ? 'SKT’sine 1 gün kaldı' : `SKT’sine ${days} gün kaldı`;
      items.push({
        id: `expiring-${product.id}-${product.expiryDate}`,
        kind: 'expiry',
        title: '⏳ Ürünün için küçük bir hatırlatma',
        body: `${productName} ürününün ${remainingText.toLocaleLowerCase('tr-TR')}. Kullanım durumunu birlikte kontrol edelim.`,
        timeLabel: days <= 14 ? 'Yakında' : 'Bu ay',
        productId: product.id,
        priority: days <= 14 ? 'high' : 'normal',
      });
    }
  });

  const reminders = profile.reminderPreferences ?? [];
  const routineCopy = products.length > 0 ? getRoutineCopy(now, reminders) : null;
  if (routineCopy) {
    items.push({
      id: `routine-${dateId}`,
      kind: 'routine',
      title: routineCopy.title,
      body: routineCopy.body,
      timeLabel: 'Şimdi',
      priority: 'normal',
    });
  }

  if (
    now.getDay() === 0 &&
    hasNotificationPreference(reminders, NOTIFICATION_PREFERENCES.weeklySummary)
  ) {
    items.push({
      id: `weekly-${dateId}`,
      kind: 'weekly',
      title: '📊 Haftana birlikte bakalım',
      body: 'Cildindeki değişimleri ve haftalık özetini Cilt Takibi’nde görebilirsin.',
      timeLabel: 'Bu hafta',
      priority: 'normal',
    });
  }

  if (activeIssue) {
    items.push({
      id: `safe-${activeIssue}`,
      kind: 'safety',
      title: '🫶 Cildini biraz dinlendirelim',
      body: `${activeIssue} nedeniyle rutinin sadeleştirildi. Cildin rahatladığında Shelly ile yeniden değerlendirebiliriz.`,
      timeLabel: 'Aktif',
      priority: 'high',
    });
  }

  if (products.length === 0 && profile.isOnboarded) {
    items.push({
      id: 'empty-shelf',
      kind: 'product',
      title: '🧴 İlk ürününü birlikte ekleyelim',
      body: 'Barkodu okutabilir veya ürünü elle ekleyebilirsin. Shelly uyum kontrolünde yanında.',
      timeLabel: 'Öneri',
      priority: 'low',
    });
  }

  items.push({
    id: `tip-${dateId}`,
    kind: 'tip',
    title: '✨ Shelly’den minik bir ipucu',
    body: shellyTips[tipIndex],
    timeLabel: 'Günlük',
    priority: 'low',
  });

  const priorityOrder = { high: 0, normal: 1, low: 2 };
  return items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
};
