import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { clearToken, getToken, getTokenExpiry, hasStoredToken } from '../../lib/auth';

/** Clears an expired tab session and returns the user to sign-in. */
export function SessionExpiryWatcher() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const hadToken = hasStoredToken();
    const token = getToken();
    if (!token) {
      if (hadToken) navigate('/login', { replace: true, state: { sessionExpired: true } });
      return;
    }

    const expiresAt = getTokenExpiry(token);
    if (expiresAt === null) return;
    const timer = window.setTimeout(() => {
      clearToken();
      navigate('/login', { replace: true, state: { sessionExpired: true } });
    }, Math.max(0, expiresAt - Date.now()));

    return () => window.clearTimeout(timer);
  }, [location.pathname, navigate]);

  return null;
}
