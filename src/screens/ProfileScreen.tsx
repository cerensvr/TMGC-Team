import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { ChevronRight, Settings, Shield, CircleHelp, FileText, LogOut, Sparkles, Trash2 } from 'lucide-react-native';
import { authService } from '../services/authService';
import { useUser } from '../context/UserContext';
import { useProducts } from '../context/ProductContext';
import { errorDev } from '../services/logger';
import { clearNotificationReadState } from '../services/notificationService';
import { clearScheduledNotifications } from '../services/notificationScheduler';
import { LEGAL_DOCUMENT_URLS } from '../services/legalDocuments';
import { colors, fonts, radius, shadows } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MainTabs'>;
};

// Dokunma alanlarını genişletmek için standart hitSlop
const TOUCH_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

export default function ProfileScreen({ navigation }: Props) {
  const { profile, account, clearProfile, userId } = useUser();
  const { products, clearProducts } = useProducts();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const isProcessing = isLoggingOut || isDeletingAccount;

  const openDocument = async (title: string, url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(title, 'Belge şu anda açılamadı. İnternet bağlantını kontrol edip tekrar dene.');
    }
  };

  const fullName =
    [account?.firstName, account?.lastName].filter(Boolean).join(' ').trim() ||
    profile.displayName?.trim() ||
    'SkinShelf Kullanıcısı';
  const email = account?.email || '';
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('tr-TR'))
    .join('');

  // ÇIKIŞ YAPMA İŞLEMİ
  const handleLogout = async () => {
    if (isProcessing) return;

    setIsLoggingOut(true);
    try {
      await clearScheduledNotifications(userId);
      await authService.logout();
      clearProfile();
      clearProducts();
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (error: any) {
      errorDev('Logout error:', error);
      let userMsg = 'Çıkış yapılırken bir hata oluştu. Lütfen tekrar deneyin.';
      if (error?.message?.toLowerCase().includes('network') || error?.code === 'ERR_NETWORK') {
        userMsg = 'İnternet bağlantınızı kontrol edip tekrar deneyin.';
      }
      Alert.alert('Hata', userMsg);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // HESAP VE VERİLERİ SİLME İŞLEMİ
  const handleDeleteAccount = () => {
    if (isProcessing) return;

    Alert.alert(
      'Hesabı ve Verileri Sil',
      'Bu işlem hesabını, cilt profilini, ürünlerini, Shelly sohbet geçmişini ve cilt takip kayıtlarını kalıcı olarak siler. Geri alınamaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kalıcı Olarak Sil',
          style: 'destructive',
          onPress: async () => {
            setIsDeletingAccount(true);
            try {
              await authService.deleteAccount();
              await clearScheduledNotifications(userId);
              if (userId) {
                await clearNotificationReadState(userId);
              }
              clearProfile();
              clearProducts();
              navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            } catch (error: any) {
              errorDev('Delete account error:', error);
              let userMsg = 'Hesap silinirken bir sorun oluştu. Lütfen tekrar deneyin.';
              if (error?.message?.toLowerCase().includes('network') || error?.code === 'ERR_NETWORK') {
                userMsg = 'İnternet bağlantınızı kontrol edip tekrar deneyin.';
              }
              Alert.alert('Hata', userMsg);
            } finally {
              setIsDeletingAccount(false);
            }
          },
        },
      ]
    );
  };

  const menuItems = [
    {
      icon: Settings,
      label: 'Hesap Ayarları',
      onPress: () => navigation.navigate('AccountSettings'),
    },
    {
      icon: Shield,
      label: 'Gizlilik Politikası',
      onPress: () => void openDocument('Gizlilik Politikası', LEGAL_DOCUMENT_URLS.privacy),
    },
    {
      icon: FileText,
      label: 'Kullanım Koşulları',
      onPress: () => void openDocument('Kullanım Koşulları', LEGAL_DOCUMENT_URLS.terms),
    },
    {
      icon: Trash2,
      label: 'Veri Silme Bilgisi',
      onPress: () => void openDocument('Veri Silme Bilgisi', LEGAL_DOCUMENT_URLS.dataDeletion),
    },
    {
      icon: CircleHelp,
      label: 'Yardım ve Destek',
      onPress: () =>
        Alert.alert(
          'Yardım ve Destek',
          'Sorun yaşarsan uygulamayı güncel tutup tekrar dene. Kalıcı hata alırsan ekran görüntüsü ve kullandığın hesap e-postasıyla destek ekibine ilet.'
        ),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* PROFİL KARTI */}
        <View style={styles.profileCard}>
          <LinearGradient
            colors={['#1C4630', '#0F2919']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileCardTop}
          >
            <View style={styles.avatarRing}>
              <View style={styles.avatar}>
                <Text style={styles.avatarInitials}>{initials || 'S'}</Text>
              </View>
            </View>
            <Text style={styles.name}>{fullName}</Text>
            {!!email && <Text style={styles.email}>{email}</Text>}
            {!!profile.skinType && (
              <View style={styles.skinTypeBadge}>
                <Sparkles size={12} color={colors.goldSoft} />
                <Text style={styles.skinTypeText}>{profile.skinType}</Text>
              </View>
            )}
          </LinearGradient>

          {/* İSTATİSTİKLER */}
          <View style={styles.profileStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{products.length}</Text>
              <Text style={styles.statLabel}>Ürün</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{products.length > 0 ? 'Hazır' : 'Bekliyor'}</Text>
              <Text style={styles.statLabel}>Rutin</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.isOnboarded ? 'Tam' : 'Eksik'}</Text>
              <Text style={styles.statLabel}>Profil</Text>
            </View>
          </View>
        </View>

        {/* CİLT PROFİLİ BÖLÜMÜ */}
        <Text style={styles.sectionLabel}>CİLT PROFİLİ</Text>
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemLast]}
            onPress={() => navigation.navigate('Onboarding' as any)}
            activeOpacity={0.75}
            disabled={isProcessing}
            hitSlop={TOUCH_SLOP}
            accessibilityRole="button"
          >
            <View style={[styles.menuIconBox, styles.menuIconBoxAccent]}>
              <Sparkles size={19} color={colors.gold} />
            </View>
            <Text style={[styles.menuText, { flex: 1 }]}>Cilt Profilini Düzenle</Text>
            {!!profile.skinType && (
              <View style={styles.inlineBadge}>
                <Text style={styles.inlineBadgeText}>{profile.skinType}</Text>
              </View>
            )}
            <ChevronRight size={18} color={colors.inkMuted} />
          </TouchableOpacity>
        </View>

        {/* HESAP MENÜSÜ */}
        <Text style={styles.sectionLabel}>HESAP</Text>
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={index}
                style={[styles.menuItem, index === menuItems.length - 1 && styles.menuItemLast]}
                onPress={item.onPress}
                activeOpacity={0.75}
                disabled={isProcessing}
                hitSlop={TOUCH_SLOP}
                accessibilityRole="button"
              >
                <View style={styles.menuIconBox}>
                  <Icon size={19} color={colors.inkSoft} />
                </View>
                <Text style={[styles.menuText, { flex: 1 }]}>{item.label}</Text>
                <ChevronRight size={18} color={colors.inkMuted} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ÇIKIŞ YAP BUTONU */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
          disabled={isProcessing}
          hitSlop={TOUCH_SLOP}
          accessibilityRole="button"
          accessibilityState={{ busy: isLoggingOut }}
        >
          {isLoggingOut ? (
            <ActivityIndicator size="small" color={colors.danger} />
          ) : (
            <>
              <LogOut size={19} color={colors.danger} style={{ marginRight: 11 }} />
              <Text style={styles.logoutText}>Çıkış Yap</Text>
            </>
          )}
        </TouchableOpacity>

        {/* HESABI VE VERİLERİ SİL BUTONU */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteAccount}
          activeOpacity={0.8}
          disabled={isProcessing}
          hitSlop={TOUCH_SLOP}
          accessibilityRole="button"
          accessibilityState={{ busy: isDeletingAccount }}
        >
          {isDeletingAccount ? (
            <ActivityIndicator size="small" color={colors.danger} />
          ) : (
            <>
              <Trash2 size={18} color={colors.danger} style={{ marginRight: 11 }} />
              <Text style={styles.deleteText}>Hesabı ve Verileri Sil</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.versionText}>SkinShelf • v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const androidHeaderPadding = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 14 : 20;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: androidHeaderPadding, paddingBottom: 16, paddingHorizontal: 22, alignItems: 'center' },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 25,
    color: colors.forest,
  },
  content: { padding: 22, paddingBottom: 150 },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    overflow: 'hidden',
    marginBottom: 26,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card,
  },
  profileCardTop: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  avatarRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 1.5,
    borderColor: 'rgba(216,195,154,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: colors.goldSoft,
  },
  name: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.onDark,
    marginBottom: 5,
    textAlign: 'center',
  },
  email: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
    color: colors.onDarkSoft,
    marginBottom: 13,
  },
  skinTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(216,195,154,0.4)',
  },
  skinTypeText: {
    fontFamily: fonts.sansBold,
    color: colors.goldSoft,
    fontSize: 12,
    letterSpacing: 0.4,
  },
  profileStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: colors.surface,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: {
    fontFamily: fonts.display,
    color: colors.forest,
    fontSize: 18,
  },
  statLabel: {
    fontFamily: fonts.sansBold,
    color: colors.inkMuted,
    fontSize: 10.5,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  statDivider: { width: 1, height: 30, backgroundColor: colors.line },
  sectionLabel: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 10.5,
    letterSpacing: 1.8,
    color: colors.inkMuted,
    marginBottom: 9,
    marginLeft: 6,
  },
  menuContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: 8,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.soft,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuIconBoxAccent: {
    backgroundColor: '#FBF5E9',
  },
  menuText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.ink,
  },
  inlineBadge: {
    backgroundColor: colors.surfaceSage,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    marginRight: 8,
  },
  inlineBadgeText: {
    fontFamily: fonts.sansBold,
    color: colors.sage,
    fontSize: 11.5,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: colors.dangerSurface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#F2D9D6',
  },
  logoutText: {
    fontFamily: fonts.sansBold,
    color: colors.danger,
    fontSize: 15,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    marginTop: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#F2D9D6',
  },
  deleteText: {
    fontFamily: fonts.sansBold,
    color: colors.danger,
    fontSize: 14,
  },
  versionText: {
    fontFamily: fonts.sans,
    fontSize: 11.5,
    color: colors.inkMuted,
    textAlign: 'center',
    marginTop: 20,
  },
});
