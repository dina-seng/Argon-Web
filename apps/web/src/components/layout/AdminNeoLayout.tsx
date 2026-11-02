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

  // Breadcrumb mapping
  const getBreadcrumb = () => {
    if (location.pathname === '/admin') return 'Overview';
    if (location.pathname.startsWith('/admin/events')) return 'Events Catalog';
    if (location.pathname.startsWith('/admin/bookings')) return 'Bookings & Orders';
    if (location.pathname.startsWith('/admin/users')) return 'User Directory';
    if (location.pathname.startsWith('/admin/audit')) return 'Audit Logs';
    if (location.pathname.startsWith('/admin/system')) return 'System Health & Diagnostics';
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
      ],
    },
    {
      group: 'Management',
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
          label: 'User Directory',
          path: '/admin/users',
          icon: (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ),
        },
      ],
    },
    {
      group: 'Operations',
      items: [
        {
          label: 'Bookings & Orders',
          path: '/admin/bookings',
          icon: (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
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
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F1F3F7] dark:bg-[#0B0F17] font-sans text-slate-800 dark:text-slate-100 antialiased transition-colors duration-200">
      {/* ==================================================================== */}
      {/* 1. LEFT FLOATING SIDEBAR                                             */}
      {/* ==================================================================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 m-3 w-64 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131926] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] transition-all duration-300 md:static md:translate-x-0 flex flex-col justify-between ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 p-2 shadow-sm">
                <img
                  src="/brand/kit/argon-color.svg"
                  alt="Argon"
                  className="h-full w-full object-contain dark:invert"
                />
              </div>
              <div>
                <div className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white leading-none">
                  Argon OS
                </div>
                <div className="text-[11px] font-medium text-slate-400 dark:text-slate-400 mt-0.5 font-mono">
                  Superuser Console
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white md:hidden p-1"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation Groups */}
          <nav className="space-y-5 overflow-y-auto max-h-[calc(100vh-320px)] pr-1">
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
                            ? 'bg-[#FF5B22]/10 text-[#FF5B22] dark:text-[#FF6B35] border border-[#FF5B22]/25 shadow-sm shadow-[#FF5B22]/10'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
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

        {/* Bottom Section: Profile */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
          {/* User Profile Pill & Logout */}
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 p-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 shrink-0 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                SM
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                  {user?.email || 'admin@argon.kh'}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-400 font-mono truncate">
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
      {/* 2. MAIN VIEWPORT CANVAS (Center Column)                              */}
      {/* ==================================================================== */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top App Bar */}
        <header className="flex h-16 shrink-0 items-center justify-between px-6 py-4 border-b border-slate-200/50 dark:border-slate-800/80 bg-[#F1F3F7] dark:bg-[#0B0F17] transition-colors duration-200">
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

          {/* Right: Theme Toggle */}
          <div className="flex items-center gap-3">
            {/* Dark / Light Mode Switcher */}
            <button
              type="button"
              onClick={toggleTheme}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="flex items-center gap-2 rounded-full border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131926] px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm hover:border-[#FF5B22] transition-colors"
            >
              {isDarkMode ? (
                <>
                  <svg className="h-3.5 w-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                  <span>Light</span>
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                  <span>Dark</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminNeoLayout;
