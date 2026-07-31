import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Alert,
  Image,
  PanResponder,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, MainTabParamList, Product } from '../types';
import { useProducts } from '../context/ProductContext';
import { useUser } from '../context/UserContext';
import { AlertCircle, ArrowDownUp, Bell, Camera, Clock3, Plus, RotateCcw, ScanLine, Sparkles } from 'lucide-react-native';
import { getProductVisualSource } from '../services/productVisualCatalog';
import { errorDev } from '../services/logger';
import { getExpiryTimestamp, getRemainingDays } from '../services/expiryDate';
import {
  buildNotifications,
  countUnread,
  getReadNotificationIds,
} from '../services/notificationService';
import { colors, fonts, radius, shadows } from '../theme';

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: HomeScreenNavigationProp;
};

type SortMode = 'category' | 'name' | 'expiryDate';

// Dokunma alanlarını genişletmek için standart hitSlop
const TOUCH_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

const routineOrder: Product['category'][] = [
  'Temizleyici',
  'Tonik',
  'Serum',
  'Göz Kremi',
  'Nemlendirici',
  'Güneş Kremi',
  'Maske',
  'Diğer',
];

const isExpiringSoon = (dateString?: string) => {
  const days = getRemainingDays(dateString);
  return days !== null && days <= 60 && days >= 0;
};

const isExpired = (dateString?: string) => {
  const days = getRemainingDays(dateString);
  return days !== null && days < 0;
};

const getRoutineIndex = (category: Product['category']) => {
  const index = routineOrder.indexOf(category);
  return index === -1 ? 99 : index;
};

const buildShelfRows = (products: Product[]) => {
  const firstRowCount = products.length > 6 ? 4 : 3;
  const secondRowCount = products.length > 7 ? 3 : 2;

  return [
    products.slice(0, firstRowCount),
    products.slice(firstRowCount, firstRowCount + secondRowCount),
    products.slice(firstRowCount + secondRowCount),
  ];
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 6) return 'İyi geceler';
  if (hour < 12) return 'Günaydın';
  if (hour < 18) return 'İyi günler';
  return 'İyi akşamlar';
};

type ShelfProductProps = {
  product: Product;
  onDelete: () => void;
  onPress: () => void;
  onReorder: (productId: string, direction: -1 | 1) => void;
  disabled?: boolean;
};

