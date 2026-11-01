import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTicketingStore } from '../../hooks/useTicketingStore';
import { Role } from '@argon/shared';
import { Badge, type BadgeVariant } from '../ui/Badge';
import {
  QrCode,
  Ticket,
  Compass,
  RefreshCw,
  ChevronDown,
  Shield,
  LayoutDashboard,
  LogOut,
  LogIn,
  Menu,
} from 'lucide-react';

export interface HeaderProps {
  onToggleSidebar?: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, isAdmin, isOrganizer, logout } = useAuth();
  const { tickets, resetDefaults } = useTicketingStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isTicketsActive = location.pathname.startsWith('/tickets');
  const isDiscoverActive = location.pathname === '/' || location.pathname.startsWith('/events');
  const isScannerActive = location.pathname.startsWith('/organizer/scanner') || location.pathname.startsWith('/organizer/scan');
  const isAdminActive = location.pathname.startsWith('/admin');
  const isOrganizerActive = location.pathname.startsWith('/organizer') && !isScannerActive;

  const activeTicketCount = tickets ? tickets.filter((t) => t.status === 'ACTIVE').length : 0;

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
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

  const userInitials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'U';
  const displayName = user?.email
    ? user.email.split('@')[0]
    : 'Guest';

  return (
    <header className="border-b border-white/[0.07] bg-[#0c0d14]/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Left Navigation */}
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
            <span className="font-display text-2xl font-black tracking-tight text-white group-hover:text-primary-300 transition-colors">
              argon
            </span>
            {/* Signature neon dash */}
            <span className="w-5 h-1 rounded-full bg-gradient-to-r from-cyan-400 via-primary-500 to-fuchsia-500 shadow-[0_0_8px_rgba(120,87,255,0.8)]" />
          </Link>

          {(isAdminActive || isOrganizerActive) && (
            <div className="hidden sm:flex items-center">
              <Badge
                label={isAdminActive ? 'Admin Console' : 'Organizer Hub'}
                variant={isAdminActive ? 'info' : 'success'}
              />
            </div>
          )}

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link
              to="/"
              className={`relative py-5 transition-colors ${
                isDiscoverActive
                  ? 'text-white font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Compass className="w-4 h-4 opacity-70" />
                Discover
              </span>
              {isDiscoverActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full" />
              )}
            </Link>

            <Link
              to="/tickets"
              className={`relative py-5 transition-colors ${
                isTicketsActive
                  ? 'text-white font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Ticket className="w-4 h-4 opacity-70" />
                My Tickets
                {activeTicketCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-primary-600/30 text-primary-300 text-[11px] rounded-full font-mono border border-primary-500/30">
                    {activeTicketCount}
                  </span>
                )}
              </span>
              {isTicketsActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full" />
              )}
            </Link>

            <Link
              to="/organizer/scanner"
              className={`relative py-5 transition-colors flex items-center gap-1.5 ${
                isScannerActive
                  ? 'text-purple-300 font-semibold'
                  : 'text-zinc-400 hover:text-purple-300'
              }`}
            >
              <QrCode className="w-4 h-4 text-purple-400" />
              <span>Organizer Scanner</span>
              <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-purple-950/70 text-purple-300 border border-purple-800/60 rounded">
                Gate
              </span>
              {isScannerActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-full" />
              )}
            </Link>

            {isAdmin && (
              <Link
                to="/admin"
                className={`relative py-5 transition-colors flex items-center gap-1.5 ${
                  isAdminActive
                    ? 'text-indigo-300 font-semibold'
                    : 'text-zinc-400 hover:text-indigo-300'
                }`}
              >
                <Shield className="w-4 h-4 text-indigo-400" />
                <span>Admin</span>
              </Link>
            )}

            {isOrganizer && (
              <Link
                to="/organizer"
                className={`relative py-5 transition-colors flex items-center gap-1.5 ${
                  isOrganizerActive
                    ? 'text-emerald-300 font-semibold'
                    : 'text-zinc-400 hover:text-emerald-300'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                <span>Organizer</span>
              </Link>
            )}
          </nav>
        </div>

        {/* Right Navigation */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400 border border-white/5 bg-zinc-900/60 px-3 py-1.5 rounded-full">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Cambodia · USD</span>
          </div>

          {user ? (
            /* Authenticated User Menu */
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
                  <div className="absolute right-0 mt-2 w-72 bg-[#131420] border border-zinc-800 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
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
                            Organizer Dashboard
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

                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate('/organizer/scanner');
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-purple-300 hover:text-white hover:bg-purple-950/40 transition"
                      >
                        <span className="flex items-center gap-2">
                          <QrCode className="w-3.5 h-3.5 text-purple-400" />
                          Organizer Scanner
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate('/checkout/tier-rooftop-ga');
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition"
                      >
                        <span>Simulate New Booking Flow</span>
                        <span className="text-[10px] text-primary-400 font-medium">Demo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          resetDefaults();
                          setDropdownOpen(false);
                          navigate('/tickets');
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-red-400 hover:bg-red-950/30 transition border-t border-zinc-800/60 mt-1 pt-2"
                      >
                        <span className="flex items-center gap-1.5">
                          <RefreshCw className="w-3 h-3" />
                          Reset All Demo Data
                        </span>
                        <span className="text-[10px] text-zinc-500">Seed</span>
                      </button>

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
          ) : (
            /* Unauthenticated state */
            <div className="flex items-center gap-2.5">
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 transition"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
              <Link
                to="/register"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-600 hover:bg-primary-500 text-white transition shadow-sm"
              >
                <span>Register</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
