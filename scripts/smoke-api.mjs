const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:8080/api';
const password = 'SmokeTest123!';
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const scenarios = [
  {
    emailPrefix: 'test-kuru',
    firstName: 'Test',
    lastName: 'Kuru',
    profile: {
      displayName: 'Test Kuru',
      ageRange: '18-24',
      experienceLevel: 'Yeni başlıyorum',
      skinFeel: 'Hep kuru / gergin',
      postWashFeel: 'Gerginlik ve kuruluk oluyor',
      mainGoal: 'Kızarıklık / hassasiyet',
      sensitivityLevel: 'Evet, sık sık kızarır/yanar',
      skinType: 'Kuru Cilt',
      trackingPreferences: ['Uyku', 'Stres'],
      reminderPreferences: ['Akşam rutinim için'],
      isOnboarded: true,
    },
    product: {
      name: 'Kuru Cilt Nemlendirici',
      brand: 'La Roche-Posay',
      category: 'Nemlendirici',
      timeOfDay: 'both',
      imageUrl: '',
      description: 'Hassas ciltler için bariyer destekli nemlendirici.',
      activeIngredients: ['Glycerin', 'Niacinamide'],
      isFavorite: true,
    },
    prompt: 'Cildim kızardı ve tepki verdi',
    expectedMode: 'SKIN_REACTION',
  },
  {
    emailPrefix: 'test-yagli',
    firstName: 'Test',
    lastName: 'Yagli',
    profile: {
      displayName: 'Test Yagli',
      ageRange: '25-34',
      experienceLevel: 'Aktif içerikleri biliyorum',
      skinFeel: 'Genel olarak yağlı',
      postWashFeel: 'Hızlıca yağlanıyor',
      mainGoal: 'Sivilce / komedon görünümü',
      sensitivityLevel: 'Bazen',
      skinType: 'Yağlı Cilt',
      trackingPreferences: ['Regl dönemi', 'Beslenme'],
      reminderPreferences: ['Ürün kullanım takibi için'],
      isOnboarded: true,
    },
    product: {
      name: 'Yagli Cilt BHA',
      brand: 'Paula’s Choice',
      category: 'Tonik',
      timeOfDay: 'evening',
      imageUrl: '',
      description: 'Salisilik asit içeren gözenek bakım ürünü.',
      activeIngredients: ['Salicylic Acid'],
      isFavorite: false,
    },
    prompt: 'Bu iki ürün birlikte kullanılır mı?',
    expectedMode: 'INGREDIENT_ANALYSIS',
  },
  {
    emailPrefix: 'test-karma',
    firstName: 'Test',
    lastName: 'Karma',
    profile: {
      displayName: 'Test Karma',
      ageRange: '35+',
      experienceLevel: 'Rutinim detaylı',
      skinFeel: 'T bölgesi yağlı, yanaklar normal',
      postWashFeel: 'Burun çevresi hızlı yağlanıyor',
      mainGoal: 'Daha düzenli rutin',
      sensitivityLevel: 'Hayır, genelde dayanıklı',
      skinType: 'Karma Cilt',
      currentRoutine: ['Temizleyici', 'Nemlendirici', 'Güneş kremi'],
      trackingPreferences: ['Su tüketimi', 'Güneşe maruz kalma'],
      reminderPreferences: ['Sabah rutinim için', 'Haftalık cilt özeti için'],
      isOnboarded: true,
    },
    product: {
      name: 'Daily SPF 50',
      brand: 'Beauty of Joseon',
      category: 'Güneş Kremi',
      timeOfDay: 'morning',
      imageUrl: '',
      description: 'Gündüz rutini için SPF ürünü.',
      activeIngredients: ['Sunscreen Filters'],
      isFavorite: true,
    },
    prompt: 'Bugünkü rutinim ağır mı?',
    expectedMode: 'ROUTINE_CHECK',
  },
];

class ApiError extends Error {
  constructor(status, method, path, data) {
    super(`${method} ${path} failed: ${status} ${JSON.stringify(data)}`);
    this.status = status;
    this.data = data;
  }
}

const parseBody = (text) => {
  if (!text) {
    return null;
  }

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
  const text = await response.text();
  const data = parseBody(text);
  if (!response.ok) {
    throw new ApiError(response.status, method, path, data);
  }
  return data;
};

const authHeaders = (token) => ({ Authorization: `Bearer ${token}` });

