import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Camera, ImagePlus, RefreshCcw } from 'lucide-react-native';
import { colors, fonts, radius, shadows } from '../../theme';

type Props = {
  photoUri: string | null;
  onTakePhoto: () => void;
  onPickFromGallery: () => void;
  onRetake: () => void;
};

export default function PhotoUploadCard({ photoUri, onTakePhoto, onPickFromGallery, onRetake }: Props) {
  if (photoUri) {
    return (
      <View style={styles.previewCard}>
        <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
        <TouchableOpacity style={styles.retakeButton} onPress={onRetake} activeOpacity={0.8}>
          <RefreshCcw size={14} color={colors.forest} />
          <Text style={styles.retakeText}>Fotoğrafı değiştir</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Cilt fotoğrafı ekle</Text>
      <Text style={styles.subtitle}>
        Arka kamerayla; net, filtresiz ve makyajsız çek. Haftalık karşılaştırma için aynı açı, mesafe ve eşit ışığı
        koru.
      </Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.optionButton} onPress={onTakePhoto} activeOpacity={0.8}>
          <View style={styles.optionIcon}>
            <Camera size={20} color={colors.sage} />
          </View>
          <Text style={styles.optionText}>Kamera ile çek</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.optionButton} onPress={onPickFromGallery} activeOpacity={0.8}>
          <View style={styles.optionIcon}>
            <ImagePlus size={20} color={colors.sage} />
          </View>
          <Text style={styles.optionText}>Galeriden seç</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.soft,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 19,
    color: colors.ink,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.inkMuted,
    marginBottom: 15,
  },
  buttonRow: { flexDirection: 'row', gap: 10 },
  optionButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surfaceSage,
    borderRadius: radius.lg,
    paddingVertical: 17,
    borderWidth: 1,
    borderColor: colors.lineSage,
  },
  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    ...shadows.soft,
  },
  optionText: {
    fontFamily: fonts.sansBold,
    fontSize: 12.5,
    color: colors.forest,
  },
  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.soft,
  },
  preview: {
    width: '100%',
    height: 300,
    borderRadius: radius.lg,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 12,
  },
  retakeText: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.forest,
  },
});
