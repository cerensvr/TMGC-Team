import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  MessageCircle,
  Moon,
  Plus,
  RotateCcw,
  Send,
  Sun,
  X,
} from 'lucide-react-native';
import { MainTabParamList, Product, RootStackParamList } from '../types';
import { useProducts } from '../context/ProductContext';
import { useUser } from '../context/UserContext';
import { buildWeekPlan, detectConcern, RoutineSlot } from '../services/routinePlanner';
import { getRoutineReview, getProductRole } from '../services/shellyInsights';
import { colors, fonts, radius, shadows, tabBarStyle } from '../theme';
import ShellyIcon from '../components/ShellyIcon';

type RoutineScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Routine'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: RoutineScreenNavigationProp;
};

// Dokunma alanlarını genişletmek için standart hitSlop
const TOUCH_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

const ProductRoutineRow = ({ product, onPress }: { product: Product; onPress: () => void }) => (
  <TouchableOpacity
    style={styles.productRow}
    onPress={onPress}
    activeOpacity={0.75}
    hitSlop={TOUCH_SLOP}
    accessibilityRole="button"
    accessibilityLabel={`${product.brand} ${product.name}`}
  >
    <View style={styles.productDot} />
    <View style={styles.productTextBlock}>
      <Text style={styles.productBrand} numberOfLines={1}>
        {product.brand}
      </Text>
      <Text style={styles.productName} numberOfLines={1}>
        {product.name}
      </Text>
    </View>
    <Text style={styles.productCategory}>{product.category}</Text>
  </TouchableOpacity>
);

const RoutineBlock = ({
  title,
  slot,
  products,
  note,
  navigation,
  isSafeMode,
}: {
  title: string;
  slot: RoutineSlot;
  products: Product[];
  note: string;
  navigation: RoutineScreenNavigationProp;
  isSafeMode?: boolean;
}) => {
  const filteredProducts = useMemo(() => {
    if (!isSafeMode) return products;

    return products.filter((product) => {
      const role = getProductRole(product);
      return !['retinol', 'peeling', 'vitaminC', 'acne'].includes(role);
    });
  }, [products, isSafeMode]);

  return (
    <View style={styles.routineBlock}>
      <View style={styles.routineBlockHeader}>
        <View style={styles.routineTitleWrap}>
          <View
            style={[
              styles.slotIcon,
              slot === 'morning' ? styles.slotIconMorning : styles.slotIconEvening,
            ]}
          >
            {slot === 'morning' ? (
              <Sun size={17} color={colors.warning} />
            ) : (
              <Moon size={17} color={colors.sage} />
            )}
          </View>
          <Text style={styles.routineBlockTitle}>{title}</Text>
        </View>
        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>
            {slot === 'morning' ? 'SPF kontrolü' : 'Aktifler ayrıldı'}
          </Text>
        </View>
      </View>

      <View style={styles.routineNote}>
        <CheckCircle2 size={15} color={colors.sage} />
        <Text style={styles.routineNoteText}>{note}</Text>
      </View>

      {filteredProducts.length ? (
        filteredProducts.map((product) => (
          <ProductRoutineRow
            key={product.id}
            product={product}
            onPress={() => navigation.navigate('ProductDetail', { productId: product.id })}
          />
        ))
      ) : (
        <Text style={styles.emptyRoutineText}>Dolabında bu adım için uygun ürün yok.</Text>
      )}

      {isSafeMode && products.length > filteredProducts.length && (
        <View style={styles.safeModeBadge}>
          <Text style={styles.safeModeBadgeText}>Agresif aktifler geçici olarak gizlendi</Text>
        </View>
      )}
    </View>
  );
};

