import type { ReactNode } from 'react';
import { Navigate, useLocation, Link, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { Role } from '@argon/shared';
import { Button } from '../../components/ui/Button';

export interface ProtectedRouteProps {
  allowedRoles?: Role[];
  children?: ReactNode;
}

/**
 * ProtectedRoute – Route guard reading useAuth context.
 * Enforces authentication and role-based access control (RBAC).
 */
export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps = {}) {
  const { user, role, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span className="font-mono text-xs uppercase tracking-wider text-gray-400">Authenticating…</span>
        </div>
      </div>
    );
  }

  // Not logged in -> Redirect to login page preserving destination
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Role check: If allowedRoles is defined, user role must match
  if (allowedRoles && allowedRoles.length > 0 && (!role || !allowedRoles.includes(role))) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-rose-500/20 bg-surface-card p-6 md:p-8 text-center shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-5">
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-rose-400">
            403 Forbidden
          </span>
          <h2 className="mt-1 font-display text-2xl font-bold text-white">Access Denied</h2>

          <p className="mt-3 text-sm text-gray-300">
            Your account ({user.email}) has role{' '}
            <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs font-semibold text-white">
              {role}
            </span>
            , but this view requires{' '}
            <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 font-mono text-xs font-semibold text-indigo-300">
              {allowedRoles.join(' or ')}
            </span>
            .
          </p>

          <div className="mt-6 flex flex-col gap-2.5">
            <Link to="/login" className="w-full">
              <Button variant="primary" className="w-full justify-center">
                Sign In with Authorized Account
              </Button>
            </Link>

            <Link to="/" className="w-full">
              <Button variant="secondary" className="w-full justify-center">
                Return to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
}

export default ProtectedRoute;
