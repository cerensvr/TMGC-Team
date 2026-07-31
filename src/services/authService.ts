import { API_AUTH_URL } from './apiConfig';
import { apiFetch } from './apiClient';
import { clearAuthSession, getAuthToken, getCachedAuthUserId, saveAuthSession } from './authSession';
import { errorDev } from './logger';

type AuthUser = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
};

type AuthResponse = {
  token: string;
  user: AuthUser;
};

type LoginCredentials = {
  email: string;
  password: string;
};

type RegisterPayload = LoginCredentials & {
  firstName: string;
  lastName?: string;
};

type UpdateAccountPayload = {
  firstName: string;
  lastName?: string;
};

type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

let activeUserId: string | null = getCachedAuthUserId();

const requestAuth = async (path: string, body: unknown): Promise<AuthResponse> => {
  const response = await fetch(`${API_AUTH_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const responseText = await response.text();
  const responseData = responseText ? JSON.parse(responseText) : undefined;

  if (!response.ok) {
    throw new Error(responseData?.message || responseText || 'Kimlik doğrulama isteği başarısız.');
  }

  activeUserId = String(responseData.user.id);
  await saveAuthSession(responseData.token, activeUserId);

  return {
    token: responseData.token,
    user: {
      ...responseData.user,
      id: String(responseData.user.id),
    },
  };
};

export const authService = {
  getUserId: () => {
    return activeUserId;
  },

  login: async (credentials: LoginCredentials) => {
    try {
      return await requestAuth('/login', credentials);
    } catch (error) {
      errorDev('authService.login hatası:', error);
      throw error;
    }
  },

  register: async (data: RegisterPayload) => {
    try {
      return await requestAuth('/register', data);
    } catch (error) {
      errorDev('authService.register hatası:', error);
      throw error;
    }
  },

  restoreSession: async (): Promise<AuthUser | null> => {
    const token = await getAuthToken();
    if (!token) return null;

    try {
      const user = await apiFetch<AuthUser>(`${API_AUTH_URL}/me`);
      if (!user?.id) return null;

      activeUserId = String(user.id);
      await saveAuthSession(token, activeUserId);
      return { ...user, id: activeUserId };
    } catch {
      await clearAuthSession();
      activeUserId = null;
      return null;
    }
  },

  updateAccount: async (data: UpdateAccountPayload) => {
    const user = await apiFetch<AuthUser>(`${API_AUTH_URL}/me`, {
      method: 'PATCH',
      body: data,
    });
    return { ...user, id: String(user.id) };
  },

  changePassword: async (data: ChangePasswordPayload) => {
    await apiFetch<void>(`${API_AUTH_URL}/change-password`, {
      method: 'POST',
      body: data,
    });
    return true;
  },

  logout: async () => {
    activeUserId = null;
    await clearAuthSession();
    return true;
  },

  deleteAccount: async () => {
    await apiFetch<void>(`${API_AUTH_URL}/me`, {
      method: 'DELETE',
    });
    activeUserId = null;
    await clearAuthSession();
    return true;
  }
};
