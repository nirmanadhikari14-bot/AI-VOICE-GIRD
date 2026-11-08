import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { UserProfile, AuthTokens } from '../../types';
import { desktopApiClient } from '../../api/client';
import { DESKTOP_ENDPOINTS } from '../../api/endpoints';
import { LoginResponseSchema, UserProfileSchema } from '../../api/contracts/schemas';
import { desktopSecureStorage, DESKTOP_STORAGE_KEYS } from '../../services/secureStorage/desktopSecureStorage';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(async () => {
    try {
      await desktopSecureStorage.clearAll();
    } finally {
      setUser(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const token = await desktopSecureStorage.getItem(DESKTOP_STORAGE_KEYS.AUTH_TOKEN);
      if (!token) {
        setUser(null);
        return;
      }
      const raw = await desktopApiClient.get<unknown>(DESKTOP_ENDPOINTS.ME);
      const parsed = UserProfileSchema.parse(raw);
      setUser(parsed);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        await refreshProfile();
      } finally {
        setIsLoading(false);
      }
    };
    init();

    const unsub = desktopApiClient.onAuthFailure(() => {
      logout();
    });
    return () => unsub();
  }, [logout, refreshProfile]);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const rawTokens = await desktopApiClient.post<unknown>(
        DESKTOP_ENDPOINTS.LOGIN,
        { username: email, password: pass },
        { requiresAuth: false, isFormUrlEncoded: true }
      );
      const validated = LoginResponseSchema.parse(rawTokens);

      await desktopSecureStorage.setItem(DESKTOP_STORAGE_KEYS.AUTH_TOKEN, validated.access_token);
      await desktopSecureStorage.setItem(DESKTOP_STORAGE_KEYS.TOKEN_TYPE, validated.token_type);

      const rawUser = await desktopApiClient.get<unknown>(DESKTOP_ENDPOINTS.ME);
      const userProfile = UserProfileSchema.parse(rawUser);
      setUser(userProfile);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};

