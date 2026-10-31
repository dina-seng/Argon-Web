import { Routes, Route, Navigate } from 'react-router-dom';
import { OrganizerLayout } from './components/layout/OrganizerLayout';
import { PublicLayout } from './components/layout/PublicLayout';
import EventCatalogPage from './features/discovery/EventCatalogPage';
import EventDetailPage from './features/discovery/EventDetailPage';
import DashboardPage from './features/organizer/DashboardPage';
import EventFormPage from './features/organizer/EventFormPage';

/**
 * routes.tsx – Role-gated route definitions.
 *
 * Roles: CUSTOMER, ORGANIZER, ADMIN
 *
 * TODO: Replace placeholder pages with real feature components.
 * TODO: Implement ProtectedRoute wrapper that reads auth context and redirects
 *       unauthenticated users to /login.
 */

// ---- Placeholder pages ----
const PlaceholderPage = ({ name }: { name: string }) => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="rounded-2xl bg-surface-card p-8 text-center">
      <h1 className="font-display text-3xl font-bold text-white">{name}</h1>
      <p className="mt-2 text-gray-400">Argon – placeholder page</p>
    </div>
  </div>
);

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<EventCatalogPage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
      </Route>
      <Route path="/login" element={<PlaceholderPage name="Login" />} />
      <Route path="/register" element={<PlaceholderPage name="Register" />} />

      {/* CUSTOMER */}
      <Route path="/checkout/:tierId" element={<PlaceholderPage name="Checkout" />} />
      <Route path="/checkout/:tierId/payment" element={<PlaceholderPage name="Payment" />} />
      <Route path="/tickets" element={<PlaceholderPage name="My Tickets" />} />
      <Route path="/tickets/:id" element={<PlaceholderPage name="QR Pass" />} />

      {/* ORGANIZER */}
      <Route path="/organizer" element={<OrganizerLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="events/new" element={<EventFormPage />} />
        <Route path="events/:id" element={<EventFormPage />} />
        <Route path="events/:id/bookings" element={<PlaceholderPage name="Bookings Table" />} />
        <Route path="staff" element={<PlaceholderPage name="Staff Credentials" />} />
      </Route>

      {/* ADMIN */}
      <Route path="/admin" element={<PlaceholderPage name="Admin Dashboard" />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
