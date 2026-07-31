import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, TrendingDown, TrendingUp, Minus, ShieldCheck } from 'lucide-react-native';
import { SkinTrend, SkinWeeklySummary } from '../../types';
import { colors, fonts, gradients, radius, shadows } from '../../theme';
import { trendLabels, trendMetricLabels } from './skinLabels';

const TrendIcon = ({ trend }: { trend: SkinTrend }) => {
  if (trend === 'increased') return <TrendingUp size={14} color="#E5B8A8" />;
  if (trend === 'decreased') return <TrendingDown size={14} color="#A8D5B5" />;
  return <Minus size={14} color="rgba(255,255,255,0.6)" />;
};

type Props = {
  summary: SkinWeeklySummary;
};

export default function WeeklySkinSummaryCard({ summary }: Props) {
  const trendEntries = Object.entries(summary.trends) as [keyof typeof summary.trends, SkinTrend][];
  const comparableCount = summary.comparableLogCount ?? summary.logCount;
  const previousCount = summary.previousWeekComparableLogCount;
  const guidanceLabels = {
    continue: 'Mevcut sıklığı koru',
    reduce: 'Sıklığı azalt',
    pause: 'Aktiflere ara ver',
    observe: 'Takip et',
    not_applicable: '',
  } as const;
  const guidanceLabel = summary.guidanceStatus ? guidanceLabels[summary.guidanceStatus] : '';

  return (
    <LinearGradient colors={gradients.forest} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Sparkles size={17} color={colors.goldSoft} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Haftalık Özet</Text>
          <Text style={styles.subtitle}>
            {summary.logCount > 0
              ? previousCount === undefined
                ? `${comparableCount} karşılaştırılabilir kayıt`
                : `Bu hafta ${comparableCount} • önceki hafta ${previousCount} uygun kayıt`
              : 'Henüz kayıt yok'}
          </Text>
        </View>
      </View>

      {summary.logCount > 0 && (
        <View style={styles.trendGrid}>
          {trendEntries.map(([metric, trend]) => (
            <View key={metric} style={styles.trendItem}>
              <TrendIcon trend={trend} />
              <Text style={styles.trendMetric}>{trendMetricLabels[metric]}</Text>
              <Text style={styles.trendValue}>{trendLabels[trend]}</Text>
            </View>
          ))}
        </View>
      )}

      {summary.newProducts.length > 0 && (
        <View style={styles.newProductsRow}>
          <Text style={styles.newProductsLabel}>Yeni ürünler:</Text>
          <Text style={styles.newProductsText} numberOfLines={2}>
            {summary.newProducts.join(', ')}
          </Text>
        </View>
      )}

      <Text style={styles.comment}>{summary.shellyComment}</Text>

      {summary.activeGuidance ? (
        <View style={styles.guidanceCard}>
          <View style={styles.guidanceHeader}>
            <ShieldCheck size={15} color={colors.goldSoft} />
            <Text style={styles.guidanceTitle}>Aktif içerik kararı</Text>
            {guidanceLabel ? <Text style={styles.guidanceStatus}>{guidanceLabel}</Text> : null}
          </View>
          {(summary.monitoredActives?.length ?? 0) > 0 ? (
            <Text style={styles.guidanceProducts}>{summary.monitoredActives?.join(' • ')}</Text>
          ) : null}
          <Text style={styles.guidanceText}>{summary.activeGuidance}</Text>
        </View>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: 18,
    ...shadows.card,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 13 },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(216,195,154,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.onDark,
  },
  subtitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    color: colors.onDarkSoft,
    marginTop: 2,
  },
  trendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 13,
  },
  trendItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.md,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  trendMetric: {
    flex: 1,
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.82)',
  },
  trendValue: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    color: colors.goldSoft,
  },
  newProductsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  newProductsLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: colors.goldSoft,
  },
  newProductsText: {
    flex: 1,
    fontFamily: fonts.sansSemiBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
  },
  comment: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.88)',
  },
  guidanceCard: {
    marginTop: 14,
    borderRadius: radius.md,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(216,195,154,0.3)',
  },
  guidanceHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7 },
  guidanceTitle: {
    flex: 1,
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: colors.onDark,
  },
  guidanceStatus: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 10,
    color: colors.goldSoft,
  },
  guidanceProducts: {
    fontFamily: fonts.sansBold,
    fontSize: 10.5,
    lineHeight: 15,
    color: 'rgba(216,195,154,0.92)',
    marginBottom: 5,
  },
  guidanceText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.88)',
  },
});