const expectStatus = async (status, path, options = {}) => {
  try {
    await request(path, options);
  } catch (error) {
    if (error instanceof ApiError && error.status === status) {
      return;
    }
    throw error;
  }
  throw new Error(`${options.method || 'GET'} ${path} unexpectedly succeeded; expected ${status}`);
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const verified = [];
const health = await request('/health');

if (health?.status !== 'ok') {
  throw new Error(`Health check failed: ${JSON.stringify(health)}`);
}

for (const scenario of scenarios) {
  const email = `${scenario.emailPrefix}+${runId}@example.com`;
  let token = null;

  try {
    const registered = await request('/auth/register', {
      method: 'POST',
      body: {
        email,
        password,
        firstName: scenario.firstName,
        lastName: scenario.lastName,
      },
    });
    assert(registered?.token, `Register did not return a token for ${email}`);

    const auth = await request('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    token = auth.token;
    const headers = authHeaders(token);

    const me = await request('/auth/me', { headers });
    assert(me.email === email, `Authenticated user mismatch for ${email}`);

    await request('/profiles/me', {
      method: 'PUT',
      headers,
      body: scenario.profile,
    });
    const updatedDisplayName = `${scenario.profile.displayName} Smoke`;
    const updatedProfile = await request('/profiles/me', {
      method: 'PUT',
      headers,
      body: { ...scenario.profile, displayName: updatedDisplayName },
    });
    const profile = await request('/profiles/me', { headers });
    assert(updatedProfile.displayName === updatedDisplayName, `Profile update failed for ${email}`);
    assert(profile.displayName === updatedDisplayName, `Profile read failed for ${email}`);

    const product = await request('/products', {
      method: 'POST',
      headers,
      body: scenario.product,
    });
    const updatedProduct = await request(`/products/${product.id}`, {
      method: 'PUT',
      headers,
      body: { ...scenario.product, isFavorite: !scenario.product.isFavorite },
    });
    assert(
      updatedProduct.isFavorite === !scenario.product.isFavorite,
      `Product update failed for ${email}`,
    );
    const products = await request('/products', { headers });
    assert(
      products.some((item) => item.id === product.id),
      `Product is missing from product list for ${email}`,
    );

    const ingredientAnalysis = await request('/assistant/analyze-ingredients', {
      method: 'POST',
      headers,
      body: {
        name: scenario.product.name,
        brand: scenario.product.brand,
        category: scenario.product.category,
        description: scenario.product.description,
        activeIngredients: scenario.product.activeIngredients,
      },
    });
    assert(ingredientAnalysis.summary, `Ingredient analysis is empty for ${email}`);

    const assistant = await request('/assistant/chat', {
      method: 'POST',
      headers,
      body: { message: scenario.prompt },
    });
    assert(assistant.aiResponse, `Assistant response is empty for ${email}`);
    assert(
      assistant.mode === scenario.expectedMode,
      `Assistant mode mismatch for ${email}: expected ${scenario.expectedMode}, got ${assistant.mode}`,
    );
    assert(
      assistant.summary?.includes(updatedDisplayName),
      `Assistant summary is not personalized with ${updatedDisplayName}`,
    );
    const assistantHistory = await request('/assistant/history', { headers });
    assert(
      assistantHistory.some((entry) => entry.prompt === scenario.prompt),
      `Assistant history is missing the smoke prompt for ${email}`,
    );

    const skinAnalysis = await request('/skin-logs/analyze', {
      method: 'POST',
      headers,
      body: {
        skinFeeling: 'Bugün hafif hassas ve kuru',
        usedNewProduct: true,
        userNote: `Smoke test ${runId}`,
        discardPhoto: true,
      },
    });
    assert(skinAnalysis.logId, `Skin analysis did not create a log for ${email}`);
    const skinLogs = await request('/skin-logs', { headers });
    assert(
      skinLogs.some((entry) => entry.id === skinAnalysis.logId),
      `Skin log list is missing the created entry for ${email}`,
    );
    const weeklySummary = await request('/skin-logs/summary/weekly', { headers });
    assert(weeklySummary.logCount >= 1, `Weekly summary did not count the skin log for ${email}`);

    await request(`/skin-logs/${skinAnalysis.logId}`, { method: 'DELETE', headers });
    const skinLogsAfterDelete = await request('/skin-logs', { headers });
    assert(
      !skinLogsAfterDelete.some((entry) => entry.id === skinAnalysis.logId),
      `Skin log delete failed for ${email}`,
    );

    await request(`/products/${product.id}`, { method: 'DELETE', headers });
    const productsAfterDelete = await request('/products', { headers });
    assert(
      !productsAfterDelete.some((item) => item.id === product.id),
      `Product delete failed for ${email}`,
    );

    await request('/auth/me', { method: 'DELETE', headers });
    token = null;
    await expectStatus(401, '/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    verified.push({
      email,
      userId: String(auth.user.id),
      displayName: profile.displayName,
      skinType: profile.skinType,
      mainGoal: profile.mainGoal,
      productName: product.name,
      ingredientAnalysisLevel: ingredientAnalysis.compatibilityLevel,
      suggestedTimeOfDay: ingredientAnalysis.suggestedTimeOfDay,
      assistantIntent: assistant.intentType,
      assistantMode: assistant.mode,
      assistantHistoryCount: assistantHistory.length,
      weeklySkinLogCount: weeklySummary.logCount,
      cleanup: 'account, product and skin log deleted',
    });
  } finally {
    if (token) {
      await request('/auth/me', {
        method: 'DELETE',
        headers: authHeaders(token),
      }).catch(() => {});
    }
  }
}

console.log(JSON.stringify({ apiBaseUrl, health, verified }, null, 2));
