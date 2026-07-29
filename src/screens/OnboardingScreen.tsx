import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, ArrowRight, Camera, Check, PenLine, Sparkles } from 'lucide-react-native';
import { ProductDraft, RootStackParamList } from '../types';
import { useUser } from '../context/UserContext';
import { userService } from '../services/userService';
import { useRoute } from '@react-navigation/native';
import { authService } from '../services/authService';
import { errorDev, logDev, warnDev } from '../services/logger';
import { colors, fonts, radius, shadows } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
};

const ageRanges = ['13-17', '18-24', '25-34', '35+'];
const experienceLevels = ['Yeni başlıyorum', 'Birkaç ürün kullanıyorum', 'Aktif içerikleri biliyorum', 'Rutinim detaylı'];
const skinFeelOptions = ['Hep kuru / gergin', 'T bölgem yağlı, yanaklarım daha kuru', 'Genel olarak yağlı', 'Normal / dengeli', 'Emin değilim'];
const postWashOptions = ['Gerginlik ve kuruluk oluyor', 'Hızlıca yağlanıyor', 'Bazı bölgeler yağlı, bazı bölgeler kuru', 'Pek değişmiyor', 'Emin değilim'];
const productFitOptions = ['Evet, ürünlerimi analiz et', 'Önce cildimi tanımak istiyorum', 'Sadece rutinimi düzenlemek istiyorum'];
const mainGoals = ['Ürünlerim bana uygun mu?', 'Sivilce / komedon görünümü', 'Leke / renk eşitsizliği', 'Kızarıklık / hassasiyet', 'Kuruluk / bariyer desteği', 'Yağlanma kontrolü', 'Daha düzenli rutin'];
const sensitivityOptions = ['Evet, sık sık kızarır/yanar', 'Bazen', 'Hayır, genelde dayanıklı', 'Emin değilim'];
const reactionOptions = ['Evet', 'Hayır', 'Emin değilim'];
const routineOptions = ['Temizleyici', 'Nemlendirici', 'Güneş kremi', 'Serum', 'Tonik', 'Peeling / asit', 'Retinol / retinal', 'Akne ürünü', 'Hiçbir şey kullanmıyorum'];
const activeOptions = ['Retinol / retinal', 'AHA / BHA asit', 'Salisilik asit', 'C vitamini', 'Benzoil peroksit', 'Niacinamide', 'Reçeteli akne ürünü', 'Emin değilim'];
const trackingOptions = ['Uyku', 'Stres', 'Regl dönemi', 'Su tüketimi', 'Beslenme', 'Makyaj kullanımı', 'Güneşe maruz kalma', 'Şimdilik istemiyorum'];
const reminderOptions = ['Sabah rutinim için', 'Akşam rutinim için', 'Ürün kullanım takibi için', 'Haftalık cilt özeti için', 'Bildirim istemiyorum'];

const manualProductDraft: ProductDraft = {
  name: '',
  brand: '',
  category: 'Diğer',
  timeOfDay: 'both',
  imageUrl: '',
  description: '',
  activeIngredients: [],
};

const inferSkinType = (skinFeel: string, postWashFeel: string) => {
  const combined = `${skinFeel} ${postWashFeel}`.toLocaleLowerCase('tr-TR');

  if (combined.includes('t bölgem') || combined.includes('bazı bölgeler')) return 'Karma Cilt';
  if (combined.includes('kuru') || combined.includes('gergin')) return 'Kuru Cilt';
  if (combined.includes('yağlı') || combined.includes('yağlanıyor')) return 'Yağlı Cilt';
  if (combined.includes('normal') || combined.includes('değişmiyor')) return 'Normal Cilt';
  return 'Karma Cilt';
};

const OptionButton = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity style={[styles.optionButton, selected && styles.optionButtonSelected]} onPress={onPress} activeOpacity={0.76}>
    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text>
    {selected && <Check size={16} color={colors.sage} />}
  </TouchableOpacity>
);

