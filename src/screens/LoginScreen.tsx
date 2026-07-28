import React, { useEffect, useRef } from 'react';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowRight, Sparkles } from 'lucide-react-native';
import { RootStackParamList } from '../types';
import { colors, fonts, radius, shadows } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

const BACKGROUND_URI =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBQQnHT9ZdUvZSeofbui3TKtAoCwdfWtYSN5_pv8ABzEIsTEVftdAnhiCwe74SN_Y1W9LftGh0ZlUzHT1a8YcAlFlMAYJCZeWvqH1s6WW9dTR2A4TpBMT3tjKXrRyvu6kZA5UJfG7sHqhWU5YzrwzXIhWM5G0dbUlc4snDk1Y7tlGNLR6kGm7qbrrBcHNQ_ZeSFTWGrKoUbumkyxTzN1X3pAQpNOhwLCMhZVSGEkfkoRrcZs60bUC7P1w';

export default function LoginScreen({ navigation }: Props) {
  const { height } = useWindowDimensions();
  const isCompact = height < 720;
  const introAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(180, [
      Animated.timing(introAnim, { toValue: 1, duration: 640, useNativeDriver: true }),
      Animated.timing(buttonAnim, { toValue: 1, duration: 520, useNativeDriver: true }),
    ]).start();
  }, [buttonAnim, introAnim]);

  const introTranslateY = introAnim.interpolate({ inputRange: [0, 1], outputRange: [26, 0] });
  const buttonTranslateY = buttonAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });

  return (
    <ImageBackground source={{ uri: BACKGROUND_URI }} style={styles.background}>
      <LinearGradient
        colors={['rgba(251,250,246,0.55)', 'rgba(251,250,246,0.82)', 'rgba(251,250,246,0.97)']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[styles.container, isCompact && styles.containerCompact]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Animated.View
            style={[
              styles.header,
              isCompact && styles.headerCompact,
              { opacity: introAnim, transform: [{ translateY: introTranslateY }] },
            ]}
          >
            <View style={[styles.brandMark, isCompact && styles.brandMarkCompact]}>
              <Sparkles size={15} color={colors.gold} />
              <Text style={styles.brandMarkText}>AKILLI CİLT BAKIM RAFI</Text>
            </View>
            <Text style={[styles.title, isCompact && styles.titleCompact]}>SkinShelf</Text>
            <View style={[styles.titleRule, isCompact && styles.titleRuleCompact]} />
            <Text style={[styles.subtitle, isCompact && styles.subtitleCompact]}>
              Ürünlerini rafına ekle;{'\n'}uyumunu, rutinini ve cildini{'\n'}Shelly ile birlikte takip et.
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.buttonContainer,
              isCompact && styles.buttonContainerCompact,
              { opacity: buttonAnim, transform: [{ translateY: buttonTranslateY }] },
            ]}
          >
            <TouchableOpacity activeOpacity={0.88} onPress={() => navigation.navigate('SignIn')}>
              <LinearGradient
                colors={['#1C4630', '#0F2919']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>Giriş Yap</Text>
                <ArrowRight size={18} color={colors.onDark} />
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('SignUp')} activeOpacity={0.8}>
              <Text style={styles.secondaryButtonText}>Hesap Oluştur</Text>
            </TouchableOpacity>
            <Text style={styles.footnote}>Cilt bakımında sade, bilinçli ve kişisel bir başlangıç.</Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, resizeMode: 'cover' },
  safeArea: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'space-between', padding: 28 },
  containerCompact: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  header: { marginTop: 130, alignItems: 'center' },
  headerCompact: { marginTop: 34 },
  brandMark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: colors.lineGold,
    marginBottom: 22,
  },
  brandMarkCompact: { marginBottom: 14 },
  brandMarkText: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 10,
    letterSpacing: 2.2,
    color: colors.sage,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 58,
    lineHeight: 66,
    color: colors.forest,
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: 46,
    lineHeight: 52,
  },
  titleRule: {
    width: 46,
    height: 2,
    backgroundColor: colors.gold,
    borderRadius: 2,
    marginTop: 16,
    marginBottom: 18,
  },
  titleRuleCompact: {
    marginTop: 10,
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 16,
    lineHeight: 26,
    color: colors.inkSoft,
    textAlign: 'center',
  },
  subtitleCompact: {
    fontSize: 14,
    lineHeight: 21,
  },
  buttonContainer: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: radius.xxl,
    padding: 24,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    ...shadows.floating,
  },
  buttonContainerCompact: {
    padding: 18,
    marginTop: 28,
    marginBottom: 0,
  },
  primaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 17,
    borderRadius: radius.lg,
    marginBottom: 12,
  },
  primaryButtonText: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    letterSpacing: 0.3,
    color: colors.onDark,
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: colors.lineSage,
    backgroundColor: colors.surface,
    paddingVertical: 16,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    letterSpacing: 0.3,
    color: colors.forest,
  },
  footnote: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.inkMuted,
    textAlign: 'center',
    marginTop: 16,
  },
});
