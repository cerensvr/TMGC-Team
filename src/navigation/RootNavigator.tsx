import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Calendar, Camera, Home, User } from 'lucide-react-native';

import { RootStackParamList, MainTabParamList } from '../types';
import { colors, fonts, tabBarStyle } from '../theme';
import { authService } from '../services/authService';
import { useUser } from '../context/UserContext';
import { useProducts } from '../context/ProductContext';
import {
  attachNotificationResponseListener,
  clearScheduledNotifications,
  syncAllNotifications,
} from '../services/notificationScheduler';
import { errorDev } from '../services/logger';
import { importPersonalShelfProducts } from '../services/personalShelfImport';

import LoginScreen from '../screens/LoginScreen';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import HomeScreen from '../screens/HomeScreen';
import RoutineScreen from '../screens/RoutineScreen';
import AssistantScreen from '../screens/AssistantScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AccountSettingsScreen from '../screens/AccountSettingsScreen';
import ScannerScreen from '../screens/ScannerScreen';
import ProductReviewScreen from '../screens/ProductReviewScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import SkinTrackingScreen from '../screens/SkinTrackingScreen';
import AddSkinPhotoScreen from '../screens/AddSkinPhotoScreen';
import SkinAnalysisResultScreen from '../screens/SkinAnalysisResultScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.background,
    primary: colors.sage,
  },
};

function MainTabs() {
  const { profile, userId } = useUser();
  const { products } = useProducts();

  useEffect(() => {
    void syncAllNotifications(profile.reminderPreferences, products, userId).catch((error) => {
      errorDev('Bildirimler eşitlenemedi:', error);
    });
  }, [profile.reminderPreferences, products, userId]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.forest,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle,
        tabBarLabelStyle: {
          fontFamily: fonts.sansBold,
          fontSize: 11,
          letterSpacing: 0.4,
        },
        tabBarItemStyle: {
          borderRadius: 20,
          marginHorizontal: 10,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Dolabım',
          tabBarIcon: ({ color, focused }) => <Home color={color} size={focused ? 23 : 21} strokeWidth={focused ? 2.4 : 2} />,
        }}
      />
      <Tab.Screen
        name="Routine"
        component={RoutineScreen}
        options={{
          tabBarLabel: 'Rutinim',
          tabBarIcon: ({ color, focused }) => <Calendar color={color} size={focused ? 23 : 21} strokeWidth={focused ? 2.4 : 2} />,
        }}
      />
      <Tab.Screen
        name="SkinTracking"
        component={SkinTrackingScreen}
        options={{
          tabBarLabel: 'Cilt Takibi',
          tabBarIcon: ({ color, focused }) => <Camera color={color} size={focused ? 23 : 21} strokeWidth={focused ? 2.4 : 2} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color, focused }) => <User color={color} size={focused ? 23 : 21} strokeWidth={focused ? 2.4 : 2} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { loadProfile, setAccount, userId } = useUser();
  const { loadProducts } = useProducts();
  const [bootState, setBootState] = useState<'checking' | 'authenticated' | 'anonymous'>('checking');

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      try {
        const user = await authService.restoreSession();
        if (!user) {
          await clearScheduledNotifications();
          if (!cancelled) setBootState('anonymous');
          return;
        }

        setAccount({
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        });
        await importPersonalShelfProducts(user.email);
        await Promise.all([loadProfile(user.id), loadProducts()]);
        if (!cancelled) setBootState('authenticated');
      } catch {
        await clearScheduledNotifications();
        if (!cancelled) setBootState('anonymous');
      }
    };

    restore();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!userId || bootState === 'checking') return;

    const unsubscribe = attachNotificationResponseListener(destination => {
      if (!navigationRef.isReady()) return;

      if (destination.screen === 'Routine') {
        navigationRef.navigate('MainTabs', { screen: 'Routine' });
        return;
      }

      if (destination.screen === 'SkinTracking') {
        navigationRef.navigate('MainTabs', { screen: 'SkinTracking' });
        return;
      }

      navigationRef.navigate('ProductDetail', destination.params);
    });
    return unsubscribe;
  }, [bootState, userId]);

  if (bootState === 'checking') {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashBrand}>SkinShelf</Text>
        <ActivityIndicator size="small" color={colors.sage} style={{ marginTop: 18 }} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <Stack.Navigator
        initialRouteName={bootState === 'authenticated' ? 'MainTabs' : 'Login'}
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignIn" component={SignInScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen
          name="Scanner"
          component={ScannerScreen}
          options={{ presentation: 'fullScreenModal' }}
        />
        <Stack.Screen
          name="ProductReview"
          component={ProductReviewScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="Assistant" component={AssistantScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen
          name="ProductDetail"
          component={ProductDetailScreen}
          options={{ presentation: 'transparentModal', animation: 'slide_from_bottom', contentStyle: { backgroundColor: 'transparent' } }}
        />
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen
          name="AddSkinPhoto"
          component={AddSkinPhotoScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="SkinAnalysisResult"
          component={SkinAnalysisResultScreen}
          options={{ animation: 'slide_from_right' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashBrand: {
    fontFamily: fonts.display,
    fontSize: 34,
    color: colors.forest,
  },
});