const ShelfProduct = ({ product, onDelete, onPress, onReorder, disabled }: ShelfProductProps) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const [dragging, setDragging] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const expiring = isExpiringSoon(product.expiryDate);
  const expired = isExpired(product.expiryDate);
  const productImageSource = getProductVisualSource(product, imageFailed);

  useEffect(() => {
    setImageFailed(false);
  }, [product.cutoutImageUrl]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 10 || Math.abs(gesture.dy) > 10,
        onPanResponderGrant: () => {
          if (!disabled) setDragging(true);
        },
        onPanResponderMove: (_, gesture) => {
          if (!disabled) pan.setValue({ x: gesture.dx, y: gesture.dy });
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > 52) {
            onReorder(product.id, 1);
          } else if (gesture.dx < -52) {
            onReorder(product.id, -1);
          }

          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 7,
            tension: 80,
            useNativeDriver: false,
          }).start(() => setDragging(false));
        },
        onPanResponderTerminate: () => {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 7,
            tension: 80,
            useNativeDriver: false,
          }).start(() => setDragging(false));
        },
      }),
    [disabled, onReorder, pan, product.id]
  );

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.shelfProduct,
        dragging && styles.shelfProductDragging,
        { transform: pan.getTranslateTransform() },
      ]}
    >
      <TouchableOpacity
        style={styles.productTapArea}
        onPress={onPress}
        onLongPress={onDelete}
        activeOpacity={0.82}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${product.brand} ${product.name}`}
      >
        <View style={styles.productShadow} />

        {/* 1. YÖNTEM: İnternetten (barkodla) gelen görsellerin beyaz arka planını silip şeffaflaştırır */}
        <Image
          source={productImageSource}
          style={[
            styles.productPhoto,
            product.imageUrl ? ({ mixBlendMode: 'multiply' } as any) : null,
          ]}
          resizeMode="contain"
          onError={() => setImageFailed(true)}
        />

        {(expiring || expired) && (
          <View style={styles.expiryBadge}>
            <Text style={styles.expiryBadgeText}>
              {expired ? 'SKT' : `${getRemainingDays(product.expiryDate)}g`}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      <Text style={styles.productShelfName} numberOfLines={1}>
        {product.brand}
      </Text>
      <Text style={styles.productShelfType} numberOfLines={2}>
        {product.name}
      </Text>
    </Animated.View>
  );
};

type CabinetShelfRowProps = {
  products: Product[];
  index: number;
  onDelete: (product: Product) => void;
  onOpen: (product: Product) => void;
  onReorder: (productId: string, direction: -1 | 1) => void;
  disabled?: boolean;
};

const CabinetShelfRow = ({ products, index, onDelete, onOpen, onReorder, disabled }: CabinetShelfRowProps) => (
  <View style={styles.referenceShelfSlot}>
    <View style={styles.referenceProductsRow}>
      {products.map(product => (
        <ShelfProduct
          key={product.id}
          product={product}
          onPress={() => onOpen(product)}
          onDelete={() => onDelete(product)}
          onReorder={onReorder}
          disabled={disabled}
        />
      ))}
    </View>
    <View style={styles.referenceShelfBoard}>
      <View style={styles.referenceShelfHighlight} />
    </View>
    {products.length === 0 && (
      <View style={[styles.emptyShelfHint, index === 1 && styles.emptyShelfHintShort]} />
    )}
  </View>
);

export default function HomeScreen({ navigation }: Props) {
  const { products, deleteProduct, loadProducts, isLoading, loadError } = useProducts();
  const { profile, activeIssue, userId } = useUser();
  const [sortBy, setSortBy] = useState<SortMode>('category');
  const [shelfOrder, setShelfOrder] = useState<string[]>([]);
  const [doorOpen, setDoorOpen] = useState(true);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());
  const doorProgress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const productIds = products.map(product => product.id);
    setShelfOrder(previousOrder => [
      ...previousOrder.filter(productId => productIds.includes(productId)),
      ...productIds.filter(productId => !previousOrder.includes(productId)),
    ]);
  }, [products]);

  const displayedProducts = useMemo(() => {
    const orderIndex = new Map(shelfOrder.map((productId, index) => [productId, index]));
    const productsToDisplay = [...products];

    if (sortBy === 'name') {
      return productsToDisplay.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    }

    if (sortBy === 'expiryDate') {
      return productsToDisplay.sort((a, b) => {
        const dateA = getExpiryTimestamp(a.expiryDate);
        const dateB = getExpiryTimestamp(b.expiryDate);
        return dateA - dateB;
      });
    }

    return productsToDisplay.sort((a, b) => {
      const routineDiff = getRoutineIndex(a.category) - getRoutineIndex(b.category);
      if (routineDiff !== 0) return routineDiff;
      return (orderIndex.get(a.id) ?? 999) - (orderIndex.get(b.id) ?? 999);
    });
  }, [products, shelfOrder, sortBy]);

  const shelfRows = useMemo(() => buildShelfRows(displayedProducts), [displayedProducts]);

  const handleDoorToggle = () => {
    const nextOpenState = !doorOpen;
    setDoorOpen(nextOpenState);
    Animated.spring(doorProgress, {
      toValue: nextOpenState ? 1 : 0,
      friction: 8,
      tension: 72,
      useNativeDriver: false,
    }).start();
  };

  const handleShelfReorder = (productId: string, direction: -1 | 1) => {
    const visibleIds = displayedProducts.map(product => product.id);

    setShelfOrder(previousOrder => {
      const currentOrder = previousOrder.length ? [...previousOrder] : products.map(product => product.id);
      const localIndex = visibleIds.indexOf(productId);
      const targetLocalIndex = localIndex + direction;
      const targetId = visibleIds[targetLocalIndex];

      if (localIndex === -1 || !targetId) return currentOrder;

      const productIndex = currentOrder.indexOf(productId);
      const targetIndex = currentOrder.indexOf(targetId);

      if (productIndex === -1 || targetIndex === -1) return currentOrder;

      [currentOrder[productIndex], currentOrder[targetIndex]] = [currentOrder[targetIndex], currentOrder[productIndex]];
      return currentOrder;
    });
  };

  const handleDeleteProduct = async (userProductId: string) => {
    if (isDeletingProduct) return;
    setIsDeletingProduct(true);
    try {
      await deleteProduct(userProductId);
    } catch (error: any) {
      errorDev('Error deleting product:', error);
      let userMsg = 'Ürün silinemedi. Lütfen tekrar deneyin.';
      if (error?.message?.toLowerCase().includes('network') || error?.code === 'ERR_NETWORK') {
        userMsg = 'İnternet bağlantınızı kontrol edip tekrar deneyin.';
      }
      Alert.alert('Hata', userMsg);
    } finally {
      setIsDeletingProduct(false);
    }
  };

  const handleDelete = (product: Product) => {
    if (isDeletingProduct) return;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirmed = window.confirm(`${product.brand} - ${product.name} dolabınızdan kaldırılsın mı?`);
      if (confirmed) handleDeleteProduct(product.id);
      return;
    }

    Alert.alert(
      'Ürünü Sil',
      `${product.brand} - ${product.name} dolabınızdan kaldırılsın mı?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => handleDeleteProduct(product.id),
        },
      ]
    );
  };

  const leftDoorTranslate = doorProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -168],
  });

  const rightDoorTranslate = doorProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 168],
  });

  const doorOpacity = doorProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 0.34],
  });

  const firstName = profile.displayName?.trim().split(' ')[0];
  const notifications = useMemo(
    () => buildNotifications(products, profile, activeIssue),
    [activeIssue, products, profile]
  );
  const unreadNotificationCount = countUnread(notifications, readNotificationIds);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void getReadNotificationIds(userId)
        .then((ids) => {
          if (active) setReadNotificationIds(ids);
        })
        .catch((error) => {
          errorDev('Bildirim okuma durumu yüklenemedi:', error);
        });

      return () => {
        active = false;
      };
    }, [notifications, userId])
  );

  const expiringCount = useMemo(
    () => products.filter(product => isExpiringSoon(product.expiryDate) || isExpired(product.expiryDate)).length,
    [products]
  );

  // İLK YÜKLEME KONTROLÜ (Boş ekran çakışmasını engeller)
  const isInitialLoading = isLoading && products.length === 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}{firstName ? `, ${firstName}` : ''}</Text>
          <Text style={styles.headerTitle}>SkinShelf</Text>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Notifications')}
          hitSlop={TOUCH_SLOP}
          accessibilityRole="button"
          accessibilityLabel={
            unreadNotificationCount > 0
              ? `Bildirimler, ${unreadNotificationCount} okunmamış`
              : 'Bildirimler'
          }
        >
          <Bell size={20} color={colors.forest} />
          {unreadNotificationCount > 0 && <View style={styles.notificationDot} />}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => void loadProducts()}
            tintColor={colors.sage}
            colors={[colors.sage]}
          />
        }
      >
        {/* AĞ / YÜKLEME HATASI BANTI */}
        {loadError && (
          <View style={styles.loadErrorBanner}>
            <AlertCircle size={18} color={colors.danger} />
            <Text style={styles.loadErrorText}>{loadError}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => void loadProducts()}
              disabled={isLoading}
              activeOpacity={0.8}
              hitSlop={TOUCH_SLOP}
              accessibilityRole="button"
            >
              <RotateCcw size={15} color={colors.onDark} />
              <Text style={styles.retryButtonText}>{isLoading ? 'Yenileniyor' : 'Tekrar Dene'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* DOLAP BAŞLIĞI VE AKSİYONLAR */}
        <View style={styles.cabinetHeaderRow}>
          <View style={styles.cabinetTitleLine}>
            <View style={styles.cabinetTitleBlock}>
              <Text style={styles.cabinetOverline}>DİJİTAL RAFIN</Text>
              <Text style={styles.cabinetTitle}>Cilt Bakım Dolabı</Text>
              <Text style={styles.cabinetSubtitle}>
                Ürünlerini rafında sakla; içeriklerini ve rutin uyumunu Shelly ile kontrol et.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Scanner')}
              activeOpacity={0.85}
              hitSlop={TOUCH_SLOP}
              accessibilityRole="button"
            >
              <LinearGradient
                colors={['#1C4630', '#0F2919']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.addButton}
              >
                <Plus size={15} color={colors.onDark} />
                <Text style={styles.addButtonText}>Ürün Ekle</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.cabinetMetaRow}>
            <View style={styles.cabinetMetaPill}>
              <Sparkles size={12} color={colors.gold} />
              <Text style={styles.cabinetMetaText}>{products.length} ürün rafında</Text>
            </View>
            {expiringCount > 0 && (
              <View style={[styles.cabinetMetaPill, styles.cabinetMetaPillWarning]}>
                <Clock3 size={12} color={colors.warning} />
                <Text style={[styles.cabinetMetaText, { color: colors.warning }]}>
                  {expiringCount} ürün SKT takibinde
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.cabinetMetaPill, styles.cabinetMetaPillSage]}
              onPress={() => navigation.navigate('SkinTracking')}
              activeOpacity={0.8}
              hitSlop={TOUCH_SLOP}
              accessibilityRole="button"
            >
              <Camera size={12} color={colors.sage} />
              <Text style={[styles.cabinetMetaText, { color: colors.sage }]}>Cilt Takibi</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SIRALAMA SEÇENEKLERİ */}
        <View style={styles.sortContainer}>
          <View style={styles.sortHeader}>
            <ArrowDownUp size={15} color={colors.sage} />
            <Text style={styles.sortLabel}>Dolap düzeni</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortOptions}>
            {(
              [
                ['category', 'Kategori'],
                ['name', 'İsim'],
                ['expiryDate', 'Son Kullanma'],
              ] as [SortMode, string][]
            ).map(([mode, label]) => (
              <TouchableOpacity
                key={mode}
                style={[styles.sortButton, sortBy === mode && styles.sortButtonActive]}
                onPress={() => setSortBy(mode)}
                activeOpacity={0.8}
                hitSlop={TOUCH_SLOP}
              >
                <Text style={[styles.sortButtonText, sortBy === mode && styles.sortButtonTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* DOLAP GÖRSEL ALANI */}
        <View style={styles.cabinetShell}>
          <LinearGradient
            colors={['#FDFBF4', '#F6F3E8', '#EFEBDC']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.cabinetTopLip} />
          <View style={styles.leftWallShadow} />
          <View style={styles.rightWallShadow} />

          {/* 1. YÜKLEME DURUMU (INITIAL LOADING) */}
          {isInitialLoading ? (
            <View style={{ paddingVertical: 60, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="small" color={colors.sage} />
              <Text style={{ marginTop: 12, fontFamily: fonts.sansSemiBold, fontSize: 13, color: colors.inkSoft }}>
                Dolabındaki ürünler hazırlanıyor...
              </Text>
            </View>
          ) : products.length === 0 ? (
            /* 2. BOŞ DOLAP DURUMU (EMPTY STATE) */
            <View style={styles.emptyCabinet}>
              <View style={styles.emptyShelfLine} />
              <View style={styles.emptyShelfLineShort} />
              <Text style={styles.emptyTitle}>Rafın seni bekliyor</Text>
              <Text style={styles.emptyText}>
                İlk ürününü barkodla ya da manuel ekle. Shelly cildinle uyumunu ve rutinindeki yerini takip etsin.
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Scanner')}
                activeOpacity={0.88}
                hitSlop={TOUCH_SLOP}
                accessibilityRole="button"
              >
                <LinearGradient
                  colors={['#1C4630', '#0F2919']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.scanButton}
                >
                  <ScanLine size={20} color={colors.onDark} style={{ marginRight: 9 }} />
                  <Text style={styles.scanButtonText}>Barkod Okut / Ürün Ekle</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            /* 3. DOLAPTAKİ ÜRÜNLER */
            <View style={styles.referenceShelvesContainer}>
              {shelfRows.map((rowProducts, index) => (
                <CabinetShelfRow
                  key={`shelf-${index}`}
                  index={index}
                  products={rowProducts}
                  onOpen={product => navigation.navigate('ProductDetail', { productId: product.id })}
                  onDelete={handleDelete}
                  onReorder={handleShelfReorder}
                  disabled={isDeletingProduct}
                />
              ))}
            </View>
          )}

          {/* DOLAP KAPAKLARI */}
          <Animated.View
            style={[
              styles.doorPanel,
              styles.leftDoor,
              {
                opacity: doorOpacity,
                transform: [{ translateX: leftDoorTranslate }],
              },
            ]}
          >
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleDoorToggle} activeOpacity={0.9} />
            <View style={styles.doorInset} />
            <View style={styles.doorHandleLeft} />
          </Animated.View>

          <Animated.View
            style={[
              styles.doorPanel,
              styles.rightDoor,
              {
                opacity: doorOpacity,
                transform: [{ translateX: rightDoorTranslate }],
              },
            ]}
          >
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleDoorToggle} activeOpacity={0.9} />
            <View style={styles.doorInset} />
            <View style={styles.doorHandleRight} />
          </Animated.View>
        </View>
      </ScrollView>

      {/* FLOATING ADD BUTTON (FAB) */}
      {products.length > 0 && (
        <TouchableOpacity
          onPress={() => navigation.navigate('Scanner')}
          activeOpacity={0.88}
          style={styles.fabWrapper}
          hitSlop={TOUCH_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Yeni Ürün Ekle"
        >
          <LinearGradient
            colors={['#1C4630', '#0F2919']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fab}
          >
            <Plus size={24} color={colors.onDark} />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const androidHeaderPadding = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 14 : 12;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: androidHeaderPadding,
    paddingBottom: 14,
    paddingHorizontal: 22,
  },
  greeting: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.gold,
    marginBottom: 3,
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 27,
    color: colors.forest,
  },
  notificationButton: {
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
  notificationDot: {
    position: 'absolute',
    top: 11,
    right: 12,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.gold,
  },
  scrollContent: { paddingBottom: 170 },
  loadErrorBanner: {
    marginHorizontal: 22,
    marginTop: 8,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#F2C7C2',
    backgroundColor: colors.dangerSurface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadErrorText: {
    flex: 1,
    fontFamily: fonts.sansSemiBold,
    color: colors.danger,
    fontSize: 12.5,
    lineHeight: 18,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.forest,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  retryButtonText: {
    fontFamily: fonts.sansBold,
    color: colors.onDark,
    fontSize: 11.5,
  },
  cabinetHeaderRow: {
    marginHorizontal: 22,
    marginTop: 8,
    marginBottom: 14,
  },
  cabinetTitleLine: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  cabinetTitleBlock: { flex: 1, paddingRight: 4 },
  cabinetOverline: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.sage,
    marginBottom: 6,
  },
  cabinetTitle: {
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 32,
    color: colors.ink,
  },
  cabinetSubtitle: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.inkMuted,
    marginTop: 6,
    lineHeight: 19,
    maxWidth: 260,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: radius.pill,
    ...shadows.card,
  },
  addButtonText: {
    fontFamily: fonts.sansBold,
    fontSize: 12.5,
    letterSpacing: 0.2,
    color: colors.onDark,
  },
  cabinetMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 13 },
  cabinetMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.lineGold,
  },
  cabinetMetaPillWarning: { borderColor: '#EFDDB4', backgroundColor: colors.warningSurface },
  cabinetMetaPillSage: { borderColor: colors.lineSage, backgroundColor: colors.surfaceSage },
  cabinetMetaText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: colors.inkSoft,
  },
  sortContainer: {
    marginHorizontal: 22,
    marginBottom: 18,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 13,
    ...shadows.soft,
  },
  sortHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sortLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.forest,
    marginLeft: 7,
  },
  sortOptions: { paddingBottom: 2 },
  sortButton: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.pill,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sortButtonActive: { backgroundColor: colors.forest, borderColor: colors.forest },
  sortButtonText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: colors.inkMuted,
  },
  sortButtonTextActive: { color: colors.onDark },
  cabinetShell: {
    marginHorizontal: 20,
    borderRadius: radius.xl,
    backgroundColor: '#F7F6EF',
    borderWidth: 1,
    borderColor: '#E3E0D2',
    overflow: 'hidden',
    minHeight: 820,
    position: 'relative',
    ...shadows.floating,
  },
  cabinetTopLip: {
    height: 22,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderBottomWidth: 1,
    borderBottomColor: '#E9E6D8',
  },
  leftWallShadow: {
    position: 'absolute',
    top: 22,
    bottom: 0,
    left: 0,
    width: 28,
    backgroundColor: 'rgba(26,33,28,0.05)',
  },
  rightWallShadow: {
    position: 'absolute',
    top: 22,
    bottom: 0,
    right: 0,
    width: 28,
    backgroundColor: 'rgba(26,33,28,0.05)',
  },
  referenceShelvesContainer: {
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 22,
    gap: 14,
  },
  referenceShelfSlot: {
    minHeight: 226,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  referenceProductsRow: {
    minHeight: 198,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    gap: 8,
    paddingHorizontal: 4,
    paddingBottom: 13,
    zIndex: 2,
  },
  referenceShelfBoard: {
    height: 18,
    borderRadius: 6,
    backgroundColor: '#FCFAF3',
    borderWidth: 1,
    borderColor: '#E6E2D2',
    borderBottomWidth: 2,
    borderBottomColor: '#D9D4C1',
    shadowColor: '#2A2F2A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 3,
  },
  referenceShelfHighlight: {
    height: 5,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  emptyShelfHint: {
    position: 'absolute',
    bottom: 52,
    alignSelf: 'center',
    width: '54%',
    height: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(206,212,201,0.4)',
  },
  emptyShelfHintShort: { width: '38%' },
  shelfProduct: {
    width: 112,
    height: 198,
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  shelfProductDragging: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 9,
  },
  productTapArea: {
    width: 112,
    height: 158,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  productShadow: {
    position: 'absolute',
    bottom: 2,
    width: 82,
    height: 14,
    borderRadius: 50,
    backgroundColor: 'rgba(74,86,78,0.14)',
  },
  productPhoto: {
    width: 110,
    height: 170,
  },
  productShelfName: {
    maxWidth: 102,
    minHeight: 15,
    marginTop: 4,
    fontFamily: fonts.sansExtraBold,
    color: colors.inkMuted,
    fontSize: 9,
    letterSpacing: 0.8,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  productShelfType: {
    width: 106,
    minHeight: 27,
    fontFamily: fonts.sansBold,
    color: colors.ink,
    fontSize: 10.5,
    lineHeight: 14,
    textAlign: 'center',
  },
  expiryBadge: {
    position: 'absolute',
    top: 8,
    right: 2,
    minWidth: 30,
    height: 22,
    paddingHorizontal: 7,
    borderRadius: 11,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.soft,
  },
  expiryBadgeText: {
    fontFamily: fonts.sansExtraBold,
    color: colors.onDark,
    fontSize: 10,
  },
  doorPanel: {
    position: 'absolute',
    top: 22,
    bottom: 0,
    width: '50%',
    backgroundColor: '#EBEFE8',
    borderColor: '#C9D2C6',
    shadowColor: colors.forestDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 7,
    zIndex: 8,
  },
  leftDoor: {
    left: 0,
    borderRightWidth: 1,
  },
  rightDoor: {
    right: 0,
    borderLeftWidth: 1,
  },
  doorInset: {
    position: 'absolute',
    top: 24,
    left: 18,
    right: 18,
    bottom: 32,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(66,101,74,0.26)',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  doorHandleLeft: {
    position: 'absolute',
    right: 14,
    top: '48%',
    width: 8,
    height: 58,
    borderRadius: 8,
    backgroundColor: colors.sage,
  },
  doorHandleRight: {
    position: 'absolute',
    left: 14,
    top: '48%',
    width: 8,
    height: 58,
    borderRadius: 8,
    backgroundColor: colors.sage,
  },
  emptyCabinet: {
    minHeight: 710,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  emptyShelfLine: { width: '84%', height: 14, borderRadius: 10, backgroundColor: '#FFFFFF', marginBottom: 38 },
  emptyShelfLineShort: { width: '58%', height: 12, borderRadius: 10, backgroundColor: '#E2E0D4', marginBottom: 34 },
  emptyTitle: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.forest,
    marginBottom: 10,
  },
  emptyText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: 'center',
    marginBottom: 26,
    lineHeight: 21,
  },
  scanButton: {
    flexDirection: 'row',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: radius.pill,
    alignItems: 'center',
    ...shadows.card,
  },
  scanButtonText: {
    fontFamily: fonts.sansBold,
    color: colors.onDark,
    fontSize: 14.5,
    letterSpacing: 0.2,
  },
  fabWrapper: {
    position: 'absolute',
    bottom: 96,
    right: 24,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.floating,
  },
});