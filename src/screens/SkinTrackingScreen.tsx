import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AlertCircle, Camera, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react-native';
import { MainTabParamList, RootStackParamList, SkinLogEntry, SkinWeeklySummary } from '../types';
import {
  deleteSkinLog,
  fetchSkinLogs,
  fetchWeeklySkinSummary,
  parseSkinLogAnalysis,
} from '../services/skinAnalysisApi';
import WeeklySkinSummaryCard from '../components/skin/WeeklySkinSummaryCard';
import SkinLogCard from '../components/skin/SkinLogCard';
import { errorDev } from '../services/logger';
import { colors, fonts, gradients, radius, shadows } from '../theme';

type SkinTrackingNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'SkinTracking'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: SkinTrackingNavigationProp;
};

// Dokunma alanlarını genişletmek için standart hitSlop
const TOUCH_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

export default function SkinTrackingScreen({ navigation }: Props) {
  const [logs, setLogs] = useState<SkinLogEntry[]>([]);
  const [summary, setSummary] = useState<SkinWeeklySummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoadError(null);
    try {
      const [logEntries, weeklySummary] = await Promise.all([
        fetchSkinLogs(),
        fetchWeeklySkinSummary().catch((err) => {
          errorDev('Weekly summary load error:', err);
          return null;
        }),
      ]);

      setLogs(logEntries || []);
      setSummary(weeklySummary);
    } catch (error: any) {
      errorDev('Skin tracking load error:', error);
      let userMsg = 'Cilt geçmişiniz yüklenemedi.';
      if (error?.message?.toLowerCase().includes('network') || error?.code === 'ERR_NETWORK') {
        userMsg = 'İnternet bağlantınızı kontrol edip tekrar deneyin.';
      }
      setLoadError(userMsg);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleOpenLog = (log: SkinLogEntry) => {
    if (isDeleting) return;
    const analysis = parseSkinLogAnalysis(log);
    if (analysis) {
      navigation.navigate('SkinAnalysisResult', { analysis });
    }
  };

  const handleDeleteLog = (log: SkinLogEntry) => {
    if (isDeleting) return;

    const performDelete = async () => {
      setIsDeleting(true);
      try {
        await deleteSkinLog(log.id);
        await loadData();
      } catch (error: any) {
        errorDev('Error deleting skin log:', error);
        let userMsg = 'Kayıt silinemedi. Lütfen tekrar deneyin.';
        if (error?.message?.toLowerCase().includes('network') || error?.code === 'ERR_NETWORK') {
          userMsg = 'İnternet bağlantınızı kontrol edip tekrar deneyin.';
        }
        Alert.alert('Hata', userMsg);
      } finally {
        setIsDeleting(false);
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm('Bu cilt kaydı silinsin mi?')) performDelete();
      return;
    }

    Alert.alert('Kaydı Sil', 'Bu cilt kaydı silinsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: performDelete },
    ]);
  };

  const hasLogs = logs.length > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.overline}>BAKIM GÜNLÜĞÜN</Text>
          <Text style={styles.headerTitle}>Cilt Takibi</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.sage}
            colors={[colors.sage]}
          />
        }
      >
        <Text style={styles.description}>
          Fotoğraflarını kaydet, Shelly cildindeki görünür değişimleri rutin ve ürünlerinle birlikte
          yorumlasın.
        </Text>

        {/* FOTOĞRAF EKLE BUTONU */}
        <TouchableOpacity
          onPress={() => navigation.navigate('AddSkinPhoto')}
          activeOpacity={0.85}
          disabled={isDeleting || initialLoading}
          hitSlop={TOUCH_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Yeni Fotoğraf Ekle"
        >
          <LinearGradient
            colors={gradients.forest}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.addButton}
          >
            <Camera size={19} color={colors.onDark} />
            <Text style={styles.addButtonText}>Yeni Fotoğraf Ekle</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* AĞ YÜKLEME HATASI VE TEKRAR DENE BANTI */}
        {loadError && (
          <View
            style={{
              backgroundColor: '#FDE8E8',
              borderRadius: radius.md,
              padding: 12,
              marginTop: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <AlertCircle size={18} color={colors.danger} />
              <Text
                style={{
                  fontFamily: fonts.sansSemiBold,
                  fontSize: 13,
                  color: colors.danger,
                  flex: 1,
                }}
              >
                {loadError}
              </Text>
            </View>
            <TouchableOpacity
              onPress={loadData}
              disabled={refreshing}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              hitSlop={TOUCH_SLOP}
            >
              <RotateCcw size={14} color={colors.danger} />
              <Text style={{ fontFamily: fonts.sansBold, fontSize: 13, color: colors.danger }}>
                Tekrar Dene
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* HAFTALIK ÖZET KARTI */}
        {summary && (summary.logCount > 0 || hasLogs) && (
          <View style={styles.summaryWrap}>
            <WeeklySkinSummaryCard summary={summary} />
          </View>
        )}

        {/* 1. İLK YÜKLEME DURUMU */}
        {initialLoading ? (
          <View style={{ paddingVertical: 50, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={colors.sage} />
            <Text
              style={{
                marginTop: 12,
                fontFamily: fonts.sansSemiBold,
                fontSize: 13,
                color: colors.inkSoft,
              }}
            >
              Cilt takibi günlüklerin hazırlanıyor...
            </Text>
          </View>
        ) : hasLogs ? (
          /* 2. KAYITLAR LİSTESİ */
          <View style={styles.logsSection}>
            <Text style={styles.sectionTitle}>Son Kayıtlar</Text>
            <View style={styles.logsList}>
              {logs.map((log) => (
                <SkinLogCard
                  key={log.id}
                  log={log}
                  onPress={() => handleOpenLog(log)}
                  onLongPress={() => handleDeleteLog(log)}
                />
              ))}
            </View>
          </View>
        ) : (
          /* 3. BOŞ CİLT TAKİBİ DURUMU (EMPTY STATE) */
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Sparkles size={26} color={colors.gold} />
            </View>
            <Text style={styles.emptyTitle}>Henüz cilt kaydın yok</Text>
            <Text style={styles.emptyText}>
              İlk fotoğrafını ekle, Shelly değişimleri takip etmeye başlasın.
            </Text>
          </View>
        )}

        <View style={styles.privacyRow}>
          <ShieldCheck size={15} color={colors.sage} />
          <Text style={styles.privacyText}>
            Fotoğrafların analiz için Shelly'ye iletilir; sunucuda saklanmaz, yalnızca analiz sonucu
            kaydedilir. İstersen geçmiş kayıtlarını silebilirsin (karta uzun bas).
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const androidHeaderPadding = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 14 : 12;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingTop: androidHeaderPadding,
    paddingBottom: 6,
    paddingHorizontal: 22,
  },
  overline: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.gold,
    marginBottom: 5,
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 27,
    color: colors.forest,
  },
  content: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 150 },
  description: {
    fontFamily: fonts.sans,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.inkMuted,
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingVertical: 16,
    borderRadius: radius.pill,
    marginBottom: 18,
    ...shadows.card,
  },
  addButtonText: {
    fontFamily: fonts.sansBold,
    fontSize: 14.5,
    letterSpacing: 0.2,
    color: colors.onDark,
  },
  summaryWrap: { marginBottom: 18 },
  logsSection: { marginBottom: 8 },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.ink,
    marginBottom: 12,
  },
  logsList: { gap: 11 },
  emptyState: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: 42,
    paddingHorizontal: 30,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 8,
    ...shadows.soft,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: fonts.display,
    fontSize: 21,
    color: colors.forest,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: fonts.sans,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  privacyText: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.inkMuted,
  },
});
