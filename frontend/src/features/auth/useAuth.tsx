import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser, LoginPayload, RegisterPayload, UserRole } from './authTypes';
import { mockAuthApi } from './mockAuthApi';
import { safeStorage } from '../../shared/safeStorage';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => void;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load user from safeStorage on initialization
  useEffect(() => {
    const savedUserStr = safeStorage.getItem('voiceturk_demo_user');
    if (savedUserStr) {
      try {
        const savedUser = JSON.parse(savedUserStr) as AuthUser;
        setUser(savedUser);
      } catch (err) {
        console.error('Failed to parse cached demo user', err);
        safeStorage.removeItem('voiceturk_demo_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (payload: LoginPayload): Promise<AuthUser> => {
    setIsLoading(true);
    try {
      const authUser = await mockAuthApi.login(payload);
      setUser(authUser);
      return authUser;
    } catch (error) {
      setIsLoading(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterPayload): Promise<AuthUser> => {
    setIsLoading(true);
    try {
      const authUser = await mockAuthApi.register(payload);
      setUser(authUser);
      return authUser;
    } catch (error) {
      setIsLoading(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await mockAuthApi.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const switchRole = (role: UserRole) => {
    if (user) {
      const updatedUser: AuthUser = {
        ...user,
        role,
        // Sync initials relative to user role
        avatarInitials: user.fullName ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'VT'
      };
      setUser(updatedUser);
      safeStorage.setItem('voiceturk_demo_user', JSON.stringify(updatedUser));
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        switchRole,
        setUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
