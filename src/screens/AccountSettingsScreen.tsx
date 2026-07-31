import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, LockKeyhole, Mail, UserRound } from 'lucide-react-native';
import { RootStackParamList } from '../types';
import { authService } from '../services/authService';
import { useUser } from '../context/UserContext';
import { errorDev } from '../services/logger';
import { colors, fonts, radius, shadows } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AccountSettings'>;
};

const TOUCH_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

const messageFor = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message && !error.message.toLowerCase().includes('network')) {
    return error.message;
  }
  return fallback;
};

export default function AccountSettingsScreen({ navigation }: Props) {
  const { account, setAccount } = useUser();
  const [firstName, setFirstName] = useState(account?.firstName ?? '');
  const [lastName, setLastName] = useState(account?.lastName ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const saveProfile = async () => {
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    if (!cleanFirstName) {
      Alert.alert('Eksik Alan', 'Ad alanını doldurmalısın.');
      return;
    }

    setSavingProfile(true);
    try {
      const updated = await authService.updateAccount({
        firstName: cleanFirstName,
        lastName: cleanLastName,
      });
      setAccount({
        email: updated.email,
        firstName: updated.firstName,
        lastName: updated.lastName,
      });
      setFirstName(updated.firstName ?? '');
      setLastName(updated.lastName ?? '');
      Alert.alert('Kaydedildi', 'Hesap bilgilerin güncellendi.');
    } catch (error) {
      errorDev('Account update error:', error);
      Alert.alert('Güncellenemedi', messageFor(error, 'Hesap bilgileri güncellenemedi. Tekrar dene.'));
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Eksik Alan', 'Üç şifre alanını da doldurmalısın.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Geçersiz Şifre', 'Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Şifreler Eşleşmiyor', 'Yeni şifre ve doğrulama alanları aynı olmalıdır.');
      return;
    }
    if (newPassword === currentPassword) {
      Alert.alert('Geçersiz Şifre', 'Yeni şifre mevcut şifreden farklı olmalıdır.');
      return;
    }

    setSavingPassword(true);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Şifre Güncellendi', 'Yeni şifren bir sonraki girişte kullanılmaya hazır.');
    } catch (error) {
      errorDev('Password change error:', error);
      Alert.alert('Şifre Değiştirilemedi', messageFor(error, 'Şifren değiştirilemedi. Tekrar dene.'));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={TOUCH_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Geri dön"
          >
            <ArrowLeft size={21} color={colors.forest} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Hesap Ayarları</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.intro}>
            <Text style={styles.overline}>HESAP BİLGİLERİ</Text>
            <Text style={styles.title}>Bilgilerini güncel tut</Text>
            <Text style={styles.subtitle}>Adını düzenleyebilir ve mevcut şifreni güvenle değiştirebilirsin.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Profil Bilgileri</Text>
            <View style={[styles.inputRow, styles.readOnlyRow]}>
              <Mail size={18} color={colors.inkMuted} />
              <Text style={styles.readOnlyText}>{account?.email || 'E-posta bulunamadı'}</Text>
            </View>
            <Text style={styles.helper}>E-posta adresi hesap kimliğidir ve bu sürümde değiştirilemez.</Text>

            <View style={styles.inputRow}>
              <UserRound size={18} color={colors.sage} />
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Ad"
                placeholderTextColor={colors.inkMuted}
                autoCapitalize="words"
                maxLength={50}
                editable={!savingProfile}
              />
            </View>
            <View style={styles.inputRow}>
              <UserRound size={18} color={colors.sage} />
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Soyad (isteğe bağlı)"
                placeholderTextColor={colors.inkMuted}
                autoCapitalize="words"
                maxLength={50}
                editable={!savingProfile}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, savingProfile && styles.disabledButton]}
              onPress={saveProfile}
              disabled={savingProfile}
              accessibilityRole="button"
              accessibilityState={{ busy: savingProfile }}
            >
              {savingProfile ? <ActivityIndicator color={colors.onDark} /> : <Text style={styles.primaryButtonText}>Bilgileri Kaydet</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Şifreyi Değiştir</Text>
            <Text style={styles.cardDescription}>Hesabını korumak için önce mevcut şifreni doğrula.</Text>
            {[
              { value: currentPassword, setter: setCurrentPassword, placeholder: 'Mevcut şifre', autoComplete: 'current-password' as const },
              { value: newPassword, setter: setNewPassword, placeholder: 'Yeni şifre', autoComplete: 'new-password' as const },
              { value: confirmPassword, setter: setConfirmPassword, placeholder: 'Yeni şifre tekrar', autoComplete: 'new-password' as const },
            ].map(field => (
              <View style={styles.inputRow} key={field.placeholder}>
                <LockKeyhole size={18} color={colors.sage} />
                <TextInput
                  style={styles.input}
                  value={field.value}
                  onChangeText={field.setter}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.inkMuted}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete={field.autoComplete}
                  editable={!savingPassword}
                />
              </View>
            ))}

            <TouchableOpacity
              style={[styles.secondaryButton, savingPassword && styles.disabledButton]}
              onPress={savePassword}
              disabled={savingPassword}
              accessibilityRole="button"
              accessibilityState={{ busy: savingPassword }}
            >
              {savingPassword ? <ActivityIndicator color={colors.forest} /> : <Text style={styles.secondaryButtonText}>Şifreyi Güncelle</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const headerPadding = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 14;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingTop: headerPadding,
    paddingBottom: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.display, fontSize: 22, color: colors.forest },
  headerSpacer: { width: 42 },
  content: { padding: 22, paddingBottom: 60 },
  intro: { marginBottom: 22 },
  overline: { fontFamily: fonts.sansExtraBold, fontSize: 10.5, letterSpacing: 1.7, color: colors.sage, marginBottom: 8 },
  title: { fontFamily: fonts.display, fontSize: 29, color: colors.forest, marginBottom: 8 },
  subtitle: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 21, color: colors.inkSoft },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
    marginBottom: 18,
    ...shadows.soft,
  },
  cardTitle: { fontFamily: fonts.display, fontSize: 21, color: colors.forest, marginBottom: 8 },
  cardDescription: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, color: colors.inkMuted, marginBottom: 13 },
  inputRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderWidth: 1,
    borderColor: colors.lineSage,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    marginTop: 11,
  },
  readOnlyRow: { backgroundColor: colors.surfaceMuted, borderColor: colors.line },
  readOnlyText: { flex: 1, fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.inkSoft },
  helper: { fontFamily: fonts.sans, fontSize: 11.5, lineHeight: 17, color: colors.inkMuted, marginTop: 7, marginHorizontal: 2 },
  input: { flex: 1, paddingVertical: 14, fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.ink },
  primaryButton: {
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.forest,
    borderRadius: radius.md,
    marginTop: 16,
  },
  primaryButtonText: { fontFamily: fonts.sansBold, fontSize: 14.5, color: colors.onDark },
  secondaryButton: {
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceSage,
    borderWidth: 1,
    borderColor: colors.lineSage,
    borderRadius: radius.md,
    marginTop: 16,
  },
  secondaryButtonText: { fontFamily: fonts.sansBold, fontSize: 14.5, color: colors.forest },
  disabledButton: { opacity: 0.65 },
});
