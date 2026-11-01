import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

/**
 * OrganizerLayout – sidebar + content shell for /organizer/* routes.
 * TODO: Wrap in ProtectedRoute (ORGANIZER) once auth context exists.
 */
export function OrganizerLayout() {
  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
        <Outlet />
      </main>
    </div>
  );
}
