import { Link, NavLink } from 'react-router-dom';

/**
 * Header – top navigation bar for public pages.
 * TODO: Show login/logout and user menu once auth context exists.
 */
export function Header() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
      isActive ? 'text-accent' : 'text-fg-muted hover:text-fg'
    }`;

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-8 lg:px-[120px]">
        <Link to="/" className="text-xl font-bold text-fg">
          Argon
        </Link>
        <div className="flex items-center gap-1">
          <NavLink to="/" end className={linkClass}>
            Discover
          </NavLink>
          <NavLink to="/organizer" className={linkClass}>
            For organizers
          </NavLink>
        </div>
      </nav>
    </header>
  );
}
