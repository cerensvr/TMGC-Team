const mode = process.argv[2] ?? 'all';
const validModes = new Set(['all', 'backend', 'mobile']);

if (!validModes.has(mode)) {
  console.error('Usage: node scripts/validate-env.mjs [all|backend|mobile]');
  process.exit(2);
}

const errors = [];
const isPlaceholder = (value) =>
  /REPLACE_WITH|CHANGE_ME|PROJECT_REF|REGION|MY_[A-Z_]+/i.test(value);

const required = (name) => {
  const value = process.env[name]?.trim() ?? '';
  if (!value) {
    errors.push(`${name} is required.`);
  } else if (isPlaceholder(value)) {
    errors.push(`${name} still contains a placeholder.`);
  }
  return value;
};

if (mode === 'all' || mode === 'backend') {
  const dbUrl = required('DB_URL');
  const dbUsername = required('DB_USERNAME');
  required('DB_PASSWORD');
  const jwtSecret = required('JWT_SECRET');
  const jwtExpiration = required('JWT_EXPIRATION_SECONDS');
  const corsOrigins = required('CORS_ALLOWED_ORIGINS');
  required('GEMINI_API_KEY');
  const geminiModel = required('GEMINI_MODEL');

  if (dbUrl && !dbUrl.startsWith('jdbc:postgresql://')) {
    errors.push('DB_URL must be a PostgreSQL JDBC URL.');
  }
  if (dbUrl && (!dbUrl.includes('sslmode=require') || !dbUrl.includes('prepareThreshold=0'))) {
    errors.push('DB_URL must include sslmode=require and prepareThreshold=0.');
  }
  if (dbUsername && !/^postgres(?:\.[a-z0-9]+)?$/i.test(dbUsername)) {
    errors.push('DB_USERNAME must match the Supabase postgres or postgres.PROJECT_REF format.');
  }
  if (jwtSecret && jwtSecret.length < 32) {
    errors.push('JWT_SECRET must contain at least 32 characters.');
  }

  const parsedExpiration = Number(jwtExpiration);
  if (
    jwtExpiration &&
    (!Number.isInteger(parsedExpiration) || parsedExpiration < 300 || parsedExpiration > 31_536_000)
  ) {
    errors.push('JWT_EXPIRATION_SECONDS must be an integer between 300 and 31536000.');
  }

  if (corsOrigins) {
    const origins = corsOrigins.split(',').map((origin) => origin.trim()).filter(Boolean);
    if (origins.includes('*')) {
      errors.push('CORS_ALLOWED_ORIGINS cannot contain wildcard (*).');
    }
    for (const origin of origins) {
      try {
        const parsed = new URL(origin);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          errors.push(`CORS origin must use http or https: ${origin}`);
        }
      } catch {
        errors.push(`CORS origin is not a valid URL: ${origin}`);
      }
    }
  }

  if (geminiModel && geminiModel.startsWith('gemini-2.0')) {
    errors.push('GEMINI_MODEL points to a shutdown Gemini 2.0 model.');
  }
}

if (mode === 'all' || mode === 'mobile') {
  const apiUrl = required('EXPO_PUBLIC_API_URL');
  if (apiUrl) {
    try {
      const parsed = new URL(apiUrl);
      if (parsed.protocol !== 'https:') {
        errors.push('EXPO_PUBLIC_API_URL must use HTTPS for preview and production builds.');
      }
      if (parsed.pathname.replace(/\/+$/, '') !== '/api/auth') {
        errors.push('EXPO_PUBLIC_API_URL must end with /api/auth.');
      }
    } catch {
      errors.push('EXPO_PUBLIC_API_URL is not a valid URL.');
    }
  }
}

if (errors.length > 0) {
  console.error('Environment contract validation failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Environment contract valid for: ${mode}`);
