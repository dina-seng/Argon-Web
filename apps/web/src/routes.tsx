import { Routes, Route, Navigate } from 'react-router-dom';
import EventCatalogPage from './features/discovery/EventCatalogPage';
import CheckoutPage from './features/booking/CheckoutPage';
import PaymentPage from './features/booking/PaymentPage';
import MyTicketsPage from './features/tickets/MyTicketsPage';
import QrPassPage from './features/tickets/QrPassPage';
import ScannerPage from './features/organizer/ScannerPage';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import { ProtectedRoute } from './features/auth/ProtectedRoute';

/**
 * routes.tsx – Public routes and signed-in-only route definitions.
 *
 * Roles: CUSTOMER, ORGANIZER, ADMIN
 *
 * TODO: Replace placeholder pages with real feature components.
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
      {/* Discovery & Home */}
      <Route path="/" element={<EventCatalogPage />} />
      <Route path="/events" element={<EventCatalogPage />} />

      {/* Booking & Payment Flow */}
      <Route path="/checkout/:tierId" element={<CheckoutPage />} />
      <Route path="/checkout/:tierId/payment" element={<PaymentPage />} />
      <Route path="/checkout/payment" element={<PaymentPage />} />
      <Route path="/payment/:bookingId" element={<PaymentPage />} />

      {/* Customer Ticket & QR Pass Flow */}
      <Route path="/tickets" element={<MyTicketsPage />} />
      <Route path="/tickets/:id" element={<QrPassPage />} />

      {/* Organizer Scanner Flow */}
      <Route path="/organizer/scanner" element={<ScannerPage />} />
      <Route path="/organizer/scan" element={<ScannerPage />} />
      <Route path="/organizer" element={<ScannerPage />} />
      <Route path="/scanner" element={<ScannerPage />} />
      {/* Public */}
      <Route path="/" element={<PlaceholderPage name="Discover Events" />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/events/:id" element={<PlaceholderPage name="Event Detail" />} />

      {/* App pages require a signed-in user; roles are not checked here. */}
      <Route element={<ProtectedRoute />}>
        <Route path="/checkout/:tierId" element={<PlaceholderPage name="Checkout" />} />
        <Route path="/checkout/:tierId/payment" element={<PlaceholderPage name="Payment" />} />
        <Route path="/tickets" element={<PlaceholderPage name="My Tickets" />} />
        <Route path="/tickets/:id" element={<PlaceholderPage name="QR Pass" />} />
        <Route path="/organizer" element={<PlaceholderPage name="Organizer Dashboard" />} />
        <Route path="/organizer/events/new" element={<PlaceholderPage name="Create Event" />} />
        <Route path="/organizer/events/:id" element={<PlaceholderPage name="Edit Event" />} />
        <Route path="/organizer/events/:id/bookings" element={<PlaceholderPage name="Bookings Table" />} />
        <Route path="/organizer/staff" element={<PlaceholderPage name="Staff Credentials" />} />
        <Route path="/admin" element={<PlaceholderPage name="Admin Dashboard" />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
