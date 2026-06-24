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

  // Load and validate the user through the selected auth adapter.
  useEffect(() => {
    let active = true;
    void mockAuthApi.getCurrentUser().then((currentUser) => {
      if (active) setUser(currentUser);
    }).catch(() => {
      if (active) setUser(null);
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
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
