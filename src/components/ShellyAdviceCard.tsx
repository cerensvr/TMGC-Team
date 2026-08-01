import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  AlertTriangle,
  CalendarDays,
  Lightbulb,
  Moon,
  PackagePlus,
  Sun,
} from 'lucide-react-native';
import { ShellyRoutineStep, ShellyStructuredResponse } from '../types';
import { colors, fonts, radius, shadows } from '../theme';
import ShellyIcon from './ShellyIcon';

const riskLabels = { low: 'Düşük risk', medium: 'Orta risk', high: 'Yüksek risk' } as const;
const riskColors = { low: colors.success, medium: colors.warning, high: colors.danger } as const;

const periodLabels: Record<string, string> = {
  MORNING: 'Sabah',
  EVENING: 'Akşam',
  MONDAY_EVENING: 'Pazartesi akşamı',
  THURSDAY_EVENING: 'Perşembe akşamı',
  ALTERNATE_EVENING: 'Dönüşümlü akşam',
  OTHER_EVENING: 'Diğer akşam',
};

type Props = {
  response: ShellyStructuredResponse;
};

const PeriodIcon = ({ period }: { period: string }) =>
  period === 'MORNING' ? (
    <Sun size={15} color={colors.warning} />
  ) : period === 'EVENING' ? (
    <Moon size={15} color={colors.sage} />
  ) : (
    <CalendarDays size={15} color={colors.sage} />
  );

