import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export interface SidebarProps {
  onClose?: () => void;
}

interface NavItem {
  label: string;
  path: string;
  end?: boolean;
  icon: (props: { className?: string }) => JSX.Element;
}

const organizerNavItems: NavItem[] = [
  {
    label: 'Overview',
    path: '/organizer',
    end: true,
    icon: ({ className = 'h-5 w-5' }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    label: 'Create Event',
    path: '/organizer/events/new',
    icon: ({ className = 'h-5 w-5' }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M12 4v16m8-8H4"
        />
      </svg>
    ),
  },
  {
    label: 'Sales & Capacity',
    path: '/organizer/metrics',
    icon: ({ className = 'h-5 w-5' }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
  {
    label: 'Tier Quota Controls',
    path: '/organizer/tiers',
    icon: ({ className = 'h-5 w-5' }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
        />
      </svg>
    ),
  },
  {
    label: 'Attendee Roster',
    path: '/organizer/attendees',
    icon: ({ className = 'h-5 w-5' }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
  },
  {
    label: 'Gate Scanner',
    path: '/organizer/scanner',
    icon: ({ className = 'h-5 w-5' }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
        />
      </svg>
    ),
  },
];

const adminNavItems: NavItem[] = [
  {
    label: 'Overview',
    path: '/admin',
    end: true,
    icon: ({ className = 'h-5 w-5' }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
  },
  {
    label: 'Events',
    path: '/admin/events',
    icon: ({ className = 'h-5 w-5' }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    label: 'Bookings',
    path: '/admin/bookings',
    icon: ({ className = 'h-5 w-5' }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        />
      </svg>
    ),
  },
  {
    label: 'Users',
    path: '/admin/users',
    icon: ({ className = 'h-5 w-5' }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
  },
  {
    label: 'Audit Logs',
    path: '/admin/audit',
    icon: ({ className = 'h-5 w-5' }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
    ),
  },
];

export function Sidebar({ onClose }: SidebarProps) {
  const { role, isAdmin, isOrganizer } = useAuth();

  const renderNavLink = (item: NavItem) => (
    <NavLink
      key={item.path}
      to={item.path}
      end={item.end}
      onClick={onClose}
      className={({ isActive }) =>
        `group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all duration-150 ${
          isActive
            ? 'bg-[#d4ff32] text-black font-bold shadow-sm shadow-[#d4ff32]/25'
            : 'text-zinc-400 hover:text-white hover:bg-white/[0.05] font-medium'
        }`
      }
    >
      <item.icon className="h-4 w-4 shrink-0 transition-colors" />
      <span className="truncate">{item.label}</span>
    </NavLink>
  );

  return (
    <aside className="flex h-full w-64 flex-col border-r border-white/10 bg-surface-card select-none">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 font-bold font-display text-base border border-emerald-500/30">
            A
          </div>
          <div className="flex flex-col">
            <span className="font-display text-sm font-bold tracking-tight text-white">ARGON SUITE</span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
              {role ?? 'GUEST'}
            </span>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-white md:hidden"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Admin Navigation */}
        {isAdmin && (
          <div>
            <div className="px-3 pb-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-gray-400">
              Admin
            </div>
            <nav className="space-y-1">{adminNavItems.map(renderNavLink)}</nav>
          </div>
        )}

        {/* Organizer Navigation */}
        {isOrganizer && (
          <div>
            <div className="px-3 pb-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-gray-400">
              {isAdmin ? 'Organizer Tools' : 'Event Operations'}
            </div>
            <nav className="space-y-1">{organizerNavItems.map(renderNavLink)}</nav>
          </div>
        )}

        {/* Public Feed link – hidden for Admin to preserve backoffice boundary */}
        {!isAdmin && (
          <div className="border-t border-white/10 pt-4">
            <NavLink
              to="/"
              onClick={onClose}
              className="group flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:bg-white/5 font-medium"
            >
              <svg className="h-4 w-4 shrink-0 transition-colors group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Public Feed</span>
            </NavLink>
          </div>
        )}
      </div>

      {/* Bottom Footer Info */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center justify-between text-[11px] text-gray-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Connected</span>
          </span>
          <span className="font-mono text-[10px] text-gray-400">v0.1.0-alpha</span>
        </div>
      </div>
    </aside>
  );
}
