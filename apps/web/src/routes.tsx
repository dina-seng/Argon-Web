import { Routes, Route, Navigate } from 'react-router-dom';
import { OrganizerLayout } from './components/layout/OrganizerLayout';
import { PublicLayout } from './components/layout/PublicLayout';
import { ProtectedRoute } from './features/auth/ProtectedRoute';
import EventCatalogPage from './features/discovery/EventCatalogPage';
import EventDetailPage from './features/discovery/EventDetailPage';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import CheckoutPage from './features/booking/CheckoutPage';
import PaymentPage from './features/booking/PaymentPage';
import MyTicketsPage from './features/tickets/MyTicketsPage';
import QrPassPage from './features/tickets/QrPassPage';
import DashboardPage from './features/organizer/DashboardPage';
import EventFormPage from './features/organizer/EventFormPage';
import ScannerPage from './features/organizer/ScannerPage';

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

      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Customer protected */}
      <Route element={<ProtectedRoute />}>
        <Route path="/checkout/:tierId" element={<CheckoutPage />} />
        <Route path="/checkout/:tierId/payment" element={<PaymentPage />} />
        <Route path="/payment/:bookingId" element={<PaymentPage />} />
        <Route path="/tickets" element={<MyTicketsPage />} />
        <Route path="/tickets/:id" element={<QrPassPage />} />

        {/* Organizer scanner (full-page, own header) */}
        <Route path="/organizer/scanner" element={<ScannerPage />} />

        {/* Organizer protected */}
        <Route element={<OrganizerLayout />}>
          <Route path="/organizer" element={<DashboardPage />} />
          <Route path="/organizer/events/new" element={<EventFormPage />} />
          <Route path="/organizer/events/:id" element={<EventFormPage />} />
          <Route path="/organizer/events/:id/bookings" element={<PlaceholderPage name="Bookings Table" />} />
          <Route path="/organizer/staff" element={<PlaceholderPage name="Staff Credentials" />} />
        </Route>
      </Route>

      {/* Admin */}
      <Route path="/admin" element={<PlaceholderPage name="Admin Dashboard" />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
