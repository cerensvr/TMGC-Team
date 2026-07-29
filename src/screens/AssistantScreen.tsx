import React, { useState, useRef, useEffect } from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  Switch,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Send, Sparkles, Bot, Shield, RotateCcw } from 'lucide-react-native';
import { RootStackParamList, Message, GeminiBotResponse } from '../types';
import { useUser } from '../context/UserContext';
import { callAssistantAPI, clearAssistantHistory, fetchAssistantHistory } from '../api/assistant';
import ShellyAdviceCard from '../components/ShellyAdviceCard';
import { errorDev } from '../services/logger';
import { colors, fonts, radius, shadows } from '../theme';

type AssistantScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Assistant'>;

type Props = {
  navigation: AssistantScreenNavigationProp;
};

const QUICK_ACTIONS = [
  { label: 'Rutinimi kontrol et', prompt: 'Bugünkü rutinim ağır mı?' },
  { label: 'Yeni ürün ekledim', prompt: 'Yeni eklediğim ürün rutinime uygun mu?' },
  { label: 'Birlikte kullanılır mı?', prompt: 'Bu iki ürün birlikte kullanılır mı?' },
  { label: 'Cildim tepki verdi', prompt: 'Cildim kızardı ve tepki verdi' },
  { label: 'İçerik analizi yap', prompt: 'Rafımdaki ürünlerin içeriklerini analiz eder misin?' },
  { label: 'Haftalık plan oluştur', prompt: 'Bana haftalık rutin planı oluşturur musun?' },
];

const QUICK_PROMPTS = ['Bu ürün rutinime uygun mu?', 'Bugünkü rutinim ağır mı?', 'Cildim tepki verdi'];

// ============ CHAT BUBBLE COMPONENT ============
const ChatBubble = ({ from, text }: { from: 'user' | 'ai'; text: string }) => (
  <View style={[styles.chatRow, from === 'user' && styles.chatRowUser]}>
    {from === 'ai' && (
      <View style={styles.chatAvatar}>
        <Bot size={14} color={colors.goldSoft} />
      </View>
    )}
    <View style={[styles.chatBubble, from === 'user' && styles.chatBubbleUser]}>
      <Text style={from === 'ai' ? styles.chatText : styles.chatTextUser}>{text}</Text>
    </View>
  </View>
);

