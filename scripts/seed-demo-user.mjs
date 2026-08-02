import { randomBytes } from 'node:crypto';

const apiBaseUrl = process.env.API_BASE_URL || 'https://skinshelf-backend.onrender.com/api';
const email = process.env.DEMO_EMAIL;
const suppliedPassword = process.env.DEMO_PASSWORD;
const password = suppliedPassword || `SkinShelf#${randomBytes(6).toString('base64url')}!`;

if (!email) {
  throw new Error('DEMO_EMAIL ortam değişkeni zorunludur.');
}

class ApiError extends Error {
  constructor(status, method, path, data) {
    super(`${method} ${path} failed: ${status} ${JSON.stringify(data)}`);
    this.status = status;
    this.data = data;
  }
}

const parseBody = (text) => {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const request = async (path, options = {}) => {
  const method = options.method || 'GET';
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const data = parseBody(await response.text());
  if (!response.ok) throw new ApiError(response.status, method, path, data);
  return data;
};

const normalize = (value = '') => value.toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim();
const authHeaders = (token) => ({ Authorization: `Bearer ${token}` });

const profile = {
  displayName: 'Ceren Demo',
  nickname: 'Ceren',
  ageRange: '25-34',
  experienceLevel: 'Aktif içerikleri biliyorum',
  experience: 'Orta',
  skinFeel: 'T bölgesi yağlı, yanaklar normal',
  postWashFeel: 'Burun çevresi hızlı yağlanıyor',
  mainGoal: 'Sivilce / komedon görünümü',
  productFitIntent: 'Aktif içerikleri güvenli biçimde haftaya yaymak',
  sensitivityLevel: 'Bazen',
  sensitivity: 'Orta hassasiyet',
  reactionHistory: 'Güçlü aktifleri aynı gece kullandığımda kuruluk hissedebiliyorum',
  currentRoutine: ['Temizleyici', 'Nemlendirici', 'Güneş kremi'],
  recentActives: ['BHA', 'Retinol'],
  trackingPreferences: ['Stres', 'Uyku', 'Güneşe maruz kalma'],
  skinTypeGuess: 'Karma Cilt',
  skinType: 'Karma Cilt',
  concerns: ['Sivilce / komedon', 'Gözenek görünümü', 'Düzensiz doku'],
  lifestyleFactors: ['Yoğun tempo'],
  reminderPreferences: ['Akşam rutinim için', 'Haftalık cilt özeti için'],
  gender: 'Belirtmek istemiyorum',
  isPregnant: false,
  conditions: [],
  allergens: [],
  isOnboarded: true,
};

const products = [
  {
    name: 'Köpüren Temizleyici',
    brand: 'CeraVe',
    category: 'Temizleyici',
    timeOfDay: 'both',
    imageUrl: '',
    cutoutImageUrl: 'local:cerave-kopuren-temizleyici',
    description: 'Sabah ve akşam kullanılabilen nazik jel temizleyici.',
    expiryDate: '2027-06-30',
    activeIngredients: ['Ceramide', 'Niacinamide'],
    isFavorite: true,
    isActive: true,
  },
  {
    name: '%2 BHA Liquid Exfoliant',
    brand: "Paula's Choice",
    category: 'Tonik',
    timeOfDay: 'evening',
    imageUrl: '',
    cutoutImageUrl: '',
    description: 'Salisilik asit içeren akşam bakım ürünü.',
    expiryDate: '2027-03-31',
    activeIngredients: ['Salicylic Acid', 'BHA'],
    isFavorite: true,
    isActive: true,
  },
  {
    name: 'Retinol 0.2% in Squalane',
    brand: 'The Ordinary',
    category: 'Serum',
    timeOfDay: 'evening',
    imageUrl: '',
    cutoutImageUrl: '',
    description: 'Düşük oranlı retinol içeren akşam serumu.',
    expiryDate: '2027-02-28',
    activeIngredients: ['Retinol', 'Squalane'],
    isFavorite: true,
    isActive: true,
  },
  {
    name: 'Cicaplast Baume B5+',
    brand: 'La Roche-Posay',
    category: 'Nemlendirici',
    timeOfDay: 'both',
    imageUrl: '',
    cutoutImageUrl: 'local:la-roche-posay-cicaplast-baume-b5',
    description: 'Aktif gecelerinden sonra bariyer desteği için nemlendirici bakım.',
    expiryDate: '2027-09-30',
    activeIngredients: ['Panthenol', 'Madecassoside'],
    isFavorite: true,
    isActive: true,
  },
  {
    name: 'Anthelios UVMune 400 SPF 50+',
    brand: 'La Roche-Posay',
    category: 'Güneş Kremi',
    timeOfDay: 'morning',
    imageUrl: '',
    cutoutImageUrl: 'local:anthelios-uvair-spf50',
    description: 'Sabah rutininin son adımı için yüksek korumalı güneş kremi.',
    expiryDate: '2027-08-31',
    activeIngredients: ['SPF 50+', 'UV Filters'],
    isFavorite: true,
    isActive: true,
  },
];

const loginOrRegister = async () => {
  if (suppliedPassword) {
    try {
      return { auth: await request('/auth/login', {
        method: 'POST',
        body: { email, password },
      }), created: false };
    } catch (error) {
      if (!(error instanceof ApiError) || ![400, 401, 404].includes(error.status)) throw error;
    }
  }

  return { auth: await request('/auth/register', {
    method: 'POST',
    body: {
      email,
      password,
      firstName: 'Ceren',
      lastName: 'Demo',
    },
  }), created: true };
};

const loginResult = await loginOrRegister();
const auth = loginResult.auth;
if (!auth?.token) throw new Error('Kimlik doğrulama yanıtında token bulunamadı.');
const headers = authHeaders(auth.token);

await request('/profiles/me', { method: 'PUT', headers, body: profile });

const existingProducts = await request('/products', { headers });
const seededProducts = [];
for (const product of products) {
  const existing = existingProducts.find(
    (item) => normalize(item.brand) === normalize(product.brand) && normalize(item.name) === normalize(product.name),
  );
  const saved = existing
    ? await request(`/products/${existing.id}`, { method: 'PUT', headers, body: product })
    : await request('/products', { method: 'POST', headers, body: product });
  seededProducts.push(saved);
}

const skinLogs = await request('/skin-logs', { headers });
if (skinLogs.length === 0) {
  await request('/skin-logs/analyze', {
    method: 'POST',
    headers,
    body: {
      skinFeeling: 'Bugün cildim dengeli, hafif kuruluk var',
      usedNewProduct: false,
      userNote: 'Demo başlangıç kaydı',
      discardPhoto: true,
    },
  });
  await request('/skin-logs/analyze', {
    method: 'POST',
    headers,
    body: {
      skinFeeling: 'Kızarıklık azaldı, kuruluk dengelendi',
      usedNewProduct: false,
      userNote: 'Demo takip kaydı',
      discardPhoto: true,
    },
  });
}

await request('/assistant/history', { method: 'DELETE', headers });
const prompt = 'BHA ve retinolü haftaya yay. Aynı gece birlikte kullanmalı mıyım? Pazartesi retinol, Perşembe BHA olacak şekilde güvenli bir plan oluştur.';
const assistant = await request('/assistant/chat', {
  method: 'POST',
  headers,
  body: { message: prompt },
});

const warningsText = [assistant.warning, ...(assistant.safetyWarnings || [])]
  .filter(Boolean)
  .join(' ')
  .toLocaleLowerCase('tr-TR');
const routinePeriods = new Set((assistant.routineSteps || []).map((step) => step.period));
const narrativeText = [assistant.summary, assistant.analysis, assistant.suggestion, assistant.warning]
  .filter(Boolean)
  .join(' ')
  .toLocaleLowerCase('tr-TR');

if (assistant.mode !== 'WEEKLY_PLAN') {
  throw new Error(`Beklenen WEEKLY_PLAN yerine ${assistant.mode} modu döndü.`);
}
if (assistant.riskLevel !== 'low') {
  throw new Error(`Güvenli haftalık plan için beklenen low risk yerine ${assistant.riskLevel} döndü.`);
}
if (warningsText.includes('aynı gece')) {
  throw new Error(`Güvenli ayrılan aktifler için gereksiz aynı gece uyarısı döndü: ${warningsText}`);
}
if (!routinePeriods.has('MONDAY_EVENING') || !routinePeriods.has('THURSDAY_EVENING')) {
  throw new Error(`Aktifler farklı gecelere ayrılmadı: ${JSON.stringify([...routinePeriods])}`);
}
if (!narrativeText.includes('pazartesi') || !narrativeText.includes('perşembe')) {
  throw new Error(`Anlatı ile plan günleri uyuşmuyor: ${narrativeText}`);
}

console.log(JSON.stringify({
  email,
  createdNewAccount: loginResult.created,
  displayName: profile.displayName,
  productCount: seededProducts.length,
  products: seededProducts.map((product) => `${product.brand} ${product.name}`),
  prompt,
  assistant: {
    mode: assistant.mode,
    riskLevel: assistant.riskLevel,
    title: assistant.title,
    summary: assistant.summary,
    suggestion: assistant.suggestion,
    warning: assistant.warning,
    safetyWarnings: assistant.safetyWarnings,
    routinePlan: (assistant.routineSteps || []).map((step) => ({
      period: step.period,
      productName: step.productName,
      instruction: step.instruction,
    })),
  },
}, null, 2));
