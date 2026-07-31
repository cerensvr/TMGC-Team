import { SkinChangeLevel, SkinTrend } from '../../types';
import { colors } from '../../theme';

export const levelLabels: Record<SkinChangeLevel, string> = {
  low: 'Hafif',
  medium: 'Orta',
  high: 'Belirgin',
  unknown: 'Belirsiz',
};

export const levelColors: Record<SkinChangeLevel, string> = {
  low: colors.success,
  medium: colors.warning,
  high: colors.danger,
  unknown: colors.inkMuted,
};

export const trendLabels: Record<SkinTrend, string> = {
  increased: 'Arttı',
  decreased: 'Azaldı',
  stable: 'Sabit',
  unknown: '—',
};

export const trendColors: Record<SkinTrend, string> = {
  increased: colors.danger,
  decreased: colors.success,
  stable: colors.sage,
  unknown: colors.inkMuted,
};

export const changeLabels: Record<string, string> = {
  redness: 'Kızarıklık görünümü',
  dryness: 'Kuruluk/pullanma görünümü',
  oiliness: 'Parlama/yağlanma görünümü',
  blemishAppearance: 'Sivilce benzeri görünüm',
  irritationAppearance: 'Tahriş ihtimali',
};

export const trendMetricLabels: Record<string, string> = {
  dryness: 'Kuruluk',
  redness: 'Kızarıklık',
  oiliness: 'Yağlanma',
  blemish: 'Sivilce görünümü',
  irritation: 'Tahriş görünümü',
};

export const feelingOptions = [
  'Normal',
  'Kuru/gergin',
  'Yağlı/parlak',
  'Hassas/kızarık',
  'Sivilce çıktı',
] as const;
