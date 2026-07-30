import React, { useCallback, useMemo, useState } from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  CalendarClock,
  CheckCheck,
  Lightbulb,
  Package,
  Sparkles,
} from 'lucide-react-native';
import { RootStackParamList } from '../types';
import { useProducts } from '../context/ProductContext';
import { useUser } from '../context/UserContext';
import {
  AppNotification,
  buildNotifications,
  countUnread,
  getReadNotificationIds,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notificationService';
import { errorDev } from '../services/logger';
import { colors, fonts, gradients, radius, shadows } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Notifications'>;
};

// Dokunma alanlarını genişletmek için standart hitSlop
const TOUCH_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

const kindMeta = {
  expiry: { icon: AlertTriangle, tint: colors.danger, bg: colors.dangerSurface },
  routine: { icon: CalendarClock, tint: colors.sage, bg: colors.surfaceSage },
  tip: { icon: Lightbulb, tint: colors.gold, bg: colors.warningSurface },
  safety: { icon: Sparkles, tint: colors.blush, bg: colors.surfaceBlush },
  product: { icon: Package, tint: colors.forest, bg: colors.surfaceMuted },
} as const;

const NotificationRow = ({
  item,
  unread,
  onPress,
}: {
  item: AppNotification;
  unread: boolean;
  onPress: () => void;
}) => {
  const meta = kindMeta[item.kind];
  const Icon = meta.icon;

  return (
    <TouchableOpacity
      style={[styles.row, unread && styles.rowUnread]}
      onPress={onPress}
      activeOpacity={0.82}
      hitSlop={TOUCH_SLOP}
      accessibilityRole="button"
      accessibilityLabel={`${item.title} bildirimi`}
    >
      <View style={[styles.rowIcon, { backgroundColor: meta.bg }]}>
        <Icon size={18} color={meta.tint} />
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.rowTime}>{item.timeLabel}</Text>
        </View>
        <Text style={styles.rowText}>{item.body}</Text>
      </View>
      {unread && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
};

export default function NotificationsScreen({ navigation }: Props) {
  const { products } = useProducts();
  const { profile, activeIssue } = useUser();
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const notifications = useMemo(
    () => buildNotifications(products, profile, activeIssue),
    [products, profile, activeIssue]
  );

  const unreadCount = countUnread(notifications, readIds);

  const refreshReadState = useCallback(async () => {
    try {
      setReadIds(await getReadNotificationIds());
    } catch (error) {
      errorDev('Failed to refresh notification read state:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshReadState();
    }, [refreshReadState])
  );

  const handleOpen = async (item: AppNotification) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      await markNotificationRead(item.id);
      setReadIds((prev) => new Set([...prev, item.id]));

      if (item.productId) {
        navigation.navigate('ProductDetail', { productId: item.productId });
        return;
      }
      if (item.kind === 'routine') {
        navigation.navigate('MainTabs');
        return;
      }
      if (item.kind === 'product' && products.length === 0) {
        navigation.navigate('Scanner');
        return;
      }
    } catch (error) {
      errorDev('Notification click error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkAll = async () => {
    if (unreadCount === 0 || isProcessing) return;
    setIsProcessing(true);

    try {
      await markAllNotificationsRead(notifications.map((n) => n.id));
      setReadIds(new Set(notifications.map((n) => n.id)));
    } catch (error) {
      errorDev('Mark all notifications read error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
          disabled={isProcessing}
          hitSlop={TOUCH_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Geri Dön"
        >
          <ArrowLeft size={21} color={colors.forest} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Bildirimler</Text>

        <TouchableOpacity
          style={[styles.markAllButton, (unreadCount === 0 || isProcessing) && styles.markAllDisabled]}
          onPress={handleMarkAll}
          disabled={unreadCount === 0 || isProcessing}
          activeOpacity={0.8}
          hitSlop={TOUCH_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Tümünü okundu işaretle"
        >
          <CheckCheck size={18} color={unreadCount === 0 ? colors.inkMuted : colors.sage} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* HERO CARD */}
        <LinearGradient colors={[...gradients.forest]} style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Bell size={22} color={colors.onDark} />
          </View>
          <View style={styles.heroTextBlock}>
            <Text style={styles.heroTitle}>
              {unreadCount > 0 ? `${unreadCount} yeni bildirim` : 'Hepsi okundu'}
            </Text>
            <Text style={styles.heroText}>
              SKT uyarıları, rutin hatırlatmaları ve Shelly ipuçları burada toplanır.
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>GÜNCEL</Text>
          <Text style={styles.sectionCount}>{notifications.length} bildirim</Text>
        </View>

        {/* BİLDİRİMLER LİSTESİ VEYA BOŞ BİLDİRİM DURUMU */}
        <View style={styles.listCard}>
          {notifications.length === 0 ? (
            /* BOŞ BİLDİRİM DURUMU (EMPTY STATE) */
            <View style={{ paddingVertical: 40, paddingHorizontal: 20, alignItems: 'center' }}>
              <Bell size={28} color={colors.sage} style={{ marginBottom: 10 }} />
              <Text
                style={{
                  fontFamily: fonts.display,
                  fontSize: 18,
                  color: colors.forest,
                  marginBottom: 4,
                }}
              >
                Henüz Bildirimin Yok
              </Text>
              <Text
                style={{
                  fontFamily: fonts.sansSemiBold,
                  fontSize: 13,
                  color: colors.inkSoft,
                  textAlign: 'center',
                }}
              >
                SKT uyarıları, rutin hatırlatmaları ve Shelly ipuçları burada görünecektir.
              </Text>
            </View>
          ) : (
            /* BİLDİRİM SATIRLARI */
            notifications.map((item, index) => (
              <View key={item.id}>
                <NotificationRow
                  item={item}
                  unread={!readIds.has(item.id)}
                  onPress={() => handleOpen(item)}
                />
                {index < notifications.length - 1 && <View style={styles.divider} />}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const androidHeaderPadding = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 14 : 16;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingTop: androidHeaderPadding,
    paddingBottom: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.soft,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.ink,
  },
  markAllButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceSage,
    borderWidth: 1,
    borderColor: colors.lineSage,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markAllDisabled: { opacity: 0.45 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  heroCard: {
    borderRadius: radius.xl,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
    ...shadows.card,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  heroTextBlock: { flex: 1 },
  heroTitle: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 17,
    color: colors.onDark,
    marginBottom: 4,
  },
  heroText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    color: colors.onDarkSoft,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionLabel: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 11,
    letterSpacing: 1.4,
    color: colors.sage,
  },
  sectionCount: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: colors.inkMuted,
  },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    ...shadows.soft,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 12,
  },
  rowUnread: { backgroundColor: 'rgba(237,242,236,0.45)' },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowBody: { flex: 1 },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  rowTitle: {
    flex: 1,
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.ink,
  },
  rowTime: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    color: colors.inkMuted,
  },
  rowText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkSoft,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gold,
    marginTop: 6,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginLeft: 68,
  },
});
