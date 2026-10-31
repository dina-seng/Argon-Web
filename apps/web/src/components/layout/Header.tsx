import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTicketingStore } from '../../hooks/useTicketingStore';
import { Role } from '@argon/shared';
import { QrCode, Ticket, Compass, RefreshCw, ChevronDown, Check } from 'lucide-react';

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, tickets, activeRole, setActiveRole, resetDefaults } = useTicketingStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isTicketsActive = location.pathname.startsWith('/tickets');
  const isDiscoverActive = location.pathname === '/' || location.pathname.startsWith('/events');
  const isScannerActive = location.pathname.startsWith('/organizer');

  const activeTicketCount = tickets.filter((t) => t.status === 'ACTIVE').length;

  return (
    <header className="border-b border-white/[0.07] bg-[#0c0d14]/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Left Navigation */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="font-display text-2xl font-black tracking-tight text-white group-hover:text-primary-300 transition-colors">
              argon
            </span>
            {/* The signature neon dash from the screenshots */}
            <span className="w-5 h-1 rounded-full bg-gradient-to-r from-cyan-400 via-primary-500 to-fuchsia-500 shadow-[0_0_8px_rgba(120,87,255,0.8)]" />
          </Link>

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
          </nav>
        </div>

        {/* Right Navigation */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400 border border-white/5 bg-zinc-900/60 px-3 py-1.5 rounded-full">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Cambodia · USD</span>
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 bg-[#1b1730] hover:bg-[#251f47] border border-purple-800/40 px-2.5 py-1.5 rounded-xl transition text-left group"
              aria-label="User profile menu"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-600 to-indigo-700 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                {user.avatarInitials}
              </div>
              <span className="hidden sm:inline text-xs font-medium text-zinc-300 group-hover:text-white">
                {user.name.split(' ')[0]}
              </span>
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
                    <p className="text-sm font-semibold text-white">{user.name}</p>
                    <p className="text-xs text-zinc-400 font-mono">{user.email}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60">
                        {activeRole}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate('/tickets');
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition"
                    >
                      <span>My Tickets Pass</span>
                      <Ticket className="w-3.5 h-3.5 text-zinc-400" />
                    </button>

                    <button
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
                      onClick={() => {
                        setActiveRole(activeRole === Role.CUSTOMER ? Role.ORGANIZER : Role.CUSTOMER);
                        setDropdownOpen(false);
                        if (activeRole === Role.CUSTOMER) {
                          navigate('/organizer/scanner');
                        }
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-purple-300 hover:bg-purple-950/40 transition"
                    >
                      <span>Switch to {activeRole === Role.CUSTOMER ? 'Organizer Mode' : 'Customer Mode'}</span>
                      <Check className="w-3.5 h-3.5" />
                    </button>

                    <button
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
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
