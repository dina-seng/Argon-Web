import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { JwtPayload } from '@argon/shared';
import { api } from '../lib/api';
import { clearToken, getRefreshToken, getToken, setSessionTokens } from '../lib/auth';

interface AuthContextValue {
  user: JwtPayload | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<JwtPayload>;
  register: (input: { name: string; email: string; password: string; confirmPassword: string; role: 'CUSTOMER' | 'ORGANIZER' }) => Promise<JwtPayload>;
  refreshSession: () => Promise<JwtPayload>;
  logout: () => Promise<void>;
}

interface TokenResponse { token: string; refreshToken: string; expiresIn: string }
const AuthContext = createContext<AuthContextValue | null>(null);

function decodeToken(token: string | null): JwtPayload | null {
  if (!token) return null;
  try {
    const encodedPayload = token.split('.')[1];
    if (!encodedPayload) return null;
    const base64 = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const value: unknown = JSON.parse(atob(padded));
    if (typeof value !== 'object' || value === null || !('sub' in value) || !('email' in value) || !('role' in value)) return null;
    return value as JwtPayload;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<JwtPayload | null>(() => decodeToken(getToken()));
  const [isLoading, setIsLoading] = useState(() => !getToken() && getRefreshToken() !== null);

  useEffect(() => {
    const syncSession = () => {
      setUser(decodeToken(getToken()));
      if (!getToken() && !getRefreshToken()) setIsLoading(false);
    };
    window.addEventListener('argon:auth-change', syncSession);
    return () => window.removeEventListener('argon:auth-change', syncSession);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, refreshToken } = await api.post<TokenResponse>('/auth/login', { email, password });
    const decoded = decodeToken(token);
    if (!decoded) throw new Error('The server returned an invalid session token.');
    setSessionTokens(token, refreshToken);
    setUser(decoded);
    return decoded;
  }, []);

  const register = useCallback(async (input: { name: string; email: string; password: string; confirmPassword: string; role: 'CUSTOMER' | 'ORGANIZER' }) => {
    const { token, refreshToken } = await api.post<TokenResponse>('/auth/register', input);
    const decoded = decodeToken(token);
    if (!decoded) throw new Error('The server returned an invalid session token.');
    setSessionTokens(token, refreshToken);
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
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  const value = useMemo(() => ({ user, isLoading, login, register, refreshSession, logout }), [user, isLoading, login, register, refreshSession, logout]);
  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
