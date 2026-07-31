import AsyncStorage from '@react-native-async-storage/async-storage';
export {
  buildNotifications,
  type AppNotification,
  type NotificationKind,
} from './notificationContent';

const READ_KEY = 'skinshelf.readNotificationIds';

const readKeyForUser = (userId: string | null | undefined) =>
  `${READ_KEY}.${userId ?? 'anonymous'}`;

export const getReadNotificationIds = async (
  userId?: string | null
): Promise<Set<string>> => {
  const raw = await AsyncStorage.getItem(readKeyForUser(userId));
  if (!raw) return new Set();
  try {
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
};

export const markNotificationRead = async (id: string, userId?: string | null) => {
  const ids = await getReadNotificationIds(userId);
  ids.add(id);
  const recentIds = [...ids].slice(-500);
  await AsyncStorage.setItem(readKeyForUser(userId), JSON.stringify(recentIds));
};

export const markAllNotificationsRead = async (ids: string[], userId?: string | null) => {
  const existing = await getReadNotificationIds(userId);
  ids.forEach(id => existing.add(id));
  const recentIds = [...existing].slice(-500);
  await AsyncStorage.setItem(readKeyForUser(userId), JSON.stringify(recentIds));
};

export const clearNotificationReadState = async (userId: string) => {
  await AsyncStorage.removeItem(readKeyForUser(userId));
};

export const countUnread = (
  notifications: import('./notificationContent').AppNotification[],
  readIds: Set<string>
) =>
  notifications.filter(n => !readIds.has(n.id)).length;
