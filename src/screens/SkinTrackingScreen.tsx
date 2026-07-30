import React, { useCallback, useState } from 'react';
import {
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
import { Camera, ShieldCheck, Sparkles } from 'lucide-react-native';
import { MainTabParamList, RootStackParamList, SkinLogEntry, SkinWeeklySummary } from '../types';
import { deleteSkinLog, fetchSkinLogs, fetchWeeklySkinSummary, parseSkinLogAnalysis } from '../services/skinAnalysisApi';
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

export default function SkinTrackingScreen({ navigation }: Props) {
  const [logs, setLogs] = useState<SkinLogEntry[]>([]);
  const [summary, setSummary] = useState<SkinWeeklySummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [logEntries, weeklySummary] = await Promise.all([fetchSkinLogs(), fetchWeeklySkinSummary()]);
      setLogs(logEntries);
      setSummary(weeklySummary);
    } catch (error) {
      errorDev('Skin tracking load error:', error);
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
    const analysis = parseSkinLogAnalysis(log);
    if (analysis) {
      navigation.navigate('SkinAnalysisResult', { analysis });
    }
  };

  const handleDeleteLog = (log: SkinLogEntry) => {
    const performDelete = async () => {
      try {
        await deleteSkinLog(log.id);
        await loadData();
      } catch {
        Alert.alert('Hata', 'Kayıt silinemedi.');
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.sage} />}
      >
        <Text style={styles.description}>
          Fotoğraflarını kaydet, Shelly cildindeki görünür değişimleri rutin ve ürünlerinle birlikte yorumlasın.
        </Text>

        <TouchableOpacity onPress={() => navigation.navigate('AddSkinPhoto')} activeOpacity={0.85}>
          <LinearGradient colors={gradients.forest} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addButton}>
            <Camera size={19} color={colors.onDark} />
            <Text style={styles.addButtonText}>Yeni Fotoğraf Ekle</Text>
          </LinearGradient>
        </TouchableOpacity>

        {summary && (summary.logCount > 0 || hasLogs) && (
          <View style={styles.summaryWrap}>
            <WeeklySkinSummaryCard summary={summary} />
          </View>
        )}

        {hasLogs ? (
          <View style={styles.logsSection}>
            <Text style={styles.sectionTitle}>Son Kayıtlar</Text>
            <View style={styles.logsList}>
              {logs.map(log => (
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
            Fotoğrafların analiz için Shelly'ye iletilir; sunucuda saklanmaz, yalnızca analiz sonucu kaydedilir.
            İstersen geçmiş kayıtlarını silebilirsin (karta uzun bas).
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
