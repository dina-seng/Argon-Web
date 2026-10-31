import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { clearToken, getRefreshToken, getToken, getTokenExpiry, hasStoredToken } from '../../lib/auth';

/** Renews the access JWT before expiry; the refresh token expires after one day. */
export function SessionExpiryWatcher() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, refreshSession } = useAuth();

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    const hadAccessToken = hasStoredToken();
    const token = getToken();
    const refreshToken = getRefreshToken();
    const expiresAt = token ? getTokenExpiry(token) : null;

    const endExpiredSession = () => {
      clearToken();
      navigate('/login', { replace: true, state: { sessionExpired: true } });
    };

    if (!refreshToken) {
      if (!token && hadAccessToken) {
        endExpiredSession();
        return;
      }
      if (expiresAt !== null) {
        timer = window.setTimeout(endExpiredSession, Math.max(0, expiresAt - Date.now()));
      }
      return () => window.clearTimeout(timer);
    }

    const renew = async () => {
      try {
        await refreshSession();
      } catch {
        if (cancelled) return;
        const currentToken = getToken();
        if (!currentToken) {
          endExpiredSession();
          return;
        }

        const currentExpiry = getTokenExpiry(currentToken);
        const retryDelay = currentExpiry === null ? 0 : Math.min(10_000, Math.max(0, currentExpiry - Date.now()));
        timer = window.setTimeout(() => void renew(), retryDelay);
      }
    };

    const refreshDelay = expiresAt === null ? 0 : Math.max(0, expiresAt - Date.now() - 60_000);
    timer = window.setTimeout(() => void renew(), refreshDelay);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [location.pathname, navigate, refreshSession, user]);

  return null;
}