export default function OnboardingScreen({ navigation }: Props) {
  const { profile, updateUserProfile } = useUser();
  const route = useRoute<any>();
  const userId = route.params?.userId || authService.getUserId();

  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [ageRange, setAgeRange] = useState(profile.ageRange || '');
  const [experienceLevel, setExperienceLevel] = useState(profile.experienceLevel || '');
  const [skinFeel, setSkinFeel] = useState(profile.skinFeel || '');
  const [postWashFeel, setPostWashFeel] = useState(profile.postWashFeel || '');
  const [productFitIntent, setProductFitIntent] = useState(profile.productFitIntent || '');
  const [mainGoal, setMainGoal] = useState(profile.mainGoal || '');
  const [sensitivityLevel, setSensitivityLevel] = useState(profile.sensitivityLevel || '');
  const [reactionHistory, setReactionHistory] = useState(profile.reactionHistory || '');
  const [currentRoutine, setCurrentRoutine] = useState<string[]>(profile.currentRoutine || []);
  const [recentActives, setRecentActives] = useState<string[]>(profile.recentActives || []);
  const [trackingPreferences, setTrackingPreferences] = useState<string[]>(profile.trackingPreferences || []);
  const [reminderPreferences, setReminderPreferences] = useState<string[]>(profile.reminderPreferences || []);

  const inferredSkinType = useMemo(() => inferSkinType(skinFeel, postWashFeel), [skinFeel, postWashFeel]);
  const isLastStep = step === 6;

  const toggleList = (value: string, selected: string[], setSelected: (next: string[]) => void, exclusive?: string[]) => {
    if (exclusive?.includes(value)) {
      setSelected(selected.includes(value) ? [] : [value]);
      return;
    }

    const withoutExclusive = selected.filter(item => !exclusive?.includes(item));
    setSelected(withoutExclusive.includes(value) ? withoutExclusive.filter(item => item !== value) : [...withoutExclusive, value]);
  };

  const saveProfile = async () => {
    if (!userId) {
      warnDev('Oturum açmış kullanıcı ID bilgisi bulunamadı!');
      alert('Lütfen önce giriş yapın.');
      return;
    }

    const profileData = {
      displayName: displayName.trim() || 'SkinShelf kullanıcısı',
      ageRange,
      experienceLevel,
      skinFeel,
      postWashFeel,
      skinType: inferredSkinType,
      productFitIntent,
      mainGoal,
      sensitivityLevel,
      reactionHistory,
      currentRoutine,
      recentActives,
      trackingPreferences,
      reminderPreferences,
      isOnboarded: true,
    };

    try {
      logDev('Profil Spring Boot API ile kaydediliyor.');
      await userService.updateProfile(String(userId), profileData);
      logDev('Profil başarıyla kaydedildi.');
    } catch (error) {
      errorDev('Cilt profili kaydedilirken hata oluştu:', error);
    }

    await updateUserProfile(profileData, { persist: false });
  };

  const completeToMain = async () => {
    await saveProfile();
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  const completeToScanner = async () => {
    await saveProfile();
    navigation.navigate('Scanner');
  };

  const completeToManualProduct = async () => {
    await saveProfile();
    navigation.navigate('ProductReview', { scannedProduct: manualProductDraft, source: 'manual' });
  };

  const canContinue = () => {
    if (step === 0) return displayName.trim().length > 1 && ageRange && experienceLevel;
    if (step === 1) return skinFeel && postWashFeel;
    if (step === 2) return productFitIntent && mainGoal;
    if (step === 3) return sensitivityLevel && reactionHistory;
    return true;
  };

  const renderStep = () => {
    if (step === 0) {
      return (
        <>
          <Text style={styles.stepTitle}>Seni tanıyalım</Text>
          <Text style={styles.stepText}>Shelly önerilerini sana hitap şekline ve bakım deneyimine göre ayarlar.</Text>
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>Sana nasıl hitap edelim?</Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Örn. Ceren"
              placeholderTextColor="#8b968f"
              style={styles.textInput}
            />
          </View>
          <Text style={styles.groupTitle}>Yaş aralığın</Text>
          {ageRanges.map(item => <OptionButton key={item} label={item} selected={ageRange === item} onPress={() => setAgeRange(item)} />)}
          <Text style={styles.groupTitle}>Cilt bakım deneyimin</Text>
          {experienceLevels.map(item => <OptionButton key={item} label={item} selected={experienceLevel === item} onPress={() => setExperienceLevel(item)} />)}
        </>
      );
    }

    if (step === 1) {
      return (
        <>
          <Text style={styles.stepTitle}>Cilt hissin nasıl?</Text>
          <Text style={styles.stepText}>Cilt tipini etiketlerden değil, gün içindeki hislerinden tahmin ediyoruz.</Text>
          <Text style={styles.groupTitle}>Gün içinde genelde</Text>
          {skinFeelOptions.map(item => <OptionButton key={item} label={item} selected={skinFeel === item} onPress={() => setSkinFeel(item)} />)}
          <Text style={styles.groupTitle}>Yüzünü yıkadıktan 30 dakika sonra</Text>
          {postWashOptions.map(item => <OptionButton key={item} label={item} selected={postWashFeel === item} onPress={() => setPostWashFeel(item)} />)}
          {skinFeel && postWashFeel && (
            <View style={styles.shellyNote}>
              <Sparkles size={18} color={colors.sage} />
              <Text style={styles.shellyNoteText}>Shelly tahmini: {inferredSkinType}</Text>
            </View>
          )}
        </>
      );
    }

    if (step === 2) {
      return (
        <>
          <Text style={styles.stepTitle}>Cildinle anlaşamayan ürünleri bulmak ister misin?</Text>
          <Text style={styles.stepText}>SkinShelf’in ana odağı rafındaki ürünlerin cildinle uyumunu anlamana yardımcı olmak.</Text>
          {productFitOptions.map(item => <OptionButton key={item} label={item} selected={productFitIntent === item} onPress={() => setProductFitIntent(item)} />)}
          <Text style={styles.groupTitle}>Şu an en çok neye odaklanalım?</Text>
          {mainGoals.map(item => <OptionButton key={item} label={item} selected={mainGoal === item} onPress={() => setMainGoal(item)} />)}
        </>
      );
    }

    if (step === 3) {
      return (
        <>
          <Text style={styles.stepTitle}>Cildin kolay tepki verir mi?</Text>
          <Text style={styles.stepText}>Bu bilgi Shelly’nin daha dikkatli ve sade öneriler yapmasına yardımcı olur.</Text>
          <Text style={styles.groupTitle}>Ürünlere tepkin</Text>
          {sensitivityOptions.map(item => <OptionButton key={item} label={item} selected={sensitivityLevel === item} onPress={() => setSensitivityLevel(item)} />)}
          <Text style={styles.groupTitle}>Daha önce bir ürün yakma, kızarma veya sivilce yaptı mı?</Text>
          {reactionOptions.map(item => <OptionButton key={item} label={item} selected={reactionHistory === item} onPress={() => setReactionHistory(item)} />)}
        </>
      );
    }

    if (step === 4) {
      return (
        <>
          <Text style={styles.stepTitle}>Şu an rafında neler var?</Text>
          <Text style={styles.stepText}>İstersen sonra ürünleri barkodla juga ekleyebilirsin. Bu adım sadece başlangıç tahmini için.</Text>
          {routineOptions.map(item => (
            <OptionButton
              key={item}
              label={item}
              selected={currentRoutine.includes(item)}
              onPress={() => toggleList(item, currentRoutine, setCurrentRoutine, ['Hiçbir şey kullanmıyorum'])}
            />
          ))}
          <Text style={styles.groupTitle}>Son 1 ayda kullandığın aktifler</Text>
          {activeOptions.map(item => (
            <OptionButton
              key={item}
              label={item}
              selected={recentActives.includes(item)}
              onPress={() => toggleList(item, recentActives, setRecentActives, ['Emin değilim'])}
            />
          ))}
          {recentActives.includes('Reçeteli akne ürünü') && (
            <Text style={styles.warningText}>Reçeteli ürünlerle ilgili değişiklik yapmadan dermatoloğuna danışmanı öneririz.</Text>
          )}
        </>
      );
    }

    if (step === 5) {
      return (
        <>
          <Text style={styles.stepTitle}>Shelly neleri takip etsin?</Text>
          <Text style={styles.stepText}>Bu adım zorunlu değil. İstersen sadece rutin hatırlatmasıyla başlayabilirsin.</Text>
          <Text style={styles.groupTitle}>Cilt değişimini etkileyebilecek şeyler</Text>
          {trackingOptions.map(item => (
            <OptionButton
              key={item}
              label={item}
              selected={trackingPreferences.includes(item)}
              onPress={() => toggleList(item, trackingPreferences, setTrackingPreferences, ['Şimdilik istemiyorum'])}
            />
          ))}
          <Text style={styles.groupTitle}>Hatırlatma tercihin</Text>
          {reminderOptions.map(item => (
            <OptionButton
              key={item}
              label={item}
              selected={reminderPreferences.includes(item)}
              onPress={() => toggleList(item, reminderPreferences, setReminderPreferences, ['Bildirim istemiyorum'])}
            />
          ))}
        </>
      );
    }

    return (
      <View style={styles.readyCard}>
        <View style={styles.readyIcon}>
          <Sparkles size={32} color={colors.onDark} />
        </View>
        <Text style={styles.readyTitle}>Hazırsın!</Text>
        <Text style={styles.readyText}>
          Şimdi ürünlerini SkinShelf rafına ekleyebilir, Shelly’den cildinle uyumlarını analiz etmesini isteyebilirsin.
        </Text>
        <TouchableOpacity style={styles.primaryAction} onPress={completeToScanner} activeOpacity={0.78}>
          <Camera size={19} color={colors.onDark} />
          <Text style={styles.primaryActionText}>Barkodla ürün ekle</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryAction} onPress={completeToManualProduct} activeOpacity={0.78}>
          <PenLine size={18} color={colors.sage} />
          <Text style={styles.secondaryActionText}>Manuel ürün ekle</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.textAction} onPress={completeToMain} activeOpacity={0.75}>
          <Text style={styles.textActionText}>Sonra yap</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => (step > 0 ? setStep(step - 1) : navigation.goBack())}
            activeOpacity={0.75}
          >
            <ArrowLeft size={22} color={colors.sage} />
          </TouchableOpacity>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${((step + 1) / 7) * 100}%` }]} />
          </View>
          <Text style={styles.stepCounter}>{step + 1}/7</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {step === 0 && (
            <View style={styles.brandCard}>
              <Text style={styles.brandTitle}>SkinShelf’e hoş geldin</Text>
              <Text style={styles.brandText}>Shelly ürünlerini ve rutin uyumunu takip etmeye burada başlar.</Text>
            </View>
          )}
          {renderStep()}
        </ScrollView>

        {!isLastStep && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.nextButton, !canContinue() && styles.nextButtonDisabled]}
              disabled={!canContinue()}
              onPress={() => setStep(step + 1)}
              activeOpacity={0.78}
            >
              <Text style={styles.nextButtonText}>Devam Et</Text>
              <ArrowRight size={20} color={colors.onDark} />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const androidHeaderPadding = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 14 : 20;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  keyboardView: { flex: 1 },
  header: {
    paddingTop: androidHeaderPadding,
    paddingHorizontal: 22,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
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
  progressTrack: { flex: 1, height: 6, borderRadius: 10, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 10, backgroundColor: colors.gold },
  stepCounter: { fontFamily: fonts.sansBold, color: colors.inkMuted, fontSize: 12 },
  content: { paddingHorizontal: 22, paddingBottom: 120 },
  brandCard: {
    backgroundColor: colors.surfaceSage,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.lineSage,
    padding: 18,
    marginBottom: 22,
  },
  brandTitle: { fontFamily: fonts.display, color: colors.forest, fontSize: 19 },
  brandText: { fontFamily: fonts.sans, color: colors.inkSoft, fontSize: 13.5, lineHeight: 20, marginTop: 6 },
  stepTitle: { fontFamily: fonts.display, color: colors.ink, fontSize: 28, lineHeight: 35, marginBottom: 9 },
  stepText: { fontFamily: fonts.sans, color: colors.inkSoft, fontSize: 14.5, lineHeight: 22, marginBottom: 20 },
  inputCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 15,
    marginBottom: 18,
    ...shadows.soft,
  },
  inputLabel: {
    fontFamily: fonts.sansExtraBold,
    color: colors.sage,
    fontSize: 10.5,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  textInput: { minHeight: 46, fontFamily: fonts.sansBold, color: colors.ink, fontSize: 18 },
  groupTitle: { fontFamily: fonts.sansBold, color: colors.ink, fontSize: 15, marginTop: 12, marginBottom: 10 },
  optionButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    paddingHorizontal: 15,
    paddingVertical: 13,
    marginBottom: 9,
  },
  optionButtonSelected: { backgroundColor: colors.surfaceSage, borderColor: colors.sage },
  optionText: {
    flex: 1,
    fontFamily: fonts.sansSemiBold,
    color: colors.inkSoft,
    fontSize: 14,
    lineHeight: 19,
    marginRight: 10,
  },
  optionTextSelected: { fontFamily: fonts.sansBold, color: colors.forest },
  shellyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colors.surfaceSage,
    borderWidth: 1,
    borderColor: colors.lineSage,
    borderRadius: radius.md,
    padding: 14,
    marginTop: 10,
  },
  shellyNoteText: { fontFamily: fonts.sansBold, color: colors.forest, fontSize: 14 },
  warningText: {
    fontFamily: fonts.sansSemiBold,
    color: colors.warning,
    backgroundColor: colors.warningSurface,
    borderRadius: radius.sm,
    padding: 13,
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 8,
  },
  readyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: 26,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    ...shadows.card,
  },
  readyIcon: {
    width: 74,
    height: 74,
    borderRadius: 30,
    backgroundColor: colors.forest,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    ...shadows.card,
  },
  readyTitle: { fontFamily: fonts.display, color: colors.ink, fontSize: 32, marginBottom: 10 },
  readyText: {
    fontFamily: fonts.sans,
    color: colors.inkSoft,
    fontSize: 14.5,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 22,
  },
  primaryAction: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.forest,
    borderRadius: radius.lg,
    paddingVertical: 16,
    marginBottom: 10,
  },
  primaryActionText: { fontFamily: fonts.sansBold, color: colors.onDark, fontSize: 15, letterSpacing: 0.2 },
  secondaryAction: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surfaceSage,
    borderRadius: radius.lg,
    paddingVertical: 16,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.lineSage,
  },
  secondaryActionText: { fontFamily: fonts.sansBold, color: colors.forest, fontSize: 15 },
  textAction: { paddingVertical: 12, paddingHorizontal: 16 },
  textActionText: { fontFamily: fonts.sansBold, color: colors.inkMuted, fontSize: 14 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 22,
    paddingBottom: 26,
    backgroundColor: 'rgba(251,250,246,0.97)',
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.forest,
    borderRadius: radius.lg,
    paddingVertical: 16,
    ...shadows.card,
  },
  nextButtonDisabled: { opacity: 0.45 },
  nextButtonText: { fontFamily: fonts.sansBold, color: colors.onDark, fontSize: 16, letterSpacing: 0.2 },
});
