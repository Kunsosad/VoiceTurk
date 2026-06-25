import { AuthUser, LoginPayload, RegisterPayload, UserRole } from './authTypes';
import { safeStorage } from '../../shared/safeStorage';
import { realAuthApi } from '../../shared/realApi';

const DELAY_MS = 500;
const STORAGE_KEY = 'voiceturk_demo_user';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return 'VT';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const localMockAuthApi = {
  async login(payload: LoginPayload): Promise<AuthUser> {
    await sleep(DELAY_MS);
    
    // Simple demo validation
    if (!payload.email || !payload.password) {
      throw new Error('Email and password are required');
    }

    // For prototyping, we construct a user based on their login details.
    // In a real database we would run query checks.
    const mockUser: AuthUser = {
      id: `usr-${Math.random().toString(36).substr(2, 9)}`,
      fullName: payload.role === 'buyer' ? 'Vy Tran' : 'Minh Pham',
      email: payload.email,
      role: payload.role,
      avatarInitials: payload.role === 'buyer' ? 'VT' : 'MP',
      createdAt: new Date().toISOString(),
    };

    safeStorage.setItem(STORAGE_KEY, JSON.stringify(mockUser));
    return mockUser;
  },

  async register(payload: RegisterPayload): Promise<AuthUser> {
    await sleep(DELAY_MS);

    if (!payload.fullName || !payload.email || !payload.password || !payload.role) {
      throw new Error('All registration fields are required');
    }

    if (payload.password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    const mockUser: AuthUser = {
      id: `usr-${Math.random().toString(36).substr(2, 9)}`,
      fullName: payload.fullName,
      email: payload.email,
      role: payload.role,
      avatarInitials: getInitials(payload.fullName),
      createdAt: new Date().toISOString(),
    };

    safeStorage.setItem(STORAGE_KEY, JSON.stringify(mockUser));
    return mockUser;
  },

  async logout(): Promise<void> {
    await sleep(DELAY_MS);
    safeStorage.removeItem(STORAGE_KEY);
  },

  async googleLogin(accessToken: string, role: UserRole): Promise<AuthUser> {
    await sleep(DELAY_MS);
    if (!accessToken) throw new Error('Google Sign-In did not return an access token');
    return realAuthApi.googleLogin(accessToken, role);
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    await sleep(DELAY_MS);
    const data = safeStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    try {
      const user = JSON.parse(data) as AuthUser;
      if (user.email === 'buyer.google@gmail.com' || user.email === 'contributor.google@gmail.com') {
        safeStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return user;
    } catch {
      return null;
    }
  }
};

export const mockAuthApi = import.meta.env.VITE_USE_REAL_API === 'true' ? realAuthApi : localMockAuthApi;
