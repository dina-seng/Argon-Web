import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Role } from '@argon/shared';
import { Badge, type BadgeVariant } from '../ui/Badge';
import { Button } from '../ui/Button';

export interface HeaderProps {
  onToggleSidebar?: () => void;
}

/**
 * Header – top administrative navigation bar.
 * Features Argon console branding, user identity, quick dev-role switcher, and logout.
 */
export function Header({ onToggleSidebar }: HeaderProps) {
  const { user, role, switchDevRole, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadgeVariant = (userRole?: Role | null): BadgeVariant => {
    switch (userRole) {
      case Role.ADMIN:
        return 'info';
      case Role.ORGANIZER:
        return 'success';
      case Role.CUSTOMER:
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-white/10 bg-surface-card/80 px-4 md:px-6 backdrop-blur-md">
      {/* Left side: Mobile menu toggle & Brand/Console badge */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Toggle navigation menu"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-white md:hidden"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        <div className="flex items-center gap-2.5">
          <span className="font-display text-xl font-bold tracking-tight text-white">Argon</span>
          <Badge label="Admin Console" variant="info" />
        </div>
      </div>

      {/* Right side: Dev role switcher, user profile, logout */}
      <div className="flex items-center gap-3 md:gap-5">
        {/* Dev Role Quick Switcher */}
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-surface/80 p-1 text-xs">
          <span className="hidden px-2 font-mono text-[10px] uppercase tracking-wider text-gray-400 sm:inline-block">
            Dev Role
          </span>
          <button
            type="button"
            onClick={() => switchDevRole(Role.ADMIN)}
            className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
              role === Role.ADMIN
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => switchDevRole(Role.ORGANIZER)}
            className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
              role === Role.ORGANIZER
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Organizer
          </button>
        </div>

        {/* User Identity Pill */}
        <div className="flex items-center gap-2.5 border-l border-white/10 pl-3 md:pl-5">
          <div className="hidden flex-col items-end sm:flex">
            <span className="text-xs font-medium text-gray-200">
              {user?.email ?? 'Unauthenticated'}
            </span>
            <span className="font-mono text-[10px] text-gray-400">
              {user?.sub ? `ID: ${user.sub.slice(0, 12)}…` : 'Guest'}
            </span>
          </div>

          <Badge
            label={role ?? 'GUEST'}
            variant={getRoleBadgeVariant(role)}
          />
        </div>

        {/* Logout Action */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-gray-400 hover:text-rose-400"
          title="Sign out of console"
        >
          <svg className="h-4 w-4 md:mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span className="hidden md:inline">Sign Out</span>
        </Button>
      </div>
    </header>
  );
}
