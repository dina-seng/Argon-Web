import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';

/**
 * PublicLayout – header + content + footer shell for customer-facing pages.
 * Pages rendered inside this layout must NOT render their own Header/Footer.
 */
export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-[#090a10] text-zinc-100">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
