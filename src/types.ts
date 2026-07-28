
export type Category = 'Temizleyici' | 'Tonik' | 'Serum' | 'Göz Kremi' | 'Nemlendirici' | 'Güneş Kremi' | 'Maske' | 'Diğer';

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: Category;
  timeOfDay: 'morning' | 'evening' | 'both';
  imageUrl: string;
  cutoutImageUrl?: string;
  description: string;
  expiryDate?: string;
  activeIngredients?: string[];
  isFavorite?: boolean;
  isActive?: boolean;
}

export type ProductDraft = Omit<Product, 'id'>;

export type RootStackParamList = {
  Login: undefined;
  SignIn: undefined;
  SignUp: undefined;
  Onboarding: undefined;
  MainTabs: undefined; 
  Scanner: undefined;
  ProductReview: { scannedProduct?: ProductDraft; editingProductId?: string; source?: 'barcode' | 'manual' } | undefined;
  ProductDetail: { productId: string };
  Assistant: undefined;
  Notifications: undefined;
  AddSkinPhoto: undefined;
  SkinAnalysisResult: { analysis: SkinAnalysis };
};

export type MainTabParamList = {
  Home: undefined;
  Routine: undefined;
  SkinTracking: undefined;
  Profile: undefined;
};

// ============ SKIN TRACKING TYPES ============
export type SkinChangeLevel = 'low' | 'medium' | 'high' | 'unknown';
export type SkinTrend = 'increased' | 'decreased' | 'stable' | 'unknown';

export type SkinVisibleChanges = {
  redness: SkinChangeLevel;
  dryness: SkinChangeLevel;
  oiliness: SkinChangeLevel;
  blemishAppearance: SkinChangeLevel;
  irritationAppearance: SkinChangeLevel;
};

export type SkinAnalysis = {
  logId: number | null;
  title: string;
  summary: string;
  visibleChanges: SkinVisibleChanges;
  routineConnection: string;
  suggestion: string;
  warning: string;
  riskLevel: 'low' | 'medium' | 'high';
  tags: string[];
  createdAt: string | null;
};

export type SkinLogEntry = {
  id: number;
  skinFeeling: string | null;
  usedNewProduct: boolean | null;
  userNote: string | null;
  drynessLevel: SkinChangeLevel | null;
  rednessLevel: SkinChangeLevel | null;
  oilinessLevel: SkinChangeLevel | null;
  blemishLevel: SkinChangeLevel | null;
  irritationLevel: SkinChangeLevel | null;
  analysisJson: string | null;
  createdAt: string | null;
};

export type SkinWeeklySummary = {
  logCount: number;
  trends: {
    dryness: SkinTrend;
    redness: SkinTrend;
    oiliness: SkinTrend;
    blemish: SkinTrend;
  };
  newProducts: string[];
  shellyComment: string;
};

// ============ ASSISTANT / CHAT TYPES ============
export type Message = {
  id: string;
  from: 'user' | 'ai';
  text: string;
  /** Varsa Shelly'nin yapılandırılmış yanıtı; kart olarak gösterilir. */
  structured?: ShellyStructuredResponse;
};

export type ShellyStructuredResponse = {
  mode: string;
  title: string;
  summary: string;
  reason: string | null;
  suggestion: string | null;
  warning: string | null;
  riskLevel: 'low' | 'medium' | 'high';
  tags: string[];
};

export type GeminiBotResponse = {
  intent_type: 'INFO' | 'ISSUE';
  detected_issue: string | null;
  ai_response: string;
  structured?: ShellyStructuredResponse | null;
};
