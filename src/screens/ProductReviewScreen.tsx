import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, Alert, TextInput } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, Category, ProductDraft } from '../types';
import { ArrowLeft, Check, Sparkles, AlertCircle, AlertTriangle, Plus, X } from 'lucide-react-native';
import { useProducts } from '../context/ProductContext';
import { analyzeProductIngredients } from '../services/productAnalysisService';
import { getProductVisualSource } from '../services/productVisualCatalog';
import { errorDev, logDev } from '../services/logger';
import { colors, fonts, radius, shadows } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ProductReview'>;
  route: RouteProp<RootStackParamList, 'ProductReview'>;
};

const defaultProductData: ProductDraft = {
  name: '',
  brand: '',
  category: 'Diğer' as Category,
  imageUrl: '',
  description: '',
  activeIngredients: [],
  expiryDate: '',
  timeOfDay: 'both',
};

const categoryOptions: Category[] = ['Temizleyici', 'Tonik', 'Serum', 'Göz Kremi', 'Nemlendirici', 'Güneş Kremi', 'Maske', 'Diğer'];

export default function ProductReviewScreen({ navigation, route }: Props) {
  const { addProduct, updateProduct } = useProducts();
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'evening' | 'both'>('morning');
  const [loading, setLoading] = useState(false);
  const [productData, setProductData] = useState<ProductDraft>(route.params?.scannedProduct || defaultProductData);
  const [productImageFailed, setProductImageFailed] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [conflictData, setConflictData] = useState<{ hasConflict: boolean, severity: 'high' | 'warning' | 'synergy', message: string, conflictingProduct?: string } | null>(null);
  const [aiSuggestedTime, setAiSuggestedTime] = useState<'morning' | 'evening' | 'both' | null>(null);
  const [ingredientInput, setIngredientInput] = useState('');
  const editingProductId = route.params?.editingProductId;
  const entrySource = route.params?.source || 'manual';
  const activeIngredients = productData.activeIngredients || [];
  const ingredientKey = activeIngredients.join('|');
  const sourceBadgeLabel = editingProductId
    ? 'Dolaptan Düzenleniyor'
    : entrySource === 'barcode'
      ? 'Barkod ile Bulundu'
      : 'Manuel Giriş';
  const sourceNoticeText = editingProductId
    ? 'Ürün bilgilerini düzenleyip değişiklikleri kaydedebilirsin.'
    : entrySource === 'barcode'
      ? 'Barkoddan gelen bilgiler onaydan önce düzenlenebilir.'
      : 'Ürün bilgilerini manuel girip içerikleri düzenleyebilirsin.';

  useEffect(() => {
    setProductImageFailed(false);
  }, [productData.cutoutImageUrl, productData.category]);

  useEffect(() => {
    setTimeOfDay(productData.timeOfDay || 'both');
  }, [productData.timeOfDay]);

  useEffect(() => {
    if (!productData.name.trim() || !productData.brand.trim()) {
      setAiAnalysis(null);
      setConflictData(null);
      setAiSuggestedTime(null);
      setAnalysisError(null);
      setAnalysisLoading(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setAnalysisLoading(true);
      setAnalysisError(null);
      try {
        const analysis = await analyzeProductIngredients(productData);
        if (cancelled) return;

        setAiAnalysis(analysis.summary);
        setConflictData({
          hasConflict: true,
          severity: analysis.compatibilityLevel,
          message: analysis.compatibilityMessage,
        });
        setAiSuggestedTime(analysis.suggestedTimeOfDay);

        // GÜNCELLEME: Yapay zekanın önerdiği en güvenli saati arayüz butonlarında otomatik olarak seçiyoruz (Dermatolog Kalkanı)
        if (analysis.suggestedTimeOfDay) {
          setTimeOfDay(analysis.suggestedTimeOfDay);
        }
      } catch (error) {
        errorDev('Ingredient analysis error:', error);
        if (cancelled) return;
        setAiAnalysis(null);
        setConflictData(null);
        setAiSuggestedTime(null);
        setAnalysisError('İçerik analizi şu anda alınamadı. Ürün bilgilerini yine kaydedebilirsin.');
      } finally {
        if (!cancelled) {
          setAnalysisLoading(false);
        }
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [productData.name, productData.brand, productData.category, productData.description, ingredientKey]);

  const updateProductField = <K extends keyof ProductDraft>(field: K, value: ProductDraft[K]) => {
    setProductData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddIngredient = () => {
    const nextIngredient = ingredientInput.trim();
    if (!nextIngredient) return;
    if (activeIngredients.some(item => item.toLocaleLowerCase('tr-TR') === nextIngredient.toLocaleLowerCase('tr-TR'))) {
      setIngredientInput('');
      return;
    }

    updateProductField('activeIngredients', [...activeIngredients, nextIngredient]);
    setIngredientInput('');
  };

  const handleRemoveIngredient = (ingredientIndex: number) => {
    updateProductField(
      'activeIngredients',
      activeIngredients.filter((_, index) => index !== ingredientIndex)
    );
  };

  const handleSave = async () => {
    if (!productData.name.trim() || !productData.brand.trim()) {
      Alert.alert('Eksik bilgi', 'Ürünü kaydetmek için marka ve ürün adını doldur.');
      return;
    }

    const expiryDate = productData.expiryDate?.trim();
    if (expiryDate && !/^\d{4}-(0[1-9]|1[0-2])$/.test(expiryDate)) {
      Alert.alert('Geçersiz tarih', 'Son kullanma tarihini YYYY-AA biçiminde gir.');
      return;
    }

    setLoading(true);
    try {
      const productToSave = {
        ...productData,
        name: productData.name.trim(),
        brand: productData.brand.trim(),
        description: productData.description?.trim() || '',
        expiryDate: expiryDate || undefined,
        activeIngredients: activeIngredients.map(item => item.trim()).filter(Boolean),
        timeOfDay,
      };
      if (editingProductId) {
        await updateProduct(editingProductId, productToSave);
      } else {
        await addProduct(productToSave);
      }
      logDev('Product saved successfully');
      navigation.navigate('MainTabs');
    } catch (error: any) {
      errorDev('Error adding product:', error);
      
      // GÜNCELLEME: Kullanıcı dostu hata uyarı mesajı
      const errorMessage = error?.message || 'Ürün dolabınıza kaydedilemedi. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.';
      Alert.alert('Hata', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={colors.sage} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editingProductId ? 'Ürün Düzenle' : 'Ürün Ekle'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.imageContainer}>
          <Image 
            source={getProductVisualSource(productData, productImageFailed)}
            style={styles.image} 
            resizeMode="contain"
            onError={() => setProductImageFailed(true)}
          />
          <View style={styles.sourceBadge}>
            <Check size={16} color={colors.onDark} />
            <Text style={styles.sourceBadgeText}>{sourceBadgeLabel}</Text>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.sourceNotice}>
            <Check size={14} color={colors.sage} />
            <Text style={styles.sourceNoticeText}>{sourceNoticeText}</Text>
          </View>
          <View style={styles.detailRow}>
             <Text style={styles.label}>Marka</Text>
             <TextInput
               style={styles.inputValue}
               value={productData.brand}
               onChangeText={value => updateProductField('brand', value)}
               placeholder="Marka"
               placeholderTextColor="#9aa49d"
             />
          </View>
          <View style={styles.separator} />
          <View style={styles.detailRow}>
             <Text style={styles.label}>Ürün Adı</Text>
             <TextInput
               style={styles.inputValue}
               value={productData.name}
               onChangeText={value => updateProductField('name', value)}
               placeholder="Ürün adı"
               placeholderTextColor="#9aa49d"
             />
          </View>
          <View style={styles.separator} />
          <View style={styles.categorySection}>
             <Text style={styles.label}>Kategori</Text>
             <View style={styles.categoryChips}>
               {categoryOptions.map(category => (
                 <TouchableOpacity
                   key={category}
                   style={[styles.categoryChip, productData.category === category && styles.categoryChipActive]}
                   onPress={() => updateProductField('category', category)}
                 >
                   <Text style={[styles.categoryChipText, productData.category === category && styles.categoryChipTextActive]}>
                     {category}
                   </Text>
                 </TouchableOpacity>
               ))}
             </View>
          </View>
          <View style={styles.separator} />
          <View style={styles.textAreaSection}>
            <Text style={styles.label}>Ürün Açıklaması</Text>
            <TextInput
              style={styles.textArea}
              value={productData.description || ''}
              onChangeText={value => updateProductField('description', value)}
              placeholder="Ürünün yapısı, kullanım amacı veya önemli notlar"
              placeholderTextColor="#9aa49d"
              multiline
              textAlignVertical="top"
              maxLength={1000}
            />
          </View>
          <View style={styles.separator} />
          <View style={styles.detailRow}>
            <Text style={styles.label}>Son Kullanma</Text>
            <TextInput
              style={styles.inputValue}
              value={productData.expiryDate || ''}
              onChangeText={value => updateProductField('expiryDate', value)}
              placeholder="YYYY-AA"
              placeholderTextColor="#9aa49d"
              keyboardType="numbers-and-punctuation"
              maxLength={7}
            />
          </View>
          <View style={styles.separator} />
          <View style={styles.ingredientSection}>
            <Text style={styles.label}>Öne Çıkan İçerikler</Text>
            <View style={styles.ingredientChips}>
              {activeIngredients.length ? (
                activeIngredients.map((ingredient, index) => (
                  <TouchableOpacity
                    key={`${ingredient}-${index}`}
                    style={styles.ingredientChip}
                    onPress={() => handleRemoveIngredient(index)}
                  >
                    <Text style={styles.ingredientChipText}>{ingredient}</Text>
                    <X size={12} color={colors.sage} />
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.emptyIngredientsText}>İçerik eklenmedi.</Text>
              )}
            </View>
            <View style={styles.ingredientInputRow}>
              <TextInput
                style={styles.ingredientInput}
                value={ingredientInput}
                onChangeText={setIngredientInput}
                onSubmitEditing={handleAddIngredient}
                placeholder="İçerik ekle"
                placeholderTextColor="#9aa49d"
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.addIngredientButton} onPress={handleAddIngredient}>
                <Plus size={18} color={colors.onDark} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.aiAnalysisCard}>
          <View style={styles.aiAnalysisHeader}>
            <Sparkles size={20} color={colors.sage} />
            <Text style={styles.aiAnalysisTitle}>Yapay Zeka İçerik Analizi</Text>
          </View>
          {aiAnalysis ? (
            <Text style={styles.aiAnalysisText}>{aiAnalysis}</Text>
          ) : analysisError ? (
            <Text style={styles.aiAnalysisLoadingText}>{analysisError}</Text>
          ) : (
            <Text style={styles.aiAnalysisLoadingText}>
              {analysisLoading ? 'Analiz hazırlanıyor...' : 'Analiz için ürün bilgisi bekleniyor...'}
            </Text>
          )}
        </View>

        {conflictData && (
          <View style={[
            styles.conflictCard,
            conflictData.severity === 'high' && styles.conflictHigh,
            conflictData.severity === 'warning' && styles.conflictWarning,
            conflictData.severity === 'synergy' && styles.conflictSynergy,
          ]}>
            <View style={styles.conflictHeader}>
              {conflictData.severity === 'high' && <AlertCircle size={20} color="#BA1A1A" />}
              {conflictData.severity === 'warning' && <AlertTriangle size={20} color="#856006" />}
              {conflictData.severity === 'synergy' && <Sparkles size={20} color="#006D3B" />}
              <Text style={[
                styles.conflictTitle,
                conflictData.severity === 'high' && { color: '#BA1A1A' },
                conflictData.severity === 'warning' && { color: '#856006' },
                conflictData.severity === 'synergy' && { color: '#006D3B' },
              ]}>
                {conflictData.severity === 'high' && 'Dikkat: Çakışma Riski'}
                {conflictData.severity === 'warning' && 'Kullanım Önerisi'}
                {conflictData.severity === 'synergy' && 'Mükemmel Uyum'}
              </Text>
            </View>
            <Text style={[
                styles.conflictMessage,
                conflictData.severity === 'high' && { color: '#410002' },
                conflictData.severity === 'warning' && { color: '#2b1c00' },
                conflictData.severity === 'synergy' && { color: '#00210e' },
            ]}>{conflictData.message}</Text>
          </View>
        )}

        <View style={styles.routineSection}>
          <View style={styles.routineTitleContainer}>
            <Text style={styles.routineTitle}>Rutin Zamanı</Text>
            {aiSuggestedTime && (
              <View style={styles.aiSuggestionBadge}>
                <Sparkles size={12} color="#006D3B" />
                <Text style={styles.aiSuggestionText}>Yapay zeka tarafından cildiniz ve ürün içeriği için otomatik önerildi</Text>
              </View>
            )}
          </View>
          <View style={styles.routineButtons}>
            <TouchableOpacity 
              style={[styles.timeButton, timeOfDay === 'morning' && styles.timeButtonActive]}
              onPress={() => setTimeOfDay('morning')}
            >
              <Text style={[styles.timeText, timeOfDay === 'morning' && styles.timeTextActive]}>Sabah</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.timeButton, timeOfDay === 'evening' && styles.timeButtonActive]}
              onPress={() => setTimeOfDay('evening')}
            >
              <Text style={[styles.timeText, timeOfDay === 'evening' && styles.timeTextActive]}>Akşam</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.timeButton, timeOfDay === 'both' && styles.timeButtonActive]}
              onPress={() => setTimeOfDay('both')}
            >
              <Text style={[styles.timeText, timeOfDay === 'both' && styles.timeTextActive]}>İkisi de</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.saveButton, loading && styles.disabledButton]} 
          onPress={handleSave}
          disabled={loading}
        >
          <Check size={20} color={colors.onDark} style={{ marginRight: 8 }} />
          <Text style={styles.saveButtonText}>{loading ? 'Kaydediliyor...' : editingProductId ? 'Değişiklikleri Kaydet' : 'Dolabıma Ekle'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
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
  headerTitle: { fontFamily: fonts.display, fontSize: 21, color: colors.ink },
  content: { padding: 22, paddingBottom: 120 },
  imageContainer: {
    width: '100%',
    height: 250,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    position: 'relative',
    ...shadows.card,
  },
  image: { width: '60%', height: '80%', resizeMode: 'contain' },
  sourceBadge: {
    position: 'absolute',
    bottom: -16,
    backgroundColor: colors.forest,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.pill,
    ...shadows.card,
  },
  sourceBadgeText: { fontFamily: fonts.sansBold, color: colors.onDark, fontSize: 12, marginLeft: 8 },
  detailsContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 20,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.soft,
  },
  sourceNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSage,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  sourceNoticeText: { flex: 1, marginLeft: 8, fontFamily: fonts.sansSemiBold, color: colors.sage, fontSize: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  label: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.inkMuted },
  textAreaSection: {
    paddingVertical: 8,
    gap: 10,
  },
  textArea: {
    minHeight: 92,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontFamily: fonts.sans,
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
  },
  inputValue: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    fontFamily: fonts.sansBold,
    color: colors.ink,
    fontSize: 15,
    textAlign: 'right',
    marginLeft: 16,
  },
  separator: { height: 1, backgroundColor: colors.surfaceMuted },
  categorySection: { paddingTop: 14 },
  categoryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  categoryChip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.line,
  },
  categoryChipActive: { backgroundColor: colors.forest, borderColor: colors.forest },
  categoryChipText: { fontFamily: fonts.sansBold, color: colors.inkSoft, fontSize: 12 },
  categoryChipTextActive: { color: colors.onDark },
  ingredientSection: { paddingTop: 14 },
  ingredientChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  ingredientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSage,
    borderWidth: 1,
    borderColor: colors.lineSage,
    gap: 6,
  },
  ingredientChipText: { fontFamily: fonts.sansBold, color: colors.sage, fontSize: 12 },
  emptyIngredientsText: { fontFamily: fonts.sans, color: colors.inkMuted, fontSize: 13, marginTop: 2 },
  ingredientInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  ingredientInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.line,
    paddingHorizontal: 12,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    fontSize: 14,
  },
  addIngredientButton: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.forest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiAnalysisCard: {
    backgroundColor: colors.surfaceSage,
    borderRadius: radius.xl,
    padding: 20,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: colors.lineSage,
  },
  aiAnalysisHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  aiAnalysisTitle: { fontFamily: fonts.sansBold, fontSize: 15.5, color: colors.forest, marginLeft: 8 },
  aiAnalysisText: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkSoft, lineHeight: 22 },
  aiAnalysisLoadingText: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted, fontStyle: 'italic' },
  conflictCard: { padding: 17, borderRadius: radius.lg, marginBottom: 22, borderWidth: 1 },
  conflictHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  conflictTitle: { fontFamily: fonts.sansBold, fontSize: 15.5, marginLeft: 8 },
  conflictMessage: { fontFamily: fonts.sans, fontSize: 13.5, lineHeight: 20 },
  conflictHigh: { backgroundColor: colors.dangerSurface, borderColor: '#F2C7C2' },
  conflictWarning: { backgroundColor: colors.warningSurface, borderColor: '#EDD9A8' },
  conflictSynergy: { backgroundColor: colors.successSurface, borderColor: '#BFDFC8' },
  routineSection: { marginBottom: 40 },
  routineTitleContainer: { marginBottom: 16 },
  routineTitle: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.ink },
  aiSuggestionBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  aiSuggestionText: { fontFamily: fonts.sansSemiBold, fontSize: 11, color: colors.success, marginLeft: 5, flex: 1 },
  routineButtons: { flexDirection: 'row', gap: 12 },
  timeButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
  },
  timeButtonActive: { backgroundColor: colors.surfaceSage, borderColor: colors.sage },
  timeText: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.inkMuted },
  timeTextActive: { color: colors.forest },
  footer: {
    padding: 20,
    backgroundColor: 'rgba(251,250,246,0.97)',
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: colors.forest,
    paddingVertical: 17,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.card,
  },
  disabledButton: { opacity: 0.7 },
  saveButtonText: { fontFamily: fonts.sansBold, color: colors.onDark, fontSize: 16, letterSpacing: 0.2 },
});
