import { Outlet } from 'react-router-dom';
import { Header } from './Header';

/**
 * PublicLayout – header + content shell for customer-facing pages.
 */
export function PublicLayout() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-8 lg:px-[120px] lg:py-12">
        <Outlet />
      </main>
    </div>
  );
}
