import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface NavItem {
  label: string;
  path: string;
  end?: boolean;
  icon: React.ReactNode;
}

interface NavSection {
  group: string;
  items: NavItem[];
}

export function AdminNeoLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState<boolean>(true);
  const [copilotInput, setCopilotInput] = useState('');
  const [copilotMessages, setCopilotMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; bullets?: string[]; time: string }>>([
    {
      role: 'assistant',
      text: `Hi, ${user?.email?.split('@')[0] || 'Admin'}. How can I assist you today?`,
      time: '10:30 AM',
    },
    {
      role: 'user',
      text: 'What insights can you give me about this month?',
      time: '10:30 AM',
    },
    {
      role: 'assistant',
      text: "Here's what I found from live platform telemetry:",
      bullets: [
        'Revenue is up by 24.5% compared to prior period',
        'Database query latency is optimal at under 5ms',
        'Top performing event: Summer Tech Summit & Music Fest',
        'Zero critical security audit alerts flagged today',
      ],
      time: '10:31 AM',
    },
  ]);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('argon_admin_theme');
      return saved ? saved === 'dark' : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('argon_admin_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('argon_admin_theme', 'light');
      }
    } catch {
      // ignore storage errors
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const handleSendCopilot = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!copilotInput.trim()) return;

    const userText = copilotInput.trim();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setCopilotMessages((prev) => [
      ...prev,
      { role: 'user', text: userText, time: nowTime },
      {
        role: 'assistant',
        text: `Analysis complete for: "${userText}"`,
        bullets: [
          'All PostgreSQL transactional ledgers remain synchronized.',
          'Event quotas and attendee ticket balances are consistent.',
          'No anomalous rate-limiting or scan failures detected.',
        ],
        time: nowTime,
      },
    ]);
    setCopilotInput('');
  };

  // Breadcrumb mapping
  const getBreadcrumb = () => {
    if (location.pathname === '/admin') return 'Overview';
    if (location.pathname.startsWith('/admin/events')) return 'Events Catalog';
    if (location.pathname.startsWith('/admin/bookings')) return 'Bookings & Orders';
    if (location.pathname.startsWith('/admin/users')) return 'User Directory';
    if (location.pathname.startsWith('/admin/audit')) return 'Audit Logs';
    if (location.pathname.startsWith('/admin/system')) return 'System Health';
    return 'Dashboard';
  };

  const navLinks: NavSection[] = [
    {
      group: 'Overview',
      items: [
        {
          label: 'Dashboard',
          path: '/admin',
          end: true,
          icon: (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          ),
        },
        {
          label: 'System Health',
          path: '/admin/system',
          icon: (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          ),
        },
      ],
    },
    {
      group: 'Business',
      items: [
        {
          label: 'Events Catalog',
          path: '/admin/events',
          icon: (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ),
        },
        {
          label: 'Bookings & Orders',
          path: '/admin/bookings',
          icon: (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          ),
        },
      ],
    },
    {
      group: 'Management',
      items: [
        {
          label: 'User Directory',
          path: '/admin/users',
          icon: (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ),
        },
        {
          label: 'Audit Trail',
          path: '/admin/audit',
          icon: (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
        },
      ],
    },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F4F6F9] dark:bg-[#0B0F17] font-sans text-slate-800 dark:text-slate-100 antialiased transition-colors duration-200">
      {/* ==================================================================== */}
      {/* 1. LEFT SIDEBAR                                                      */}
      {/* ==================================================================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 md:w-68 border-r border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131926] p-5 shadow-sm transition-all duration-300 md:static md:translate-x-0 flex flex-col justify-between shrink-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FF5B22] text-white shadow-md shadow-[#FF5B22]/25 font-black text-lg">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white leading-tight">
                  Argon OS
                </div>
                <div className="text-[11px] font-medium text-slate-400 dark:text-slate-400">
                  Smart Event OS
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
              </svg>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white md:hidden p-1 ml-1"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Navigation Groups */}
          <nav className="space-y-5 overflow-y-auto max-h-[calc(100vh-340px)] pr-1">
            {navLinks.map((section) => (
              <div key={section.group}>
                <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                  {section.group}
                </div>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.label}
                      to={item.path}
                      end={item.end}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition-all duration-200 ${
                          isActive
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-white'
                        }`
                      }
                    >
                      <span className="shrink-0">{item.icon}</span>
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom Section: Ambient Promo Card & Profile */}
        <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          {/* Ambient Glow Card (1:1 with reference) */}
          <div className="relative overflow-hidden rounded-3xl p-4 bg-gradient-to-br from-[#FF5B22]/15 via-amber-500/10 to-rose-500/10 border border-[#FF5B22]/20 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-[#FF5B22] text-white flex items-center justify-center text-xs font-bold shadow-sm shadow-[#FF5B22]/30">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Platform Verified
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
              Real-time PostgreSQL engine and ticket verification live.
            </p>
            <Link
              to="/admin/system"
              className="mt-3 block w-full text-center rounded-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs py-2 px-3 shadow-sm hover:shadow transition"
            >
              System Health
            </Link>
          </div>

          {/* User Profile Pill & Logout */}
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 p-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-tr from-slate-800 to-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {(user?.email?.[0] || 'A').toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                  {user?.email || 'admin@argon.kh'}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-400 font-medium truncate">
                  Platform Admin
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              title="Log out"
              className="text-slate-400 hover:text-rose-500 transition p-1"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ==================================================================== */}
      {/* 2. MAIN VIEWPORT CANVAS                                              */}
      {/* ==================================================================== */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top App Bar (1:1 with reference) */}
        <header className="flex h-16 shrink-0 items-center justify-between px-6 py-4 border-b border-slate-200/70 dark:border-slate-800/80 bg-white dark:bg-[#131926] transition-colors duration-200">
          {/* Left: Mobile trigger & Breadcrumbs */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131926] p-2 text-slate-600 dark:text-slate-300 shadow-sm md:hidden"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-400">
              <Link to="/admin" className="hover:text-slate-700 dark:hover:text-white transition-colors">
                Dashboard
              </Link>
              <span>›</span>
              <span className="text-slate-900 dark:text-white font-bold">{getBreadcrumb()}</span>
            </div>
          </div>

          {/* Right: Search, Notifications, Theme, Copilot & Avatar */}
          <div className="flex items-center gap-3">
            {/* Search Pill */}
            <div className="hidden md:flex items-center gap-2 rounded-full border border-slate-200/80 dark:border-slate-800 bg-[#F4F6F9] dark:bg-slate-900 px-3.5 py-1.5 text-xs text-slate-400 w-56 lg:w-64 focus-within:border-[#FF5B22] focus-within:ring-1 focus-within:ring-[#FF5B22]/20 transition">
              <svg className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search..."
                className="w-full bg-transparent text-slate-800 dark:text-slate-200 placeholder-slate-400 text-xs focus:outline-none"
              />
            </div>

            {/* Notification Bell */}
            <button
              type="button"
              title="Notifications"
              className="relative flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131926] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-sm transition"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#FF5B22]" />
            </button>

            {/* Dark / Light Mode Switcher */}
            <button
              type="button"
              onClick={toggleTheme}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131926] text-slate-600 dark:text-slate-300 shadow-sm hover:border-[#FF5B22] transition-colors"
            >
              {isDarkMode ? (
                <svg className="h-4 w-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-4 w-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>

            {/* AI Assistant Toggle Button */}
            <button
              type="button"
              onClick={() => setCopilotOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition shadow-sm ${
                copilotOpen
                  ? 'bg-[#FF5B22] text-white shadow-[#FF5B22]/20'
                  : 'border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131926] text-slate-700 dark:text-slate-200 hover:border-[#FF5B22]'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${copilotOpen ? 'bg-white animate-pulse' : 'bg-[#FF5B22]'}`} />
              <span>Argon AI</span>
            </button>

            {/* Profile Avatar */}
            <div className="h-8 w-8 rounded-full bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
              {(user?.email?.[0] || 'A').toUpperCase()}
            </div>
          </div>
        </header>

        {/* Content Body: Canvas + Collapsible Right AI Copilot */}
        <div className="flex flex-1 overflow-hidden">
          {/* Center Main Viewport */}
          <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-8 bg-[#F4F6F9] dark:bg-[#0B0F17]">
            <Outlet />
          </main>

          {/* Right Column: AI Assistant (1:1 with reference) */}
          {copilotOpen && (
            <aside className="w-80 lg:w-96 border-l border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131926] flex flex-col justify-between shrink-0 shadow-sm z-20 animate-fade-in transition-all">
              {/* Header */}
              <div className="flex items-center justify-between p-4 bg-[#0F172A] text-white">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-[#FF5B22] flex items-center justify-center text-white font-bold text-xs">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-bold text-xs">Argon AI</div>
                    <div className="text-[10px] text-slate-400">Platform Copilot</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-400">
                  <button
                    type="button"
                    onClick={() => setCopilotMessages([
                      {
                        role: 'assistant',
                        text: `Hi, ${user?.email?.split('@')[0] || 'Admin'}. How can I assist you today?`,
                        time: 'Now',
                      },
                    ])}
                    title="Reset chat"
                    className="hover:text-white transition"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCopilotOpen(false)}
                    title="Close Copilot"
                    className="hover:text-white transition"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {copilotMessages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="h-7 w-7 rounded-full bg-[#FF5B22] text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-sm">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                    )}

                    <div className="space-y-1 max-w-[85%]">
                      <div
                        className={`p-3 rounded-2xl text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-[#F4F6F9] dark:bg-slate-800 text-slate-900 dark:text-white rounded-tr-none'
                            : 'bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none shadow-sm'
                        }`}
                      >
                        <p className="font-medium">{msg.text}</p>
                        {msg.bullets && msg.bullets.length > 0 && (
                          <div className="mt-2 space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                            {msg.bullets.map((b, bIdx) => (
                              <div key={bIdx} className="flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                                <span className="text-[#FF5B22] font-bold">✔</span>
                                <span>{b}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className={`text-[10px] text-slate-400 font-mono ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                        {msg.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Composer (1:1 with reference) */}
              <div className="p-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/50">
                <form onSubmit={handleSendCopilot} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 shadow-sm space-y-2">
                  <input
                    type="text"
                    value={copilotInput}
                    onChange={(e) => setCopilotInput(e.target.value)}
                    placeholder="What should you work on?"
                    className="w-full bg-transparent px-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <button type="button" className="p-1 hover:text-slate-600 dark:hover:text-white transition">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                      <button type="button" className="p-1 hover:text-slate-600 dark:hover:text-white transition">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCopilotInput('Summarize daily revenue velocity and check for ticket disputes')}
                        className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 hover:text-[#FF5B22] transition ml-1"
                      >
                        ✨ Improve prompt
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={!copilotInput.trim()}
                      className="h-7 w-7 rounded-full bg-[#FF5B22] text-white flex items-center justify-center shadow-sm disabled:opacity-40 transition"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                    </button>
                  </div>
                </form>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminNeoLayout;
