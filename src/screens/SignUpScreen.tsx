import React, { useState } from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity, SafeAreaView, TextInput, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { User, Mail, Lock, ArrowLeft, ArrowRight } from 'lucide-react-native';
import { authService } from '../services/authService';
import { useUser } from '../context/UserContext';
import { errorDev } from '../services/logger';
import { colors, fonts, radius, shadows } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SignUp'>;
};

const BACKGROUND_URI =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBQQnHT9ZdUvZSeofbui3TKtAoCwdfWtYSN5_pv8ABzEIsTEVftdAnhiCwe74SN_Y1W9LftGh0ZlUzHT1a8YcAlFlMAYJCZeWvqH1s6WW9dTR2A4TpBMT3tjKXrRyvu6kZA5UJfG7sHqhWU5YzrwzXIhWM5G0dbUlc4snDk1Y7tlGNLR6kGm7qbrrBcHNQ_ZeSFTWGrKoUbumkyxTzN1X3pAQpNOhwLCMhZVSGEkfkoRrcZs60bUC7P1w';

export default function SignUpScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<'name' | 'email' | 'password' | null>(null);
  const { loadProfile, setAccount } = useUser();

  const handleSignUp = async () => {
    if (!name || !email || !password) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
      return;
    }
    setLoading(true);
    try {
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '';

      const response = await authService.register({ firstName, lastName, email, password });

      setAccount({
        email: response.user.email,
        firstName: response.user.firstName,
        lastName: response.user.lastName,
      });
      await loadProfile(response.user.id);

      if (Platform.OS === 'web') {
        (navigation as any).navigate('Onboarding', { userId: response.user.id });
      } else {
        Alert.alert('Başarılı', 'Hesabınız oluşturuldu!', [
          { text: 'Tamam', onPress: () => (navigation as any).navigate('Onboarding', { userId: response.user.id }) },
        ]);
      }
    } catch (error) {
      errorDev('Registration error:', error);
      Alert.alert('Hata', 'Kayıt işlemi başarısız oldu.');
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
        <View style={styles.container}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <ArrowLeft size={21} color={colors.forest} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.overline}>SKINSHELF'E KATIL</Text>
            <Text style={styles.title}>Hesap Oluştur</Text>
            <Text style={styles.subtitle}>Cilt bakımını kişiselleştirmeye birkaç adımda başla.</Text>
          </View>

          <View style={styles.formContainer}>
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
              />
            </View>
            <View style={inputWrapperStyle('email')}>
              <Mail size={19} color={focusedField === 'email' ? colors.sage : colors.inkMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="E-posta"
                placeholderTextColor={colors.inkMuted}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            <View style={inputWrapperStyle('password')}>
              <Lock size={19} color={focusedField === 'password' ? colors.sage : colors.inkMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Şifre"
                secureTextEntry
                placeholderTextColor={colors.inkMuted}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
            <TouchableOpacity onPress={handleSignUp} disabled={loading} activeOpacity={0.88}>
              <LinearGradient
                colors={['#1C4630', '#0F2919']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.primaryButton, loading && styles.disabledButton]}
              >
                <Text style={styles.primaryButtonText}>{loading ? 'Kaydediliyor...' : 'Kayıt Ol'}</Text>
                {!loading && <ArrowRight size={17} color={colors.onDark} />}
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.privacyNote}>Kayıt olarak verilerinin yalnızca rutin önerileri için kullanılmasını kabul edersin.</Text>
          </View>

          <TouchableOpacity onPress={() => navigation.replace('SignIn')} style={styles.footerLink}>
            <Text style={styles.footerText}>
              Zaten hesabın var mı? <Text style={styles.footerTextStrong}>Giriş Yap</Text>
            </Text>
          </TouchableOpacity>
        </View>
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
