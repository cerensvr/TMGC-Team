import React, { useEffect, useState } from 'react';
import {
  Alert,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Image,
  Switch,
  Platform,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import {
  Sparkles,
  Droplets,
  Wind,
  Sun,
  Leaf,
  Edit2,
  Lightbulb,
  CheckCircle2,
  Heart,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from 'lucide-react-native';
import { useProducts } from '../context/ProductContext';
import { getProductVisualSource } from '../services/productVisualCatalog';
import { getProductShellyComment, getProductStatus } from '../services/shellyInsights';
import { getRemainingDays } from '../services/expiryDate';
import { errorDev, logDev } from '../services/logger';
import { colors, fonts, radius, shadows } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ProductDetail'>;
  route: RouteProp<RootStackParamList, 'ProductDetail'>;
};

// Dokunma alanlarını genişletmek için standart hitSlop
const TOUCH_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Temizleyici': return <Wind size={48} color={colors.sage} />;
    case 'Tonik': return <Droplets size={48} color={colors.sage} />;
    case 'Serum': return <Droplets size={48} color={colors.sage} />;
    case 'Nemlendirici': return <Leaf size={48} color={colors.sage} />;
    case 'Güneş Kremi': return <Sun size={48} color={colors.sage} />;
    default: return <Sparkles size={48} color={colors.sage} />;
  }
};

const isExpired = (dateString?: string) => {
  const days = getRemainingDays(dateString);
  return days !== null && days < 0;
};

