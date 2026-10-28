import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { JwtPayload, Role } from '@argon/shared';
import { getToken, setToken, clearToken, parseJwt, isTokenExpired, createDevToken } from '../lib/auth';

export interface AuthContextType {
  user: JwtPayload | null;
  token: string | null;
  role: Role | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
  switchDevRole: (role: Role | 'ADMIN' | 'ORGANIZER' | 'CUSTOMER') => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<JwtPayload | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize auth state from session storage
  useEffect(() => {
    const storedToken = getToken();
    if (storedToken) {
      if (isTokenExpired(storedToken)) {
        clearToken();
        setTokenState(null);
        setUser(null);
      } else {
        const decoded = parseJwt(storedToken);
        if (decoded) {
          setTokenState(storedToken);
          setUser(decoded);
        } else {
          clearToken();
          setTokenState(null);
          setUser(null);
        }
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((newToken: string) => {
    setToken(newToken);
    const decoded = parseJwt(newToken);
    setTokenState(newToken);
    setUser(decoded);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    setUser(null);
  }, []);

  const switchDevRole = useCallback((role: Role | 'ADMIN' | 'ORGANIZER' | 'CUSTOMER') => {
    const devToken = createDevToken(role);
    setToken(devToken);
    const decoded = parseJwt(devToken);
    setTokenState(devToken);
    setUser(decoded);
  }, []);

  const value: AuthContextType = {
    user,
    token,
    role: user?.role ?? null,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    switchDevRole,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