/** Shelly'nin doğrulanmış bağlamını, dolap kararlarını ve uygulanabilir rutinini gösterir. */
export default function ShellyAdviceCard({ response }: Props) {
  const missingCategories = response.missingCategories ?? [];
  const routineSteps = response.routineSteps ?? [];
  const safetyWarnings = response.safetyWarnings ?? [];
  const warnings = [response.warning, ...safetyWarnings]
    .filter((warning): warning is string => Boolean(warning?.trim()))
    .filter((warning, index, values) => values.indexOf(warning) === index);
  const routineGroups = routineSteps.reduce<Record<string, ShellyRoutineStep[]>>((groups, step) => {
    groups[step.period] = [...(groups[step.period] ?? []), step];
    return groups;
  }, {});

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <ShellyIcon size={30} style={styles.iconWrap} />
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{response.title}</Text>
        </View>
        <View style={[styles.riskPill, { borderColor: riskColors[response.riskLevel] }]}>
          <View style={[styles.riskDot, { backgroundColor: riskColors[response.riskLevel] }]} />
          <Text style={[styles.riskText, { color: riskColors[response.riskLevel] }]}>
            {riskLabels[response.riskLevel]}
          </Text>
        </View>
      </View>

      <Text style={styles.summary}>{response.summary}</Text>
      {response.reason ? <Text style={styles.reason}>{response.reason}</Text> : null}

      {/* "BU ÖNERİYİ NEDEN VERDİM" SİLİNDİ */}

      {/* "DOLABINDAN DEĞERLENDİRDİKLERİM" SİLİNDİ */}

      {/* Dolabında Eksik Görünenler (Gerekirse kalsın diye bırakıldı) */}
      {missingCategories.length > 0 && (
        <View style={[styles.section, styles.missingSection]}>
          <View style={styles.sectionHeader}>
            <PackagePlus size={15} color={colors.warning} />
            <Text style={styles.sectionTitle}>Dolabında eksik görünenler</Text>
          </View>
          {missingCategories.map(category => (
            <Text key={category} style={styles.missingText}>• {category}</Text>
          ))}
          <Text style={styles.missingNote}>Marka değil, yalnızca ihtiyaç kategorisi önerilir.</Text>
        </View>
      )}

      {/* Uygulanabilir Rutin Planı */}
      {Object.keys(routineGroups).length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CalendarDays size={15} color={colors.forest} />
            <Text style={styles.sectionTitle}>Uygulanabilir rutin planın</Text>
          </View>
          {Object.entries(routineGroups).map(([period, steps]) => (
            <View key={period} style={styles.routineGroup}>
              <View style={styles.periodHeader}>
                <PeriodIcon period={period} />
                <Text style={styles.periodTitle}>{periodLabels[period] ?? period}</Text>
              </View>
              {steps
                .sort((left, right) => left.order - right.order)
                .map(step => (
                  <View key={`${period}-${step.order}-${step.productId ?? step.productName}`} style={styles.stepRow}>
                    <View style={[styles.stepNumber, step.status === 'MISSING' && styles.stepNumberMissing]}>
                      <Text style={[styles.stepNumberText, step.status === 'MISSING' && styles.stepNumberTextMissing]}>
                        {step.order}
                      </Text>
                    </View>
                    <View style={styles.stepTextWrap}>
                      <Text style={styles.stepName}>{step.productName}</Text>
                      <Text style={styles.stepInstruction}>{step.instruction}</Text>
                    </View>
                    {step.status === 'MISSING' && <Text style={styles.missingBadge}>Eksik</Text>}
                  </View>
                ))}
            </View>
          ))}
        </View>
      )}

      {/* Sonraki Adım */}
      {response.suggestion ? (
        <View style={styles.suggestionRow}>
          <Lightbulb size={15} color={colors.success} style={styles.rowIcon} />
          <View style={styles.calloutTextWrap}>
            <Text style={styles.calloutLabel}>Sonraki adım</Text>
            <Text style={styles.suggestionText}>{response.suggestion}</Text>
          </View>
        </View>
      ) : null}

      {/* Dikkat Mesajları */}
      {warnings.map((warning, index) => (
        <View key={`${warning}-${index}`} style={styles.warningRow}>
          <AlertTriangle size={15} color={colors.danger} style={styles.rowIcon} />
          <View style={styles.calloutTextWrap}>
            <Text style={[styles.calloutLabel, { color: colors.danger }]}>Dikkat</Text>
            <Text style={styles.warningText}>{warning}</Text>
          </View>
        </View>
      ))}

      {/* EN ALTTAKİ YAZI KUTUCUKLARI (TAGS) SİLİNDİ */}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.lineGold,
    marginTop: 4,
    marginBottom: 12,
    ...shadows.soft,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  titleWrap: { flex: 1 },
  title: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.ink },
  riskPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  riskDot: { width: 6, height: 6, borderRadius: 3 },
  riskText: { fontFamily: fonts.sansBold, fontSize: 9.5 },
  summary: { fontFamily: fonts.sansSemiBold, fontSize: 13, lineHeight: 19, color: colors.inkSoft },
  reason: { fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 18, color: colors.inkMuted, marginTop: 7 },
  section: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    marginTop: 13,
    paddingTop: 12,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 9 },
  sectionTitle: { fontFamily: fonts.sansBold, fontSize: 12.5, color: colors.forest },
  missingSection: { backgroundColor: colors.warningSurface, marginHorizontal: -5, paddingHorizontal: 10, paddingBottom: 10, borderRadius: radius.md },
  missingText: { fontFamily: fonts.sansSemiBold, fontSize: 11, lineHeight: 17, color: colors.inkSoft, marginBottom: 3 },
  missingNote: { fontFamily: fonts.sans, fontSize: 9.5, color: colors.inkMuted, marginTop: 5 },
  routineGroup: { backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: 10, marginBottom: 8 },
  periodHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7 },
  periodTitle: { fontFamily: fonts.sansBold, fontSize: 11.5, color: colors.ink },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 5 },
  stepNumber: { width: 21, height: 21, borderRadius: 11, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  stepNumberMissing: { backgroundColor: colors.warningSurface, borderWidth: 1, borderColor: colors.gold },
  stepNumberText: { fontFamily: fonts.sansBold, fontSize: 9, color: colors.onDark },
  stepNumberTextMissing: { color: colors.warning },
  stepTextWrap: { flex: 1 },
  stepName: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.ink },
  stepInstruction: { fontFamily: fonts.sans, fontSize: 10, lineHeight: 14, color: colors.inkMuted, marginTop: 1 },
  missingBadge: { fontFamily: fonts.sansBold, fontSize: 8.5, color: colors.warning },
  suggestionRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.successSurface, borderRadius: radius.md, padding: 11, marginTop: 11 },
  warningRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.dangerSurface, borderRadius: radius.md, padding: 11, marginTop: 9 },
  rowIcon: { marginTop: 1, marginRight: 8 },
  calloutTextWrap: { flex: 1 },
  calloutLabel: { fontFamily: fonts.sansBold, fontSize: 10.5, color: colors.success, marginBottom: 2 },
  suggestionText: { fontFamily: fonts.sansSemiBold, fontSize: 12, lineHeight: 17, color: colors.inkSoft },
  warningText: { fontFamily: fonts.sansSemiBold, fontSize: 12, lineHeight: 17, color: colors.inkSoft },
});