export default function ProductDetailScreen({ navigation, route }: Props) {
  const { products, updateProduct, deleteProduct } = useProducts();
  const [imageFailed, setImageFailed] = useState(false);
  const [feedback, setFeedback] = useState<'good' | 'bad' | null>(null);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const product = products.find((p) => p.id === route.params.productId);

  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [isFavorite, setIsFavorite] = useState(product?.isFavorite ?? false);

  useEffect(() => {
    setIsActive(product?.isActive ?? true);
    setIsFavorite(product?.isFavorite ?? false);
  }, [product?.isActive, product?.isFavorite]);

  const handleClose = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('MainTabs');
  };

  const handleToggleActive = async (value: boolean) => {
    if (!product || isSavingStatus || isDeleting) return;
    setIsActive(value);
    setIsSavingStatus(true);
    try {
      await updateProduct(product.id, { isActive: value });
      logDev('Ürün aktiflik durumu güncellendi:', value);
    } catch (error: any) {
      errorDev('Aktiflik güncellenirken hata oluştu:', error);
      setIsActive(!value);

      let userMsg = 'Rutin kullanım durumu kaydedilemedi. Lütfen tekrar dene.';
      if (error?.message?.toLowerCase().includes('network') || error?.code === 'ERR_NETWORK') {
        userMsg = 'İnternet bağlantınızı kontrol edip tekrar deneyin.';
      }
      Alert.alert('Hata', userMsg);
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!product || isSavingStatus || isDeleting) return;
    const nextFavorite = !isFavorite;
    setIsFavorite(nextFavorite);
    setIsSavingStatus(true);
    try {
      await updateProduct(product.id, { isFavorite: nextFavorite });
    } catch (error: any) {
      errorDev('Favori durumu güncellenirken hata oluştu:', error);
      setIsFavorite(!nextFavorite);

      let userMsg = 'Favori durumu kaydedilemedi. Lütfen tekrar dene.';
      if (error?.message?.toLowerCase().includes('network') || error?.code === 'ERR_NETWORK') {
        userMsg = 'İnternet bağlantınızı kontrol edip tekrar deneyin.';
      }
      Alert.alert('Hata', userMsg);
    } finally {
      setIsSavingStatus(false);
    }
  };

  const performDelete = async () => {
    if (!product || isDeleting || isSavingStatus) return;
    setIsDeleting(true);
    try {
      await deleteProduct(product.id);
      handleClose();
    } catch (error: any) {
      errorDev('Ürün silinirken hata oluştu:', error);

      let userMsg = 'Ürün dolabından silinemedi. Lütfen tekrar dene.';
      if (error?.message?.toLowerCase().includes('network') || error?.code === 'ERR_NETWORK') {
        userMsg = 'İnternet bağlantınızı kontrol edip tekrar deneyin.';
      }
      Alert.alert('Hata', userMsg);
      setIsDeleting(false);
    }
  };

  const handleDelete = () => {
    if (!product || isDeleting) return;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(`${product.brand} - ${product.name} dolabından silinsin mi?`)) {
        void performDelete();
      }
      return;
    }

    Alert.alert(
      'Ürünü Sil',
      `${product.brand} - ${product.name} dolabından kalıcı olarak silinsin mi?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: () => void performDelete() },
      ]
    );
  };

  // ============ BOŞ / BULUNAMAYAN ÜRÜN DURUMU (EMPTY STATE) ============
  if (!product) {
    return (
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <TouchableOpacity
              style={styles.editIconButton}
              onPress={handleClose}
              hitSlop={TOUCH_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Kapat"
            >
              <X size={20} color={colors.inkMuted} />
            </TouchableOpacity>
          </View>
          <View style={{ paddingVertical: 40, paddingHorizontal: 24, alignItems: 'center' }}>
            <Text style={styles.name}>Ürün Bulunamadı</Text>
            <Text style={[styles.bodyText, { textAlign: 'center', marginTop: 8 }]}>
              Aradığınız ürün dolabınızdan silinmiş veya mevcut değil.
            </Text>
            <TouchableOpacity
              style={[styles.feedbackButton, styles.feedbackButtonActive, { marginTop: 20 }]}
              onPress={handleClose}
              hitSlop={TOUCH_SLOP}
            >
              <Text style={styles.feedbackButtonTextActive}>Dolabıma Dön</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const handleEdit = () => {
    const { id, ...productDraft } = product;
    navigation.navigate('ProductReview', { scannedProduct: productDraft, editingProductId: id });
  };

  const remainingDays = getRemainingDays(product.expiryDate);
  const expired = isExpired(product.expiryDate);

  const displayedIngredients = product.activeIngredients?.length
    ? product.activeIngredients
    : ['İçerik bilgisi bekleniyor'];
  const productDescription = product.description || 'Bu ürün için açıklama bilgisi henüz eklenmedi.';

  const shellyComment = getProductShellyComment(product);
  const productStatus = getProductStatus(product);
  const usageLabel =
    product.timeOfDay === 'morning'
      ? 'Sabah'
      : product.timeOfDay === 'evening'
      ? 'Akşam'
      : 'Sabah / Akşam';

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View style={styles.sheet}>
        {/* Modal Handle */}
        <View style={styles.handle} />

        {/* Header & Edit Button */}
        <View style={styles.sheetHeader}>
          <TouchableOpacity
            style={styles.editIconButton}
            onPress={handleClose}
            hitSlop={TOUCH_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Kapat"
          >
            <X size={20} color={colors.inkMuted} />
          </TouchableOpacity>

          <View style={styles.headerActions}>
            {/* FAVORİ BUTONU */}
            <TouchableOpacity
              style={[styles.editIconButton, isFavorite && styles.favoriteIconButton]}
              onPress={handleToggleFavorite}
              disabled={isSavingStatus || isDeleting}
              hitSlop={TOUCH_SLOP}
              accessibilityRole="button"
              accessibilityLabel={isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
            >
              {isSavingStatus ? (
                <ActivityIndicator size="small" color={isFavorite ? colors.onDark : colors.sage} />
              ) : (
                <Heart
                  size={20}
                  color={isFavorite ? colors.onDark : colors.sage}
                  fill={isFavorite ? colors.onDark : 'transparent'}
                />
              )}
            </TouchableOpacity>

            {/* DÜZENLE BUTONU */}
            <TouchableOpacity
              style={styles.editIconButton}
              onPress={handleEdit}
              disabled={isDeleting || isSavingStatus}
              hitSlop={TOUCH_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Ürünü düzenle"
            >
              <Edit2 size={20} color={colors.inkMuted} />
            </TouchableOpacity>

            {/* SİL BUTONU */}
            <TouchableOpacity
              style={[styles.editIconButton, styles.deleteIconButton]}
              onPress={handleDelete}
              disabled={isDeleting || isSavingStatus}
              hitSlop={TOUCH_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Ürünü sil"
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={colors.danger} />
              ) : (
                <Trash2 size={20} color={colors.danger} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Icon & Title */}
          <View style={styles.topSection}>
            <View style={styles.visualStage}>
              <View style={styles.iconWrapper}>{getCategoryIcon(product.category)}</View>
              <Image
                source={getProductVisualSource(product, imageFailed)}
                style={styles.productImage}
                resizeMode="contain"
                onError={() => setImageFailed(true)}
              />
            </View>

            <Text style={styles.brand} numberOfLines={1}>
              {product.brand}
            </Text>
            <Text style={styles.name} numberOfLines={2}>
              {product.name}
            </Text>

            <View style={styles.statusRow}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>{productStatus.label}</Text>
              </View>
              <View style={styles.usageBadge}>
                <Text style={styles.usageBadgeText}>{usageLabel}</Text>
              </View>
            </View>

            {(remainingDays !== null || expired) && (
              <View style={[styles.expiryBadge, expired && styles.expiredBadge]}>
                <Text style={[styles.expiryText, expired && styles.expiredText]}>
                  {expired ? 'Süresi Doldu' : `${remainingDays} gün kaldı`}
                </Text>
              </View>
            )}
          </View>

          {/* Aktiflik Switch Butonu */}
          <View style={styles.activeToggleContainer}>
            <View style={styles.activeToggleTextWrap}>
              <Text style={styles.activeToggleTitle}>Rutinlerimde Aktif Kullan</Text>
              <Text style={styles.activeToggleSubtitle}>
                {isActive
                  ? 'Bu ürün sabah/akşam cilt bakım planınıza dâhil edilir.'
                  : 'Bu ürün dolabınızda saklanır ancak rutinlerinize eklenmez.'}
              </Text>
            </View>
            <Switch
              trackColor={{ false: '#e2e8e2', true: '#a3be9d' }}
              thumbColor={isActive ? colors.forest : '#707973'}
              ios_backgroundColor="#e2e8e2"
              onValueChange={handleToggleActive}
              value={isActive}
              disabled={isSavingStatus || isDeleting}
            />
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Kategori</Text>
              <Text style={styles.infoValue}>{product.category}</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Kullanım</Text>
              <Text style={styles.infoValue}>{usageLabel}</Text>
            </View>
          </View>

          {/* Ingredients */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Öne Çıkan İçerikler</Text>
            <View style={styles.ingredientsContainer}>
              {displayedIngredients.map((ing, idx) => (
                <View key={idx} style={styles.ingredientBadge}>
                  <Text style={styles.ingredientText}>{ing}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* About */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ürün Hakkında</Text>
            <Text style={styles.bodyText}>{productDescription}</Text>
          </View>

          {/* Shelly Comment */}
          <View style={styles.aiCard}>
            <View style={styles.aiCardHeader}>
              <Lightbulb size={20} color={colors.warning} style={{ marginRight: 8 }} />
              <Text style={styles.aiCardTitle}>Shelly’nin Yorumu</Text>
            </View>
            <Text style={styles.aiCardText}>{shellyComment}</Text>
          </View>

          {/* Usage Feedback */}
          <View style={styles.feedbackCard}>
            <View style={styles.feedbackHeader}>
              <CheckCircle2 size={18} color={colors.sage} />
              <Text style={styles.feedbackTitle}>Kullanım geri bildirimi</Text>
            </View>
            <Text style={styles.feedbackText}>
              Shelly zamanla ürünün cildindeki etkisini bu kayıtlardan öğrenir.
            </Text>
            <View style={styles.feedbackActions}>
              <TouchableOpacity
                style={[styles.feedbackButton, feedback === 'good' && styles.feedbackButtonActive]}
                onPress={() => setFeedback('good')}
                activeOpacity={0.78}
                hitSlop={TOUCH_SLOP}
              >
                <ThumbsUp size={16} color={feedback === 'good' ? colors.onDark : colors.sage} />
                <Text
                  style={[
                    styles.feedbackButtonText,
                    feedback === 'good' && styles.feedbackButtonTextActive,
                  ]}
                >
                  İyi geldi
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.feedbackButton, feedback === 'bad' && styles.feedbackButtonDanger]}
                onPress={() => setFeedback('bad')}
                activeOpacity={0.78}
                hitSlop={TOUCH_SLOP}
              >
                <ThumbsDown size={16} color={feedback === 'bad' ? colors.onDark : colors.danger} />
                <Text
                  style={[
                    styles.feedbackButtonTextDanger,
                    feedback === 'bad' && styles.feedbackButtonTextActive,
                  ]}
                >
                  Kötü geldi
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const androidHeaderPadding = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 14 : 20;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(12,17,13,0.45)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingTop: 16,
    maxHeight: '90%',
    ...shadows.floating,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.line,
    alignSelf: 'center',
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  editIconButton: {
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  favoriteIconButton: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
  },
  deleteIconButton: {
    backgroundColor: colors.dangerSurface,
    borderColor: '#F2C7C2',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  topSection: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  visualStage: {
    width: 180,
    height: 180,
    borderRadius: 40,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card,
  },
  iconWrapper: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.surfaceSage,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.22,
  },
  productImage: {
    width: 132,
    height: 154,
  },
  brand: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 13,
    letterSpacing: 2.2,
    color: colors.gold,
    textTransform: 'uppercase',
    marginBottom: 6,
    textAlign: 'center',
  },
  name: {
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: 31,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 13,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  statusBadge: {
    backgroundColor: colors.surfaceBlush,
    borderWidth: 1,
    borderColor: colors.lineBlush,
    borderRadius: radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 6,
  },
  statusBadgeText: { fontFamily: fonts.sansBold, color: colors.blush, fontSize: 12 },
  usageBadge: {
    backgroundColor: colors.surfaceSage,
    borderWidth: 1,
    borderColor: colors.lineSage,
    borderRadius: radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 6,
  },
  usageBadgeText: { fontFamily: fonts.sansBold, color: colors.sage, fontSize: 12 },
  expiryBadge: {
    backgroundColor: colors.dangerSurface,
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#F2C7C2',
  },
  expiredBadge: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  expiryText: {
    fontFamily: fonts.sansBold,
    color: colors.danger,
    fontSize: 12,
  },
  expiredText: {
    color: colors.onDark,
  },
  section: {
    marginBottom: 24,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  infoCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.soft,
  },
  infoLabel: {
    fontFamily: fonts.sansExtraBold,
    color: colors.inkMuted,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  infoValue: { fontFamily: fonts.sansBold, color: colors.ink, fontSize: 14 },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.ink,
    marginBottom: 12,
  },
  ingredientsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ingredientBadge: {
    backgroundColor: colors.surfaceSage,
    borderWidth: 1,
    borderColor: colors.lineSage,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  ingredientText: {
    fontFamily: fonts.sansBold,
    color: colors.sage,
    fontSize: 13,
  },
  bodyText: {
    fontFamily: fonts.sans,
    fontSize: 14.5,
    color: colors.inkSoft,
    lineHeight: 23,
  },
  aiCard: {
    backgroundColor: '#FBF5E9',
    borderRadius: radius.lg,
    padding: 17,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.lineGold,
  },
  aiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiCardTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 15.5,
    color: '#8A6835',
  },
  aiCardText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: '#6E5327',
    lineHeight: 22,
  },
  feedbackCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 17,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 16,
    ...shadows.soft,
  },
  feedbackHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  feedbackTitle: { fontFamily: fonts.sansBold, color: colors.ink, fontSize: 15.5 },
  feedbackText: {
    fontFamily: fonts.sans,
    color: colors.inkMuted,
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 13,
  },
  feedbackActions: { flexDirection: 'row', gap: 10 },
  feedbackButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    borderRadius: radius.md,
    paddingVertical: 13,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.line,
  },
  feedbackButtonActive: { backgroundColor: colors.forest, borderColor: colors.forest },
  feedbackButtonDanger: { backgroundColor: colors.danger, borderColor: colors.danger },
  feedbackButtonText: { fontFamily: fonts.sansBold, color: colors.sage, fontSize: 13 },
  feedbackButtonTextDanger: { fontFamily: fonts.sansBold, color: colors.danger, fontSize: 13 },
  feedbackButtonTextActive: { color: colors.onDark },
  activeToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    marginBottom: 16,
    ...shadows.soft,
  },
  activeToggleTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  activeToggleTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.ink,
  },
  activeToggleSubtitle: {
    fontFamily: fonts.sans,
    fontSize: 11.5,
    color: colors.inkMuted,
    marginTop: 3,
    lineHeight: 16,
  },
});
