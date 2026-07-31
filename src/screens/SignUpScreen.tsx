import React, { useState, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { User, Mail, Lock, ArrowLeft, ArrowRight } from 'lucide-react-native';
import { authService } from '../services/authService';
import { useUser } from '../context/UserContext';
import { errorDev } from '../services/logger';
import { LEGAL_DOCUMENT_URLS } from '../services/legalDocuments';
import { colors, fonts, radius, shadows } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SignUp'>;
};

const BACKGROUND_URI =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBQQnHT9ZdUvZSeofbui3TKtAoCwdfWtYSN5_pv8ABzEIsTEVftdAnhiCwe74SN_Y1W9LftGh0ZlUzHT1a8YcAlFlMAYJCZeWvqH1s6WW9dTR2A4TpBMT3tjKXrRyvu6kZA5UJfG7sHqhWU5YzrwzXIhWM5G0dbUlc4snDk1Y7tlGNLR6kGm7qbrrBcHNQ_ZeSFTWGrKoUbumkyxTzN1X3pAQpNOhwLCMhZVSGEkfkoRrcZs60bUC7P1w';

// Küçük ekranlarda ve butonlarda dokunma alanını genişletmek için standart hitSlop
const TOUCH_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

export default function SignUpScreen({ navigation }: Props) {
  const { height } = useWindowDimensions();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<'name' | 'email' | 'password' | null>(null);

  // Klavye odak geçişleri için Ref'ler
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  const { loadProfile, setAccount } = useUser();
  const isCompactHeight = height < 620;

  const openDocument = async (title: string, url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(title, 'Belge şu anda açılamadı. İnternet bağlantını kontrol edip tekrar dene.');
    }
  };

  const handleSignUp = async () => {
    // 1. Çift Kayıt / Çift Tıklama Koruması
    if (loading) return;

    const cleanName = name.trim();
    const cleanEmail = email.trim();

    // 2. Eksik Veri & Şifre Uzunluğu Kontrolü
    if (!cleanName || !cleanEmail || !password) {
      Alert.alert('Eksik Alan', 'Lütfen tüm alanları doldurun.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Zayıf Şifre', 'Şifreniz en az 6 karakter olmalıdır.');
      return;
    }

    setLoading(true);

    try {
      const nameParts = cleanName.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '';

      const response = await authService.register({
        firstName,
        lastName,
        email: cleanEmail,
        password,
      });

      if (response.user?.id) {
        setAccount({
          email: response.user.email,
          firstName: response.user.firstName,
          lastName: response.user.lastName,
        });

        // 3. Profil yükleme hatası oluşsa bile akışın kitlenmesini engelle
        await loadProfile(response.user.id).catch((err) => {
          errorDev('Profile load failed during sign-up:', err);
          return null;
        });
      }

      const targetRoute = 'Onboarding';
      const routeParams = response.user?.id ? { userId: response.user.id } : undefined;

      if (Platform.OS === 'web') {
        (navigation as any).navigate(targetRoute, routeParams);
      } else {
        Alert.alert('Hesap Oluşturuldu', 'Skinshelf\'e hoş geldin! Şimdi profilini oluşturalım.', [
          {
            text: 'Devam Et',
            onPress: () => (navigation as any).replace(targetRoute, routeParams),
          },
        ]);
      }
    } catch (error: any) {
      errorDev('Registration error:', error);

      const status = error?.response?.status || error?.status;
      const errorMessage = error?.message || '';

      let userFriendlyMessage = 'Kayıt işlemi başarısız oldu. Bilgilerinizi kontrol edip tekrar deneyin.';

      // 1. Backend/Servis özel bir Türkçe hata döndüyse:
      if (
        errorMessage &&
        !errorMessage.toLowerCase().includes('network') &&
        !errorMessage.toLowerCase().includes('status code')
      ) {
        userFriendlyMessage = errorMessage;
      }
      // 2. E-posta zaten kullanımda (409 veya 400):
      else if (status === 409 || status === 400) {
        userFriendlyMessage = 'Bu e-posta adresi zaten kullanımda veya geçersiz bir bilgi girildi.';
      } else if (status >= 500) {
        userFriendlyMessage = 'Sunucu kaynaklı bir sorun oluştu. Lütfen daha sonra tekrar deneyin.';
      }
      // 3. İnternet Bağlantısı Hatası:
      else if (
        !error?.response &&
        (errorMessage.toLowerCase().includes('network') ||
          error?.code === 'ECONNABORTED' ||
          error?.code === 'ERR_NETWORK')
      ) {
        userFriendlyMessage = 'İnternet bağlantısı kurulamadı. Lütfen bağlantınızı kontrol edin.';
      }

      Alert.alert('Kayıt Başarısız', userFriendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const inputWrapperStyle = (field: 'name' | 'email' | 'password') => [
    styles.inputWrapper,
    focusedField === field && styles.inputWrapperFocused,
  ];

  return (
    <ImageBackground source={{ uri: BACKGROUND_URI }} style={styles.background}>
      <LinearGradient
        colors={['rgba(251,250,246,0.72)', 'rgba(251,250,246,0.9)', 'rgba(251,250,246,0.98)']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea}>
        {/* Doğrudan inline flex:1 verildi */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Geri Dön Butonu */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
              hitSlop={TOUCH_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Geri Dön"
            >
              <ArrowLeft size={isCompactHeight ? 19 : 21} color={colors.forest} />
            </TouchableOpacity>

            {/* Başlık Alanı */}
            <View style={styles.header}>
              <Text style={styles.overline}>SKINSHELF'E KATIL</Text>
              <Text style={styles.title}>Hesap Oluştur</Text>
              <Text style={styles.subtitle}>
                Cilt bakımını kişiselleştirmeye birkaç adımda başla.
              </Text>
            </View>

            {/* Form Alanı */}
            <View style={styles.formContainer}>
              {/* AD SOYAD INPUT */}
              <View style={inputWrapperStyle('name')}>
                <User size={19} color={focusedField === 'name' ? colors.sage : colors.inkMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ad Soyad"
                  placeholderTextColor={colors.inkMuted}
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="words"
                  autoCorrect={false}
                  textContentType="name"
                  returnKeyType="next"
                  onSubmitEditing={() => emailInputRef.current?.focus()}
                  blurOnSubmit={false}
                  editable={!loading}
                />
              </View>

              {/* E-POSTA INPUT */}
              <View style={inputWrapperStyle('email')}>
                <Mail size={19} color={focusedField === 'email' ? colors.sage : colors.inkMuted} style={styles.inputIcon} />
                <TextInput
                  ref={emailInputRef}
                  style={styles.input}
                  placeholder="E-posta"
                  placeholderTextColor={colors.inkMuted}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  blurOnSubmit={false}
                  editable={!loading}
                />
              </View>

              {/* ŞİFRE INPUT */}
              <View style={inputWrapperStyle('password')}>
                <Lock size={19} color={focusedField === 'password' ? colors.sage : colors.inkMuted} style={styles.inputIcon} />
                <TextInput
                  ref={passwordInputRef}
                  style={styles.input}
                  placeholder="Şifre"
                  secureTextEntry
                  placeholderTextColor={colors.inkMuted}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  textContentType="newPassword"
                  autoComplete="password-new"
                  returnKeyType="done"
                  onSubmitEditing={handleSignUp}
                  editable={!loading}
                />
              </View>

              {/* KAYIT OLUŞTUR BUTONU */}
              <TouchableOpacity
                onPress={handleSignUp}
                disabled={loading}
                activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityState={{ busy: loading }}
              >
                <LinearGradient
                  colors={['#1C4630', '#0F2919']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.primaryButton, loading && styles.disabledButton]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.onDark} />
                  ) : (
                    <>
                      <Text style={styles.primaryButtonText}>Kayıt Ol</Text>
                      <ArrowRight size={17} color={colors.onDark} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <Text style={styles.privacyNote}>
                Kayıt olarak{' '}
                <Text
                  style={styles.privacyLink}
                  onPress={() => void openDocument('Gizlilik Politikası', LEGAL_DOCUMENT_URLS.privacy)}
                  accessibilityRole="link"
                >
                  Gizlilik Politikası
                </Text>{' '}
                ve{' '}
                <Text
                  style={styles.privacyLink}
                  onPress={() => void openDocument('Kullanım Koşulları', LEGAL_DOCUMENT_URLS.terms)}
                  accessibilityRole="link"
                >
                  Kullanım Koşulları
                </Text>
                ’nı kabul edersin.
              </Text>
            </View>

            {/* GİRİŞ YAP LINKI */}
            <TouchableOpacity
              onPress={() => navigation.replace('SignIn')}
              style={styles.footerLink}
              hitSlop={TOUCH_SLOP}
              disabled={loading}
            >
              <Text style={styles.footerText}>
                Zaten hesabın var mı? <Text style={styles.footerTextStrong}>Giriş Yap</Text>
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, resizeMode: 'cover' },
  safeArea: { flex: 1 },
  container: { flex: 1, padding: 26 },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 34,
    ...shadows.soft,
  },
  header: { marginBottom: 30 },
  overline: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 11,
    letterSpacing: 2.4,
    color: colors.gold,
    marginBottom: 10,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 48,
    color: colors.forest,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    lineHeight: 22,
    color: colors.inkSoft,
  },
  formContainer: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: radius.xxl,
    padding: 24,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    ...shadows.card,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    marginBottom: 14,
    paddingHorizontal: 14,
    height: 54,
  },
  inputWrapperFocused: {
    borderColor: colors.sage,
    backgroundColor: colors.surface,
  },
  inputIcon: { marginRight: 11 },
  input: {
    flex: 1,
    color: colors.ink,
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
  },
  primaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 17,
    borderRadius: radius.lg,
    marginTop: 6,
  },
  disabledButton: { opacity: 0.7 },
  primaryButtonText: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    letterSpacing: 0.3,
    color: colors.onDark,
  },
  privacyNote: {
    fontFamily: fonts.sans,
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.inkMuted,
    textAlign: 'center',
    marginTop: 14,
  },
  privacyLink: {
    fontFamily: fonts.sansBold,
    color: colors.forest,
    textDecorationLine: 'underline',
  },
  footerLink: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 12 },
  footerText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    color: colors.inkSoft,
  },
  footerTextStrong: {
    fontFamily: fonts.sansBold,
    color: colors.forest,
  },
});
