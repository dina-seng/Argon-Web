/**
 * lib/auth.ts – token storage & JWT decoding utilities.
 */
import type { JwtPayload } from '@argon/shared';
import { Role } from '@argon/shared';

const TOKEN_KEY = 'argon_token';

export function getToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore sessionStorage errors in restricted environments
  }
}

export function clearToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    const code = binaryString.charCodeAt(i);
    bytes[i] = code;
  }
  return new TextDecoder().decode(bytes);
}

function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      binary += String.fromCharCode(byte);
    }
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decodes and validates a standard JWT payload.
 * Returns null if token is malformed.
 */
export function parseJwt(token: string): JwtPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const payloadPart = parts[1];
  if (!payloadPart) return null;

  try {
    const jsonStr = base64UrlDecode(payloadPart);
    const payload = JSON.parse(jsonStr) as Record<string, unknown>;
    if (!payload || typeof payload !== 'object') return null;
    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string' || !payload.role) {
      return null;
    }

    return {
      sub: payload.sub,
      role: payload.role as Role,
      email: payload.email,
      iat: typeof payload.iat === 'number' ? payload.iat : undefined,
      exp: typeof payload.exp === 'number' ? payload.exp : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Checks whether a token has expired based on its `exp` claim.
 */
export function isTokenExpired(token: string): boolean {
  const payload = parseJwt(token);
  if (!payload || !payload.exp) return false;
  return payload.exp * 1000 < Date.now();
}

/**
 * Helper to generate a demo/dev session token for fast local UI testing
 * without needing an active backend login flow.
 */
export function createDevToken(role: Role | 'ADMIN' | 'ORGANIZER' | 'CUSTOMER'): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 60 * 60 * 24; // 24 hours

  const roleConfigs: Record<string, { sub: string; email: string }> = {
    ADMIN: { sub: 'usr_admin_001', email: 'admin@argon.kh' },
    ORGANIZER: { sub: 'usr_barcamp_001', email: 'barcamp@argon.kh' },
    CUSTOMER: { sub: 'usr_cust_001', email: 'customer@argon.kh' },
  };

  const config: { sub: string; email: string } =
    (typeof role === 'string' && role in roleConfigs ? roleConfigs[role] : undefined) ?? {
      sub: 'usr_admin_001',
      email: 'admin@argon.kh',
    };

  const payload: JwtPayload = {
    sub: config.sub,
    role: role as Role,
    email: config.email,
    iat: now,
    exp,
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const sigB64 = base64UrlEncode('dev_mock_signature');

  return `${headerB64}.${payloadB64}.${sigB64}`;
}
