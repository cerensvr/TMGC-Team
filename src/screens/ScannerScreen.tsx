import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, ProductDraft } from '../types';
import { X, Barcode, ScanLine, Sparkles, PenLine, CameraOff, Camera } from 'lucide-react-native';
import { productService } from '../services/productService';
import { recognizeProductPhoto } from '../services/productRecognitionService';
import { errorDev } from '../services/logger';
import { fonts, radius } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Scanner'>;
};

const GOLD = '#D8C39A';
type ScanMode = 'photo' | 'barcode';
type ScannerNotice = { title: string; message: string };

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
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<ScanMode>('photo');
  const [cameraReady, setCameraReady] = useState(false);
  const [notice, setNotice] = useState<ScannerNotice | null>(null);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = setTimeout(() => setNotice(null), 3400);
    return () => clearTimeout(timeout);
  }, [notice]);

  const showNotice = useCallback((title: string, message: string) => {
    setNotice({ title, message });
  }, []);

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

  const recognizeVisibleProduct = useCallback(async () => {
    if (isScanning) return;
    if (!permission?.granted) {
      void requestPermission();
      return;
    }
    if (!cameraReady || !cameraRef.current) {
      showNotice('Kamera Hazırlanıyor', 'Kamera hazır olduğunda tekrar deneyin.');
      return;
    }

    setNotice(null);
    setIsScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.35,
        skipProcessing: false,
      });

      if (!photo?.base64) {
        throw new Error('Fotoğraf verisi alınamadı.');
      }

      const result = await recognizeProductPhoto({
        imageBase64: photo.base64,
        imageMimeType: 'image/jpeg',
      });

      navigation.replace('ProductReview', {
        scannedProduct: result.product,
        source: 'photo',
        previewImageUri: photo.uri,
        recognitionConfidence: result.confidence,
      });
    } catch (error: any) {
      errorDev('Product photo recognition error:', error);

      const message = String(error?.message || '');
      let userMessage = 'Ürün fotoğraftan tanınamadı. Ön etiketi daha yakından ve net çekip tekrar deneyin.';
      if (message.toLocaleLowerCase('tr-TR').includes('yoğun') || message.includes('429')) {
        userMessage = 'Görsel tanıma şu an yoğun. Biraz sonra tekrar deneyin.';
      } else if (message.toLocaleLowerCase('tr-TR').includes('network')) {
        userMessage = 'İnternet bağlantınızı kontrol edip tekrar deneyin.';
      }

      showNotice('Ürün Tanınamadı', userMessage);
    } finally {
      setIsScanning(false);
    }
  }, [cameraReady, isScanning, navigation, permission?.granted, requestPermission, showNotice]);

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
              ? 'Ürünü fotoğraftan tanımak veya barkodunu okutmak için kameraya izin ver.'
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
          ref={cameraRef}
          style={styles.cameraPreview}
          facing="back"
          onCameraReady={() => setCameraReady(true)}
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
          }}
          onBarcodeScanned={scanMode === 'barcode' && !isScanning ? handleBarcodeScanned : undefined}
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
                <Text style={styles.loadingText}>
                  {scanMode === 'photo' ? 'Ürün görselden tanınıyor...' : 'Ürün bilgisi alınıyor...'}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.instruction}>
              {scanMode === 'photo'
                ? 'Ürünün ön etiketini çerçeveye yerleştirip aşağıdaki düğmeye basın'
                : 'Barkodu çerçevenin içine hizalayın'}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {notice && (
        <View
          style={styles.notice}
          pointerEvents="none"
          accessibilityLiveRegion="polite"
        >
          <Text style={styles.noticeTitle}>{notice.title}</Text>
          <Text style={styles.noticeMessage}>{notice.message}</Text>
        </View>
      )}
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
        <Text style={styles.headerTitle}>{scanMode === 'photo' ? 'Ürünü Tanı' : 'Barkod Tara'}</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* KAMERA VEYA İZİN ALANI */}
      <View style={styles.scannerArea}>{renderScannerContent()}</View>

      {/* SEKMELER */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, scanMode === 'photo' && styles.activeTab]}
          onPress={() => {
            setScanMode('photo');
            setLastCode(null);
          }}
          disabled={isScanning}
          activeOpacity={0.8}
        >
          <Camera size={18} color={scanMode === 'photo' ? '#10130F' : '#ffffff'} />
          <Text style={[styles.tabText, scanMode === 'photo' && styles.activeTabText]}>Fotoğraf</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, scanMode === 'barcode' && styles.activeTab]}
          onPress={() => {
            setScanMode('barcode');
            setLastCode(null);
          }}
          disabled={isScanning}
          activeOpacity={0.8}
        >
          <Barcode size={18} color={scanMode === 'barcode' ? '#10130F' : '#ffffff'} />
          <Text style={[styles.tabText, scanMode === 'barcode' && styles.activeTabText]}>Barkod</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={openManualForm}
          disabled={isScanning}
          activeOpacity={0.8}
          hitSlop={TOUCH_SLOP}
          accessibilityRole="button"
        >
          <PenLine size={18} color="#ffffff" />
          <Text style={styles.tabText}>Manuel</Text>
        </TouchableOpacity>
      </View>

      {/* FOOTER - TARAMA AKSİYON BUTONU */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.captureButton, isScanning && styles.captureButtonDisabled]}
          onPress={() => {
            if (scanMode === 'photo') {
              void recognizeVisibleProduct();
              return;
            }
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
          accessibilityLabel={scanMode === 'photo' ? 'Ürünü fotoğraftan tanı' : 'Barkodu tara'}
        >
          <View style={styles.captureInner}>
            {scanMode === 'photo' ? (
              <Sparkles size={29} color="#10130F" />
            ) : (
              <ScanLine size={30} color="#10130F" />
            )}
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
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  scannerFrame: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
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
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
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
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 14,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
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
    marginLeft: 6,
    fontSize: 12.5,
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
  notice: {
    position: 'absolute',
    top: 76,
    left: 22,
    right: 22,
    zIndex: 20,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(40, 29, 25, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(216, 195, 154, 0.5)',
  },
  noticeTitle: {
    fontFamily: fonts.sansExtraBold,
    color: '#ffffff',
    fontSize: 14,
  },
  noticeMessage: {
    marginTop: 3,
    fontFamily: fonts.sans,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12.5,
    lineHeight: 17,
  },
});
