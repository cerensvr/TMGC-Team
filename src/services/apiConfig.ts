const DEFAULT_API_AUTH_URL = 'https://skinshelf-backend.onrender.com/api/auth';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const getConfiguredAuthUrl = () => {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  return configuredUrl ? trimTrailingSlash(configuredUrl) : undefined;
};

export const API_AUTH_URL = getConfiguredAuthUrl() ?? DEFAULT_API_AUTH_URL;
export const API_BASE_URL = API_AUTH_URL.endsWith('/auth') ? API_AUTH_URL.replace(/\/auth$/, '') : API_AUTH_URL;
export const API_PROFILES_URL = API_AUTH_URL.endsWith('/auth')
  ? API_AUTH_URL.replace(/\/auth$/, '/profiles')
  : `${API_AUTH_URL}/profiles`;
export const API_PRODUCTS_URL = `${API_BASE_URL}/products`;
