import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { JwtPayload, Role } from '@argon/shared';
import { api } from '../lib/api';
import { clearToken, getRefreshToken, getToken, setSessionTokens, parseJwt } from '../lib/auth';

export interface AuthContextValue {
  user: JwtPayload | null;
  token: string | null;
  role: Role | null;
  isAdmin: boolean;
  isOrganizer: boolean;
  isCustomer: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<JwtPayload>;
  register: (input: { name: string; email: string; password: string; confirmPassword: string; role: 'CUSTOMER' | 'ORGANIZER' }) => Promise<JwtPayload>;
  refreshSession: () => Promise<JwtPayload>;
  logout: () => Promise<void>;
}

export type AuthContextType = AuthContextValue;

interface TokenResponse {
  token: string;
  refreshToken: string;
  expiresIn: string;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

function decodeToken(token: string | null): JwtPayload | null {
  if (!token) return null;
  return parseJwt(token);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [tokenState, setTokenState] = useState<string | null>(() => getToken());
  const [user, setUser] = useState<JwtPayload | null>(() => decodeToken(getToken()));
  const [isLoading, setIsLoading] = useState(() => !getToken() && getRefreshToken() !== null);

  useEffect(() => {
    const syncSession = () => {
      const currentToken = getToken();
      setTokenState(currentToken);
      setUser(decodeToken(currentToken));
      if (!currentToken && !getRefreshToken()) setIsLoading(false);
    };
    window.addEventListener('argon:auth-change', syncSession);
    return () => window.removeEventListener('argon:auth-change', syncSession);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, refreshToken } = await api.post<TokenResponse>('/auth/login', { email, password });
    const decoded = decodeToken(token);
    if (!decoded) throw new Error('The server returned an invalid session token.');
    setSessionTokens(token, refreshToken);
    setTokenState(token);
    setUser(decoded);
    return decoded;
  }, []);

  const register = useCallback(async (input: { name: string; email: string; password: string; confirmPassword: string; role: 'CUSTOMER' | 'ORGANIZER' }) => {
    const { token, refreshToken } = await api.post<TokenResponse>('/auth/register', input);
    const decoded = decodeToken(token);
    if (!decoded) throw new Error('The server returned an invalid session token.');
    setSessionTokens(token, refreshToken);
    setTokenState(token);
    setUser(decoded);
    return decoded;
  }, []);

  const refreshSession = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new Error('No refresh session is available.');
    const result = await api.post<TokenResponse>('/auth/refresh', { refreshToken });
    const decoded = decodeToken(result.token);
    if (!decoded) throw new Error('The server returned an invalid session token.');
    setSessionTokens(result.token, result.refreshToken);
    setTokenState(result.token);
    setUser(decoded);
    setIsLoading(false);
    return decoded;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    try {
      await api.post<void>('/auth/logout', refreshToken ? { refreshToken } : {});
    } finally {
      clearToken();
      setTokenState(null);
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  const role = user?.role ?? null;
  const isAdmin = user?.role === 'ADMIN';
  const isOrganizer = user?.role === 'ORGANIZER';
  const isCustomer = user?.role === 'CUSTOMER';
  const isAuthenticated = user !== null;

  const value: AuthContextValue = useMemo(() => ({
    user,
    token: tokenState,
    role,
    isAdmin,
    isOrganizer,
    isCustomer,
    isAuthenticated,
    isLoading,
    login,
    register,
    refreshSession,
    logout,
  }), [user, tokenState, role, isAdmin, isOrganizer, isCustomer, isAuthenticated, isLoading, login, register, refreshSession, logout]);

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
