import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

/**
 * OrganizerLayout – sidebar + content shell for /organizer/* routes.
 */
export function OrganizerLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
        <div className="mx-auto w-full max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
