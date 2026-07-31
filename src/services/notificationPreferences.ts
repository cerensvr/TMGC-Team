export const NOTIFICATION_PREFERENCES = {
  morningRoutine: 'Sabah rutinim için',
  eveningRoutine: 'Akşam rutinim için',
  productTracking: 'Ürün kullanım takibi için',
  weeklySummary: 'Haftalık cilt özeti için',
  expiry: 'Son kullanma tarihi yaklaşınca',
  none: 'Bildirim istemiyorum',
} as const;

export type NotificationPreference =
  (typeof NOTIFICATION_PREFERENCES)[keyof typeof NOTIFICATION_PREFERENCES];

export const hasNotificationPreference = (
  preferences: string[] | undefined,
  preference: NotificationPreference
) => (preferences ?? []).includes(preference);

export const hasEnabledNotificationPreference = (preferences: string[] | undefined) => {
  const selected = preferences ?? [];
  return selected.some((preference) => preference !== NOTIFICATION_PREFERENCES.none);
};