// ============ MAIN COMPONENT ============
export default function AssistantScreen({ navigation }: Props) {
  const { activeIssue, setActiveIssue } = useUser();

  // STATE
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<GeminiBotResponse | null>(null);

  // REFS
  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // LOAD PREVIOUS CONVERSATION FROM BACKEND
  useEffect(() => {
    let cancelled = false;

    fetchAssistantHistory().then(history => {
      if (!cancelled && history.length) {
        setMessages(prev => (prev.length ? prev : history));
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // AUTO-SCROLL TO BOTTOM
  useEffect(() => {
    if (scrollViewRef.current && messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isLoading]);

  // ============ HANDLERS ============
  const sendPrompt = async (prompt: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      from: 'user',
      text: prompt,
    };
    setMessages(prev => [...prev, userMsg]);

    setIsLoading(true);
    try {
      const response = await callAssistantAPI(prompt);
      setLastResponse(response);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        from: 'ai',
        text: response.ai_response,
        structured: response.structured ?? undefined,
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      errorDev('Error sending message:', error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        from: 'ai',
        text: 'Şu anda bağlantı kurulamıyor. Lütfen tekrar deneyin.',
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (event?: any) => {
    // Web'de form submit / sayfa yenileme yan etkilerini engelle
    if (event) {
      if (typeof event.preventDefault === 'function') event.preventDefault();
      if (typeof event.stopPropagation === 'function') event.stopPropagation();
    }

    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;

    setInputValue('');
    await sendPrompt(trimmed);
  };

  const handleQuickAction = async (prompt: string) => {
    if (isLoading) return;
    await sendPrompt(prompt);
  };

  const handleToggleSafePlan = (value: boolean) => {
    if (!lastResponse?.detected_issue) return;

    if (value) {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.1, duration: 150, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();

      setActiveIssue(lastResponse.detected_issue);

      Alert.alert(
        'Güvenli Mod Aktif',
        `"${lastResponse.detected_issue}" nedeniyle Güvenli Mod başlatıldı. Rutinim ekranında ürün filtreleri ve koruma bantları aktif oldu.`,
        [{ text: 'Tamam' }]
      );
    } else {
      setActiveIssue(null);
      Alert.alert(
        'Güvenli Mod Kapatıldı',
        "Normal mod'a geri döndünüz. Tüm ürünler tekrar görünür.",
        [{ text: 'Tamam' }]
      );
    }
  };

  const handleResetChat = async () => {
    if (isLoading) return;
    try {
      await clearAssistantHistory();
      setMessages([]);
      setInputValue('');
      setLastResponse(null);
      setActiveIssue(null);
    } catch {
      Alert.alert(
        'Sohbet temizlenemedi',
        'Shelly hafızası sunucuda temizlenemedi. Bağlantını kontrol edip tekrar dene.'
      );
    }
  };

  // CONDITIONAL FLAGS
  const hasMessages = messages.length > 0;
  const showSafePlanButton = lastResponse?.intent_type === 'ISSUE' && lastResponse?.detected_issue && !isLoading;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ========== HEADER ========== */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.75}>
          <ArrowLeft size={21} color={colors.forest} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Shelly</Text>
          <View style={styles.onlineRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Cilt bakım asistanın</Text>
          </View>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* ========== MAIN CONTENT (SCROLLABLE) ========== */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!hasMessages && (
          <>
            <LinearGradient
              colors={['#1C4630', '#0F2919']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.heroIcon}>
                <Sparkles size={22} color={colors.goldSoft} />
              </View>
              <View style={styles.heroTextBlock}>
                <Text style={styles.heroTitle}>Shelly bugün neyi kontrol etsin?</Text>
                <Text style={styles.heroText}>
                  Shelly, rafındaki ürünleri tanır; rutinini, içerikleri ve cilt değişimlerini birlikte takip eder.
                </Text>
              </View>
            </LinearGradient>

            <View style={styles.actionGrid}>
              {QUICK_ACTIONS.map(action => (
                <TouchableOpacity
                  key={action.label}
                  style={styles.actionCard}
                  onPress={() => handleQuickAction(action.prompt)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.actionTitle}>{action.label}</Text>
                  <Text style={styles.actionSubtitle}>{action.prompt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {hasMessages && (
          <View style={styles.chatContainer}>
            {messages.map(msg =>
              msg.from === 'ai' && msg.structured ? (
                <ShellyAdviceCard key={msg.id} response={msg.structured} />
              ) : (
                <ChatBubble key={msg.id} from={msg.from} text={msg.text} />
              )
            )}

            {isLoading && (
              <View style={styles.chatRow}>
                <View style={styles.chatAvatar}>
                  <ActivityIndicator size="small" color={colors.goldSoft} />
                </View>
                <View style={styles.chatBubble}>
                  <Text style={styles.chatText}>Düşünüyorum...</Text>
                </View>
              </View>
            )}

            {showSafePlanButton && (
              <View style={styles.safePlanToggleContainer}>
                <View style={styles.safePlanToggleContent}>
                  <View style={styles.safePlanToggleLeft}>
                    <Shield size={18} color={colors.danger} />
                    <View style={styles.safePlanToggleText}>
                      <Text style={styles.safePlanToggleTitle}>Cilt Bariyerini Koru</Text>
                      <Text style={styles.safePlanToggleSubtitle}>Güvenli Mod</Text>
                    </View>
                  </View>
                  <Switch
                    value={activeIssue === lastResponse?.detected_issue}
                    onValueChange={handleToggleSafePlan}
                    trackColor={{ false: colors.surfaceSage, true: colors.danger }}
                    thumbColor={colors.surface}
                    ios_backgroundColor={colors.surfaceSage}
                  />
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.resetButton} onPress={handleResetChat} activeOpacity={0.75}>
              <RotateCcw size={15} color={colors.sage} />
              <Text style={styles.resetButtonText}>Yeni sohbet başlat</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ========== FIXED BOTTOM INPUT AREA ========== */}
      <View style={styles.inputContainer}>
        {!hasMessages && (
          <View style={styles.quickPromptsRow}>
            {QUICK_PROMPTS.map(prompt => (
              <TouchableOpacity
                key={prompt}
                style={styles.quickPromptButton}
                onPress={() => handleQuickAction(prompt)}
                activeOpacity={0.75}
              >
                <Text style={styles.quickPromptText}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.inputRow}>
          <TextInput
            ref={textInputRef}
            value={inputValue}
            onChangeText={setInputValue}
            onSubmitEditing={e => {
              if (e && typeof e.preventDefault === 'function') e.preventDefault();
              handleSendMessage();
            }}
            placeholder="Ürün, rutin veya cilt değişimini yaz"
            placeholderTextColor={colors.inkMuted}
            style={styles.input}
            multiline={false}
            maxLength={500}
            editable={!isLoading}
            blurOnSubmit={false}
            returnKeyType="send"
          />
          <TouchableOpacity
            onPress={e => handleSendMessage(e)}
            disabled={isLoading || !inputValue.trim()}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <LinearGradient
              colors={isLoading || !inputValue.trim() ? ['#B8BFB8', '#A7AFA7'] : ['#1C4630', '#0F2919']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sendButton}
            >
              <Send size={17} color={colors.onDark} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ============ STYLES ============
const androidHeaderPadding = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 14 : 20;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: androidHeaderPadding,
    paddingBottom: 14,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.background,
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
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontFamily: fonts.display,
    color: colors.forest,
    fontSize: 24,
  },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  onlineText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    color: colors.inkMuted,
  },
  headerSpacer: {
    width: 44,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingVertical: 20,
  },
  heroCard: {
    flexDirection: 'row',
    borderRadius: radius.xl,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    ...shadows.card,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(216,195,154,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  heroTextBlock: {
    flex: 1,
  },
  heroTitle: {
    fontFamily: fonts.display,
    color: colors.onDark,
    fontSize: 19,
    lineHeight: 25,
  },
  heroText: {
    fontFamily: fonts.sans,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 7,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  actionCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    minHeight: 96,
    justifyContent: 'space-between',
    ...shadows.soft,
  },
  actionTitle: {
    fontFamily: fonts.sansBold,
    color: colors.ink,
    fontSize: 14,
    lineHeight: 19,
  },
  actionSubtitle: {
    fontFamily: fonts.sans,
    color: colors.inkMuted,
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 8,
  },
  chatContainer: {
    paddingBottom: 16,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 11,
  },
  chatRowUser: {
    justifyContent: 'flex-end',
  },
  chatAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.forest,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 9,
  },
  chatBubble: {
    maxWidth: '84%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 11,
    ...shadows.soft,
  },
  chatBubbleUser: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: 6,
  },
  chatText: {
    fontFamily: fonts.sansSemiBold,
    color: colors.inkSoft,
    fontSize: 13.5,
    lineHeight: 20,
  },
  chatTextUser: {
    fontFamily: fonts.sansSemiBold,
    color: colors.onDark,
    fontSize: 13.5,
    lineHeight: 20,
  },
  safePlanToggleContainer: {
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 15,
    paddingVertical: 13,
    backgroundColor: colors.dangerSurface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#F2D9D6',
  },
  safePlanToggleContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  safePlanToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  safePlanToggleText: {
    flex: 1,
  },
  safePlanToggleTitle: {
    fontFamily: fonts.sansBold,
    color: colors.ink,
    fontSize: 14,
  },
  safePlanToggleSubtitle: {
    fontFamily: fonts.sansSemiBold,
    color: colors.danger,
    fontSize: 11.5,
    marginTop: 2,
  },
  resetButton: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  resetButtonText: {
    fontFamily: fonts.sansBold,
    color: colors.sage,
    fontSize: 13,
  },
  inputContainer: {
    backgroundColor: colors.background,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 22 : 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  quickPromptsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  quickPromptButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.lineGold,
  },
  quickPromptText: {
    fontFamily: fonts.sansBold,
    color: colors.sage,
    fontSize: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
    paddingHorizontal: 15,
    color: colors.ink,
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
  },
  sendButton: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
