import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Role } from '@argon/shared';
import { Badge, type BadgeVariant } from '../ui/Badge';
import { ArgonLogo } from '../public/Brand';
import { initialsFromEmail, nameFromEmail } from '../../lib/publicFormat';
import {
  QrCode,
  Ticket,
  Shield,
  LayoutDashboard,
  LogOut,
  Menu,
  ChevronDown,
} from 'lucide-react';

export interface HeaderProps {
  onToggleSidebar?: () => void;
  /** Sits transparently on top of the page art, without the bottom hairline. */
  overlay?: boolean;
}

const navLink = 'text-[14px] font-extrabold uppercase tracking-[0.07em] text-white transition-colors hover:text-peach';

export function Header({ onToggleSidebar, overlay = false }: HeaderProps = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, isAdmin, isOrganizer, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isTicketsActive = location.pathname.startsWith('/tickets');
  const isScannerActive = location.pathname.startsWith('/organizer/scanner') || location.pathname.startsWith('/organizer/scan');
  const isAdminActive = location.pathname.startsWith('/admin');
  const isOrganizerActive = location.pathname.startsWith('/organizer') && !isScannerActive;

  // In sidebar layouts (organizer/admin), render a minimal sidebar-toggle bar
  const isSidebarLayout = isAdminActive || isOrganizerActive;

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate('/login');
  };

  const getRoleBadgeVariant = (userRole?: Role | null): BadgeVariant => {
    switch (userRole) {
      case Role.ADMIN: return 'info';
      case Role.ORGANIZER: return 'success';
      case Role.CUSTOMER: return 'warning';
      default: return 'default';
    }
  };

  const userInitials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'U';
  const displayName = user?.email
    ? user.email.split('@')[0]
    : 'Guest';

  // In sidebar layouts (organizer/admin), preserve original admin header
  if (isSidebarLayout) {
    return (
      <header className="border-b border-white/[0.07] bg-[#0c0d14]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-8">
            {onToggleSidebar && (
              <button
                type="button"
                onClick={onToggleSidebar}
                aria-label="Toggle navigation menu"
                className="rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-white md:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}

            <Link to="/" className="flex items-center gap-2.5 group">
              <img src="/brand/kit/argon-white.svg" alt="Argon" className="h-7 w-7 object-contain transition-transform group-hover:scale-105" />
              <span className="font-display text-2xl font-black tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                argon
              </span>
              <span className="w-5 h-1 rounded-full bg-gradient-to-r from-cyan-400 via-primary-500 to-indigo-500 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
            </Link>

            <div className="hidden sm:flex items-center">
              <Badge
                label={isAdminActive ? 'Admin Console' : 'Organizer Hub'}
                variant={isAdminActive ? 'info' : 'success'}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400 border border-white/5 bg-zinc-900/60 px-3 py-1.5 rounded-full">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Cambodia · USD</span>
            </div>

            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 bg-[#1b1730] hover:bg-[#251f47] border border-purple-800/40 px-2.5 py-1.5 rounded-xl transition text-left group"
                  aria-label="User profile menu"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-600 to-indigo-700 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                    {userInitials}
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-medium text-zinc-300 group-hover:text-white leading-tight">
                      {displayName}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono leading-tight">
                      {role ?? 'USER'}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300" />
                </button>

                {dropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-72 bg-[#131420] border border-zinc-800 rounded-2xl shadow-2xl p-3 z-50">
                      <div className="px-3 py-2 border-b border-zinc-800/80 mb-2">
                        <p className="text-sm font-semibold text-white truncate">{user.email}</p>
                        <p className="text-[11px] text-zinc-400 font-mono truncate">ID: {user.sub}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge label={role ?? 'CUSTOMER'} variant={getRoleBadgeVariant(role)} />
                        </div>
                      </div>

                      <div className="space-y-1 text-xs">
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setDropdownOpen(false);
                              navigate('/admin');
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-indigo-300 hover:text-white hover:bg-indigo-950/40 transition"
                          >
                            <span className="flex items-center gap-2">
                              <Shield className="w-3.5 h-3.5" />
                              Admin Console
                            </span>
                          </button>
                        )}

                        {(isOrganizer || isAdmin) && (
                          <button
                            type="button"
                            onClick={() => {
                              setDropdownOpen(false);
                              navigate('/organizer');
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-950/40 transition"
                          >
                            <span className="flex items-center gap-2">
                              <LayoutDashboard className="w-3.5 h-3.5" />
                              Organizer Portal
                            </span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setDropdownOpen(false);
                            navigate('/tickets');
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition"
                        >
                          <span className="flex items-center gap-2">
                            <Ticket className="w-3.5 h-3.5 text-zinc-400" />
                            My Tickets Pass
                          </span>
                        </button>

                        {(isOrganizer || isAdmin) && (
                          <button
                            type="button"
                            onClick={() => {
                              setDropdownOpen(false);
                              navigate('/scanner');
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-purple-300 hover:text-white hover:bg-purple-950/40 transition"
                          >
                            <span className="flex items-center gap-2">
                              <QrCode className="w-3.5 h-3.5 text-purple-400" />
                              Gate Scanner
                            </span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-950/30 transition border-t border-zinc-800/60 mt-1 pt-2"
                        >
                          <span className="flex items-center gap-1.5">
                            <LogOut className="w-3 h-3" />
                            Sign Out
                          </span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className={overlay ? 'relative z-20' : 'relative z-20 bg-ink border-b border-white/10'}>
      <div className={`ag-wrap flex flex-wrap items-center justify-between gap-y-3 ${overlay ? 'pt-[24px]' : 'py-[18px]'}`}>
        <ArgonLogo />

        <div className="flex flex-wrap items-center gap-x-[28px] gap-y-2">
          <nav aria-label="Main" className="flex items-center gap-[28px]">
            <Link to="/" className={navLink}>Events</Link>
            <Link
              to="/tickets"
              aria-current={isTicketsActive ? 'page' : undefined}
              className={`${navLink} ${isTicketsActive ? 'border-b-[3px] border-flame pb-[3px]' : ''}`}
            >
              My Tickets
            </Link>
            {(!user || isOrganizer || isAdmin) && (
              <Link to="/organizer" className={navLink}>For Organizers</Link>
            )}
          </nav>

          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-expanded={dropdownOpen}
                aria-label="User profile menu"
                className="flex h-[46px] items-center gap-[10px] border border-white/30 pl-[6px] pr-[14px] text-[14px] font-extrabold tracking-[-0.02em] text-white"
              >
                <span className="flex h-[32px] w-[32px] items-center justify-center bg-flame text-[13px] font-black tracking-normal">
                  {initialsFromEmail(user.email)}
                </span>
                <span className="hidden sm:inline">{nameFromEmail(user.email)}</span>
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-64 border border-white/10 bg-ink-raised p-3 shadow-2xl">
                    <div className="mb-2 border-b border-white/10 px-3 py-2">
                      <p className="truncate text-sm font-semibold text-white">{user.email}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge label={role ?? 'CUSTOMER'} variant={getRoleBadgeVariant(role)} />
                      </div>
                    </div>
                    <div className="space-y-1 text-xs">
                      {isAdmin && (
                        <button type="button" onClick={() => { setDropdownOpen(false); navigate('/admin'); }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-white/70 transition hover:bg-white/5 hover:text-white">
                          <Shield className="h-3.5 w-3.5" /> Admin Console
                        </button>
                      )}
                      {(isOrganizer || isAdmin) && (
                        <button type="button" onClick={() => { setDropdownOpen(false); navigate('/organizer'); }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-white/70 transition hover:bg-white/5 hover:text-white">
                          <LayoutDashboard className="h-3.5 w-3.5" /> Organizer Portal
                        </button>
                      )}
                      <button type="button" onClick={() => { setDropdownOpen(false); navigate('/tickets'); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-white/70 transition hover:bg-white/5 hover:text-white">
                        <Ticket className="h-3.5 w-3.5" /> My Tickets
                      </button>
                      {(isOrganizer || isAdmin) && (
                        <button type="button" onClick={() => { setDropdownOpen(false); navigate('/scanner'); }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-white/70 transition hover:bg-white/5 hover:text-white">
                          <QrCode className="h-3.5 w-3.5" /> Gate Scanner
                        </button>
                      )}
                      <button type="button" onClick={handleLogout}
                        className="mt-1 flex w-full items-center gap-2 border-t border-white/10 px-3 py-2 pt-2 text-peach transition hover:bg-white/5">
                        <LogOut className="h-3 w-3" /> Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="flex h-[44px] items-center bg-white px-[23.5px] text-[14px] font-extrabold uppercase tracking-[0.05em] text-blood-deep transition hover:bg-cream"
            >
              SIGN IN
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
