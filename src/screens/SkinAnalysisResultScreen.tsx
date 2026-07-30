import React from 'react';
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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft } from 'lucide-react-native';
import { RootStackParamList } from '../types';
import ShellySkinAdviceCard from '../components/skin/ShellySkinAdviceCard';
import { colors, fonts, shadows } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'SkinAnalysisResult'>;

// Dokunma alanlarını genişletmek için standart hitSlop
const TOUCH_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

const formatDate = (value: string | null | undefined) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
};

export default function SkinAnalysisResultScreen({ navigation, route }: Props) {
  const analysis = route.params?.analysis;

  // VERİ EKSİK / TANIMSIZ DURUMU (CRASH KORUMASI & EMPTY STATE)
  if (!analysis) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.75}
            hitSlop={TOUCH_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Geri Dön"
          >
            <ArrowLeft size={21} color={colors.forest} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Analiz Sonucu</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <View style={{ flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 20, color: colors.forest, marginBottom: 8 }}>
            Analiz Sonucu Bulunamadı
          </Text>
          <Text
            style={{
              fontFamily: fonts.sansSemiBold,
              fontSize: 14,
              color: colors.inkSoft,
              textAlign: 'center',
              marginBottom: 20,
            }}
          >
            Görüntülemek istediğiniz analiz kaydı silinmiş veya eksik olabilir.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              backgroundColor: colors.forest,
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 12,
            }}
            hitSlop={TOUCH_SLOP}
          >
            <Text style={{ fontFamily: fonts.sansBold, color: colors.onDark, fontSize: 14 }}>
              Geri Dön
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const dateLabel = formatDate(analysis.createdAt);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.75}
          hitSlop={TOUCH_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Geri Dön"
        >
          <ArrowLeft size={21} color={colors.forest} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Analiz Sonucu</Text>
          {dateLabel ? <Text style={styles.headerDate}>{dateLabel}</Text> : null}
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* SHELLY ANALİZ KARTI */}
        <ShellySkinAdviceCard analysis={analysis} />

        <Text style={styles.disclaimer}>
          Shelly teşhis koymaz; bu yorum yalnızca cilt görünümündeki değişimleri takip etmek içindir.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const androidHeaderPadding = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 14 : 12;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: androidHeaderPadding,
    paddingBottom: 12,
    paddingHorizontal: 22,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.soft,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.forest,
  },
  headerDate: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 2,
  },
  content: { paddingHorizontal: 22, paddingBottom: 40 },
  disclaimer: {
    fontFamily: fonts.sans,
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.inkMuted,
    textAlign: 'center',
    marginTop: 18,
    paddingHorizontal: 14,
  },
});
