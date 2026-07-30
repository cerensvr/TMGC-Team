import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { CameraView, BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, ProductDraft } from '../types';
import { X, Barcode, ScanLine, Sparkles, PenLine, CameraOff } from 'lucide-react-native';
import { productService } from '../services/productService';
import { errorDev } from '../services/logger';
import { fonts, radius } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Scanner'>;
};

const GOLD = '#D8C39A';

// Dokunma alanlarını genişletmek için standart hitSlop
const TOUCH_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

const manualProductDraft: ProductDraft = {
  brand: '',
  name: '',
  category: 'Diğer',
  timeOfDay: 'both',
  imageUrl: '',
  description: '',
  activeIngredients: [],
  expiryDate: '',
};

export default function ScannerScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [lastCode, setLastCode] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    if (isScanning) return;
    navigation.goBack();
  }, [isScanning, navigation]);

  const openManualForm = useCallback(() => {
    if (isScanning) return;
    navigation.replace('ProductReview', { scannedProduct: manualProductDraft, source: 'manual' });
  }, [isScanning, navigation]);

  const lookupBarcode = useCallback(
    async (barcode: string) => {
      setIsScanning(true);
      setLastCode(barcode);

      try {
        const result = await productService.scanProduct({ barcode });
        if (result) {
          navigation.replace('ProductReview', { scannedProduct: result, source: 'barcode' });
          return;
        }

        Alert.alert(
          'Ürün Bulunamadı',
          'Open Beauty Facts veritabanında bu barkod için ürün bulunamadı. Ürünü manuel olarak ekleyebilirsiniz.',
          [
            { text: 'Manuel Ekle', onPress: openManualForm },
            { text: 'Tekrar Tara', style: 'cancel', onPress: () => setLastCode(null) },
          ]
        );
      } catch (error: any) {
        errorDev('Scan error:', error);

        let userMsg = 'Ürün bilgisi alınamadı. Manuel giriş ekranını açabilirsiniz.';
        if (error?.message?.toLowerCase().includes('network') || error?.code === 'ERR_NETWORK') {
          userMsg =
            'İnternet bağlantınız koptu. Bağlantınızı kontrol edip tekrar tarayabilir veya manuel ekleyebilirsiniz.';
        }

        Alert.alert('Barkod Okutulamadı', userMsg, [
          { text: 'Manuel Ekle', onPress: openManualForm },
          { text: 'Tekrar Tara', style: 'cancel', onPress: () => setLastCode(null) },
        ]);
      } finally {
        setIsScanning(false);
      }
    },
    [navigation, openManualForm]
  );

  const handleBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      const code = result.data?.trim();
      if (!code || isScanning || code === lastCode) {
        return;
      }

      void lookupBarcode(code);
    },
    [isScanning, lastCode, lookupBarcode]
  );

  const renderScannerContent = () => {
    if (!permission) {
      return (
        <View style={styles.permissionPanel}>
          <ActivityIndicator color={GOLD} />
          <Text style={styles.permissionText}>Kamera izni kontrol ediliyor...</Text>
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.permissionPanel}>
          <CameraOff size={36} color={GOLD} />
          <Text style={styles.permissionTitle}>Kamera izni gerekli</Text>
          <Text style={styles.permissionText}>
            {permission.canAskAgain
              ? 'Barkodu okutmak için kameraya izin ver.'
              : 'Kamera izni kapalı. Cihaz ayarlarından SkinShelf için kamera erişimini açabilirsin.'}
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={() => {
              if (permission.canAskAgain) {
                void requestPermission();
              } else {
                void Linking.openSettings();
              }
            }}
            activeOpacity={0.85}
            hitSlop={TOUCH_SLOP}
            accessibilityRole="button"
          >
            <Text style={styles.permissionButtonText}>
              {permission.canAskAgain ? 'İzin ver' : 'Ayarları aç'}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.camera}>
        <CameraView
          style={styles.cameraPreview}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
          }}
          onBarcodeScanned={isScanning ? undefined : handleBarcodeScanned}
        />
        <View style={styles.scannerFrame} pointerEvents="none">
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />

          {isScanning ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={GOLD} />
              <View style={styles.loadingBadge}>
                <Sparkles size={14} color={GOLD} />
                <Text style={styles.loadingText}>Ürün bilgisi alınıyor...</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.instruction}>Barkodu çerçevenin içine hizalayın</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          activeOpacity={0.8}
          disabled={isScanning}
          hitSlop={TOUCH_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Kapat"
        >
          <X size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Barkod Tara</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* KAMERA VEYA İZİN ALANI */}
      <View style={styles.scannerArea}>{renderScannerContent()}</View>

      {/* SEKMELER */}
      <View style={styles.tabsContainer}>
        <View style={[styles.tab, styles.activeTab]}>
          <Barcode size={19} color="#10130F" />
          <Text style={[styles.tabText, styles.activeTabText]}>Barkod Tara</Text>
        </View>

        <TouchableOpacity
          style={styles.tab}
          onPress={openManualForm}
          disabled={isScanning}
          activeOpacity={0.8}
          hitSlop={TOUCH_SLOP}
          accessibilityRole="button"
        >
          <PenLine size={19} color="#ffffff" />
          <Text style={styles.tabText}>Manuel Ekle</Text>
        </TouchableOpacity>
      </View>

      {/* FOOTER - TARAMA AKSİYON BUTONU */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.captureButton, isScanning && styles.captureButtonDisabled]}
          onPress={() => {
            if (!permission?.granted) {
              void requestPermission();
              return;
            }
            Alert.alert('Barkod Bekleniyor', 'Barkod kamerada göründüğünde otomatik okutulur.');
          }}
          disabled={isScanning}
          activeOpacity={0.85}
          hitSlop={TOUCH_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Manuel Tarama Tetikle"
        >
          <View style={styles.captureInner}>
            <ScanLine size={30} color="#10130F" />
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0C0F0C' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fonts.display,
    color: '#ffffff',
    fontSize: 21,
  },
  scannerArea: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 22 },
  camera: {
    width: '100%',
    aspectRatio: 3 / 4,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  cameraPreview: {
    ...StyleSheet.absoluteFillObject,
  },
  scannerFrame: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: { position: 'absolute', width: 42, height: 42, borderColor: GOLD, borderWidth: 0 },
  topLeft: { top: 16, left: 16, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: radius.xl },
  topRight: { top: 16, right: 16, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: radius.xl },
  bottomLeft: { bottom: 16, left: 16, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: radius.xl },
  bottomRight: { bottom: 16, right: 16, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: radius.xl },
  instruction: {
    fontFamily: fonts.sansSemiBold,
    color: '#ffffff',
    fontSize: 13.5,
    textAlign: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 10,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.xl,
  },
  loadingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(216,195,154,0.35)',
  },
  loadingText: {
    fontFamily: fonts.sansBold,
    color: '#ffffff',
    fontSize: 13.5,
  },
  permissionPanel: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionTitle: {
    fontFamily: fonts.sansBold,
    color: '#ffffff',
    fontSize: 18,
    marginTop: 16,
  },
  permissionText: {
    fontFamily: fonts.sans,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13.5,
    textAlign: 'center',
    marginTop: 8,
  },
  permissionButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: GOLD,
  },
  permissionButtonText: {
    fontFamily: fonts.sansBold,
    color: '#10130F',
    fontSize: 13.5,
  },
  tabsContainer: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 16, gap: 12 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  activeTab: { backgroundColor: GOLD, borderColor: GOLD },
  tabText: {
    fontFamily: fonts.sansBold,
    color: '#ffffff',
    marginLeft: 8,
    fontSize: 13.5,
  },
  activeTabText: { color: '#10130F' },
  footer: { alignItems: 'center', paddingBottom: 40, paddingTop: 10 },
  captureButton: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: 'rgba(216,195,154,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: GOLD,
  },
  captureInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F4EBDB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonDisabled: { opacity: 0.5 },
});
