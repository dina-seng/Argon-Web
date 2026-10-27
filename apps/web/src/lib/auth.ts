/**
 * lib/auth.ts – token storage helpers.
 * TODO: Use httpOnly cookies for JWT storage in production. For MVP, use memory/sessionStorage.
 * NEVER store JWT in localStorage.
 */

const TOKEN_KEY = 'argon_token';

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}
