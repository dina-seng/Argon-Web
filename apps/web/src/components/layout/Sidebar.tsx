import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/organizer', label: 'Dashboard', end: true },
  { to: '/organizer/events/new', label: 'Create event', end: true },
  { to: '/organizer/staff', label: 'Staff', end: true },
];

/**
 * Sidebar – organizer side navigation. Collapses to a horizontal bar on small screens.
 */
export function Sidebar() {
  return (
    <aside className="border-b border-line bg-surface-card md:min-h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r">
      <div className="flex items-center gap-4 px-4 py-3 md:block md:px-5 md:py-6">
        <NavLink to="/" className="whitespace-nowrap text-xl font-bold text-fg">
          Argon
          <span className="ml-2 align-middle text-xs font-semibold text-accent">Organizer</span>
        </NavLink>
        <nav className="flex gap-1 overflow-x-auto md:mt-8 md:flex-col" aria-label="Organizer">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                  isActive ? 'bg-accent-soft text-accent' : 'text-fg-muted hover:bg-surface-elevated hover:text-fg',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <NavLink
          to="/"
          className="ml-auto whitespace-nowrap text-sm font-semibold text-fg-muted hover:text-fg md:mt-8 md:block md:px-3"
        >
          View public feed
        </NavLink>
      </div>
    </aside>
  );
}