export default function RoutineScreen({ navigation }: Props) {
  const { products, isLoading, loadError, loadProducts } = useProducts();
  const { profile, activeIssue, setActiveIssue } = useUser();
  const [isWeekPlanVisible, setIsWeekPlanVisible] = useState(false);

  const activeProducts = useMemo(() => {
    return products.filter((p) => (p as any).isActive ?? (p as any).is_active ?? true);
  }, [products]);

  const [currentDay, setCurrentDay] = useState(() => new Date().getDay());

  useFocusEffect(
    useCallback(() => {
      setCurrentDay(new Date().getDay());
    }, [])
  );

  const concern = useMemo(() => {
    if (activeIssue) return detectConcern(activeIssue);
    if (profile.mainGoal) return detectConcern(profile.mainGoal);
    return 'standard' as const;
  }, [activeIssue, profile.mainGoal]);

  const weekPlan = useMemo(
    () => buildWeekPlan(activeProducts, concern, { isPregnant: profile.isPregnant }),
    [activeProducts, concern, profile.isPregnant]
  );
  const todayPlan = weekPlan[currentDay === 0 ? 6 : currentDay - 1];

  const routineReview = useMemo(
    () => getRoutineReview(todayPlan?.morning || [], todayPlan?.evening || []),
    [todayPlan]
  );

  const handleRecovery = () => {
    Alert.alert(
      'Tebrikler!',
      'Cildinizdeki sorun çözülmüş gibi görünüyor. Normal rutine dönüyorsunuz.',
      [{ text: 'Tamam', onPress: () => setActiveIssue(null) }]
    );
  };

  useEffect(() => {
    const tabNavigation = navigation as any;

    tabNavigation.setOptions({
      tabBarStyle: isWeekPlanVisible ? { display: 'none' } : tabBarStyle,
    });

    return () => {
      tabNavigation.setOptions({ tabBarStyle });
    };
  }, [isWeekPlanVisible, navigation]);

  // İLK YÜKLEME KONTROLÜ
  const isInitialLoading = isLoading && products.length === 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* GÜVENLİ MOD UYARI BANTI */}
      {activeIssue && (
        <View style={styles.safeModeWarningBanner}>
          <View style={styles.safeModeWarningContent}>
            <AlertTriangle size={20} color={colors.onDark} />
            <View style={styles.safeModeWarningText}>
              <Text style={styles.safeModeWarningTitle}>Güvenli Mod Aktif</Text>
              <Text style={styles.safeModeWarningMessage}>
                Cildinizdeki{' '}
                <Text style={{ fontFamily: fonts.sansExtraBold }}>{activeIssue}</Text> nedeniyle
                rutininiz optimize edildi.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.safeModeRecoveryButton}
            onPress={handleRecovery}
            activeOpacity={0.8}
            hitSlop={TOUCH_SLOP}
            accessibilityRole="button"
          >
            <Text style={styles.safeModeRecoveryButtonText}>İyileşti</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>Rutinim</Text>
        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={() => navigation.navigate('Assistant')}
          activeOpacity={0.75}
          hitSlop={TOUCH_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Shelly Asistan"
        >
          <ShellyIcon size={32} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* AĞ YÜKLEME HATASI BANTI */}
        {loadError && (
          <View
            style={{
              backgroundColor: '#FDE8E8',
              borderRadius: radius.md,
              padding: 12,
              marginBottom: 16,
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
              onPress={() => void loadProducts()}
              disabled={isLoading}
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

        {/* SHELLY ÖZET KARTI */}
        <LinearGradient
          colors={['#1C4630', '#0F2919']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryCard}
        >
          <View style={styles.summaryHeader}>
            <ShellyIcon size={42} style={styles.summaryIcon} />
            <View style={styles.summaryTextBlock}>
              <Text style={styles.summaryTitle}>Shelly’nin Yorumu</Text>
              <Text style={styles.summarySubtitle}>
                Cilt tipi: {profile.skinType || 'Belirlenmedi'} • Kaynak: Dolabım
              </Text>
            </View>
          </View>
          <View style={styles.summaryChipRow}>
            <View style={styles.summaryChip}>
              <Text style={styles.summaryChipText}>Dolabımdan seçildi</Text>
            </View>
            <View style={styles.summaryChip}>
              <Text style={styles.summaryChipText}>{activeProducts.length} aktif ürün</Text>
            </View>
          </View>
          <Text style={styles.summaryText}>
            {routineReview.morningNote} {routineReview.eveningNote}
          </Text>
        </LinearGradient>

        {/* SHELLY'YE SOR KOMPOZİTÖRi */}
        <TouchableOpacity
          style={styles.assistantComposer}
          onPress={() => navigation.navigate('Assistant')}
          activeOpacity={0.8}
          hitSlop={TOUCH_SLOP}
          accessibilityRole="button"
        >
          <View style={styles.composerIcon}>
            <MessageCircle size={20} color={colors.sage} />
          </View>
          <View style={styles.composerTextBlock}>
            <Text style={styles.composerLabel}>SHELLY’YE SOR</Text>
            <Text style={styles.composerPlaceholder} numberOfLines={1}>
              Bugün cildimde bir değişiklik var...
            </Text>
          </View>
          <View style={styles.composerSend}>
            <Send size={17} color={colors.onDark} />
          </View>
        </TouchableOpacity>

        {/* 1. YÜKLEME DURUMU */}
        {isInitialLoading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={colors.sage} />
            <Text
              style={{
                marginTop: 10,
                fontFamily: fonts.sansSemiBold,
                fontSize: 13,
                color: colors.inkSoft,
              }}
            >
              Cilt bakım rutininiz hazırlanıyor...
            </Text>
          </View>
        ) : products.length === 0 ? (
          /* 2. BOŞ DOLAP / RUTİN DURUMU (EMPTY STATE) */
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.xl,
              padding: 24,
              alignItems: 'center',
              marginTop: 10,
              borderWidth: 1,
              borderColor: colors.line,
              ...shadows.soft,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.display,
                fontSize: 22,
                color: colors.forest,
                marginBottom: 8,
              }}
            >
              Dolabınızda Ürün Yok
            </Text>
            <Text
              style={{
                fontFamily: fonts.sansSemiBold,
                fontSize: 14,
                color: colors.inkSoft,
                textAlign: 'center',
                marginBottom: 16,
              }}
            >
              Kişiselleştirilmiş günlük rutin oluşturabilmemiz için dolabınıza en az bir ürün
              eklemeniz gerekiyor.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Scanner')}
              activeOpacity={0.85}
              hitSlop={TOUCH_SLOP}
              style={{
                backgroundColor: colors.forest,
                paddingVertical: 12,
                paddingHorizontal: 20,
                borderRadius: radius.md,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Plus size={16} color={colors.onDark} />
              <Text style={{ fontFamily: fonts.sansBold, fontSize: 14, color: colors.onDark }}>
                İlk Ürününü Ekle
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* 3. BUGÜNKÜ RUTİN PLAN BÖLÜMÜ */
          todayPlan && (
            <View>
              <View style={styles.todayHeader}>
                <Text style={styles.todayTitle}>Bugün kullan</Text>
                <TouchableOpacity
                  style={styles.weekInlineButton}
                  onPress={() => setIsWeekPlanVisible(true)}
                  activeOpacity={0.78}
                  hitSlop={TOUCH_SLOP}
                  accessibilityRole="button"
                >
                  <Calendar size={15} color={colors.sage} />
                  <Text style={styles.weekInlineButtonText}>Haftalık plan</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.todaySection}>
                <RoutineBlock
                  title="Sabah rutini"
                  slot="morning"
                  products={todayPlan.morning}
                  note={routineReview.morningNote}
                  navigation={navigation}
                  isSafeMode={activeIssue !== null}
                />
                <RoutineBlock
                  title="Akşam rutini"
                  slot="evening"
                  products={todayPlan.evening}
                  note={routineReview.eveningNote}
                  navigation={navigation}
                  isSafeMode={activeIssue !== null}
                />
              </View>
            </View>
          )
        )}
      </ScrollView>

      {/* HAFTALIK PLAN MODALI */}
      <Modal
        visible={isWeekPlanVisible}
        animationType="slide"
        onRequestClose={() => setIsWeekPlanVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <SafeAreaView style={styles.weekPanel}>
            <View style={styles.weekPanelHeader}>
              <View style={styles.weekPanelTitleBlock}>
                <Text style={styles.weekPanelTitle}>Haftalık Plan</Text>
                <Text style={styles.weekPanelSubtitle}>
                  Shelly dolabındaki ürünlere göre sabah ve akşam rutinini dengeli planlar.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsWeekPlanVisible(false)}
                activeOpacity={0.75}
                hitSlop={TOUCH_SLOP}
                accessibilityRole="button"
                accessibilityLabel="Kapat"
              >
                <X size={20} color={colors.forest} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.weekList}>
              {weekPlan.map((dayPlan) => (
                <View key={dayPlan.day} style={styles.dayCard}>
                  <View style={styles.dayCardHeader}>
                    <Text style={styles.dayTitle}>{dayPlan.day}</Text>
                    <View style={styles.focusPill}>
                      <Text style={styles.focusPillText}>{dayPlan.focus}</Text>
                    </View>
                  </View>

                  <View style={styles.daySlot}>
                    <Sun size={15} color={colors.warning} />
                    <Text style={styles.slotLabel}>Sabah</Text>
                  </View>
                  {dayPlan.morning.slice(0, 4).map((product) => (
                    <Text
                      key={`${dayPlan.day}-m-${product.id}`}
                      style={styles.dayProduct}
                      numberOfLines={1}
                    >
                      {product.category} • {product.name}
                    </Text>
                  ))}

                  <View style={styles.daySlot}>
                    <Moon size={15} color={colors.sage} />
                    <Text style={styles.slotLabel}>Akşam</Text>
                  </View>
                  {dayPlan.evening.slice(0, 4).map((product) => (
                    <Text
                      key={`${dayPlan.day}-e-${product.id}`}
                      style={styles.dayProduct}
                      numberOfLines={1}
                    >
                      {product.category} • {product.name}
                    </Text>
                  ))}
                </View>
              ))}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const androidHeaderPadding = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 14 : 20;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingTop: androidHeaderPadding,
    paddingBottom: 16,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerSpacer: { width: 44 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.display,
    fontSize: 25,
    color: colors.forest,
  },
  headerIconButton: {
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
  content: { padding: 22, paddingBottom: 150 },
  summaryCard: {
    borderRadius: radius.xl,
    padding: 20,
    marginBottom: 16,
    ...shadows.card,
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 13 },
  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    marginRight: 12,
  },
  summaryTextBlock: { flex: 1 },
  summaryTitle: {
    fontFamily: fonts.display,
    fontSize: 19,
    color: colors.onDark,
  },
  summarySubtitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11.5,
    color: colors.onDarkSoft,
    marginTop: 3,
  },
  summaryText: {
    fontFamily: fonts.sans,
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13.5,
    lineHeight: 21,
  },
  summaryChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  summaryChip: {
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  summaryChipText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11.5,
    color: colors.goldSoft,
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  todayTitle: {
    fontFamily: fonts.display,
    color: colors.ink,
    fontSize: 21,
  },
  weekInlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.lineSage,
    ...shadows.soft,
  },
  weekInlineButtonText: {
    fontFamily: fonts.sansBold,
    color: colors.sage,
    fontSize: 12,
  },
  todaySection: { gap: 14, marginBottom: 18 },
  routineBlock: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.soft,
  },
  routineBlockHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11, gap: 8 },
  routineTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 },
  slotIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotIconMorning: { backgroundColor: colors.warningSurface },
  slotIconEvening: { backgroundColor: colors.surfaceSage },
  routineBlockTitle: {
    fontFamily: fonts.sansBold,
    color: colors.ink,
    fontSize: 16,
  },
  statusPill: {
    backgroundColor: colors.surfaceSage,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.lineSage,
  },
  statusPillText: {
    fontFamily: fonts.sansBold,
    color: colors.sage,
    fontSize: 10.5,
  },
  routineNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: 11,
    marginBottom: 4,
  },
  routineNoteText: {
    flex: 1,
    fontFamily: fonts.sansSemiBold,
    color: colors.inkSoft,
    fontSize: 12,
    lineHeight: 18,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceMuted,
  },
  productDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.gold, marginRight: 11 },
  productTextBlock: { flex: 1 },
  productBrand: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 10,
    color: colors.inkMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  productName: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.ink,
    marginTop: 2,
  },
  productCategory: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    color: colors.sage,
    marginLeft: 8,
  },
  emptyRoutineText: {
    fontFamily: fonts.sans,
    color: colors.inkMuted,
    fontSize: 13,
    paddingVertical: 6,
  },
  assistantComposer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 13,
    borderWidth: 1,
    borderColor: colors.lineGold,
    marginBottom: 20,
    ...shadows.card,
  },
  composerIcon: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: colors.surfaceSage,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  composerTextBlock: { flex: 1 },
  composerLabel: {
    fontFamily: fonts.sansExtraBold,
    color: colors.gold,
    fontSize: 10,
    letterSpacing: 1.6,
    marginBottom: 3,
  },
  composerPlaceholder: {
    fontFamily: fonts.sansSemiBold,
    color: colors.inkMuted,
    fontSize: 14.5,
  },
  composerSend: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.forest,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.background,
  },
  weekPanel: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 18 : 18,
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  weekPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  weekPanelTitleBlock: { flex: 1, paddingRight: 4 },
  weekPanelTitle: {
    fontFamily: fonts.display,
    color: colors.ink,
    fontSize: 26,
  },
  weekPanelSubtitle: {
    fontFamily: fonts.sans,
    color: colors.inkMuted,
    fontSize: 13,
    marginTop: 5,
    lineHeight: 19,
  },
  closeButton: {
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
  weekList: { gap: 12, paddingBottom: 8 },
  dayCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.soft,
  },
  dayCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 11 },
  dayTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.forest,
  },
  focusPill: {
    flexShrink: 1,
    backgroundColor: colors.surfaceBlush,
    borderRadius: radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.lineBlush,
  },
  focusPillText: {
    fontFamily: fonts.sansBold,
    color: colors.blush,
    fontSize: 11,
  },
  daySlot: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 7, marginBottom: 5 },
  slotLabel: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 11,
    color: colors.inkMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  dayProduct: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
    color: colors.inkSoft,
    marginBottom: 4,
  },
  safeModeWarningBanner: {
    backgroundColor: '#C15B41',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  safeModeWarningContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  safeModeWarningText: {
    flex: 1,
  },
  safeModeWarningTitle: {
    fontFamily: fonts.sansExtraBold,
    color: colors.onDark,
    fontSize: 13,
  },
  safeModeWarningMessage: {
    fontFamily: fonts.sansSemiBold,
    color: 'rgba(255,255,255,0.92)',
    fontSize: 11,
    marginTop: 2,
  },
  safeModeRecoveryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    marginLeft: 10,
  },
  safeModeRecoveryButtonText: {
    fontFamily: fonts.sansExtraBold,
    color: '#C15B41',
    fontSize: 11,
  },
  safeModeBadge: {
    backgroundColor: colors.surfaceBlush,
    borderRadius: radius.sm,
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.lineBlush,
  },
  safeModeBadgeText: {
    fontFamily: fonts.sansBold,
    color: colors.blush,
    fontSize: 11,
  },
});
