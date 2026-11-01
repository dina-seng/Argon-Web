import { Routes, Route, Navigate } from 'react-router-dom';
import { Role } from '@argon/shared';

// Layout & Guards
import { AdminLayout } from './components/layout/AdminLayout';
import { ProtectedRoute } from './features/auth/ProtectedRoute';

// Public & Customer Feature Views
import EventCatalogPage from './features/discovery/EventCatalogPage';
import EventDetailPage from './features/discovery/EventDetailPage';
import CheckoutPage from './features/booking/CheckoutPage';
import PaymentPage from './features/booking/PaymentPage';
import MyTicketsPage from './features/tickets/MyTicketsPage';
import QrPassPage from './features/tickets/QrPassPage';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';

// Organizer Feature Views
import DashboardPage from './features/organizer/DashboardPage';
import EventFormPage from './features/organizer/EventFormPage';
import ScannerPage from './features/organizer/ScannerPage';
import {
  OrganizerDashboardView,
  TierQuotaView,
  AttendeeRosterView,
} from './features/organizer';

// Admin Feature Views
import {
  AdminDashboardView,
  UserManagementView,
  TransactionOverridesView,
  AuditLogsView,
} from './features/admin';

/**
 * PlaceholderPage – Standalone placeholder for pending views.
 */
const PlaceholderPage = ({ name }: { name: string }) => (
  <div className="flex min-h-screen items-center justify-center bg-surface p-4">
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-surface-card p-8 text-center shadow-xl">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/10 text-primary-400 border border-primary-500/20">
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <h1 className="font-display text-2xl font-bold text-white">{name}</h1>
      <p className="mt-2 text-sm text-gray-400">Argon Ticketing Suite – view pending implementation</p>
    </div>
  </div>
);

/**
 * AppRoutes – Unified routing hierarchy combining consumer discovery/ticketing flows
 * with role-gated administrative and organizer consoles.
 */
export default function AppRoutes() {
  return (
    <Routes>
      {/* ==================================================================== */}
      {/* PUBLIC & DISCOVERY ROUTES                                           */}
      {/* ==================================================================== */}
      <Route path="/" element={<EventCatalogPage />} />
      <Route path="/events" element={<EventCatalogPage />} />
      <Route path="/events/:id" element={<EventDetailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* ==================================================================== */}
      {/* CUSTOMER PROTECTED ROUTES (LOGGED-IN SESSION REQUIRED)               */}
      {/* ==================================================================== */}
      <Route element={<ProtectedRoute />}>
        <Route path="/checkout/:tierId" element={<CheckoutPage />} />
        <Route path="/checkout/:tierId/payment" element={<PaymentPage />} />
        <Route path="/checkout/payment" element={<PaymentPage />} />
        <Route path="/payment/:bookingId" element={<PaymentPage />} />
        <Route path="/tickets" element={<MyTicketsPage />} />
        <Route path="/tickets/:id" element={<QrPassPage />} />
      </Route>

      {/* ==================================================================== */}
      {/* STANDALONE MOBILE SCANNER (ORGANIZER & ADMIN ROLES)                  */}
      {/* ==================================================================== */}
      <Route element={<ProtectedRoute allowedRoles={[Role.ORGANIZER, Role.ADMIN]} />}>
        <Route path="/scanner" element={<ScannerPage />} />
        <Route path="/organizer/scan" element={<ScannerPage />} />
      </Route>

      {/* ==================================================================== */}
      {/* ORGANIZER PORTAL SUITE (ORGANIZER & ADMIN ROLES UNDER ADMINLAYOUT)   */}
      {/* ==================================================================== */}
      <Route
        element={
          <ProtectedRoute allowedRoles={[Role.ORGANIZER, Role.ADMIN]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/organizer" element={<DashboardPage />} />
        <Route path="/organizer/events/new" element={<EventFormPage />} />
        <Route path="/organizer/events/:id" element={<EventFormPage />} />
        <Route path="/organizer/metrics" element={<OrganizerDashboardView />} />
        <Route path="/organizer/events/:id/metrics" element={<OrganizerDashboardView />} />
        <Route path="/organizer/tiers" element={<TierQuotaView />} />
        <Route path="/organizer/events/:id/tiers" element={<TierQuotaView />} />
        <Route path="/organizer/attendees" element={<AttendeeRosterView />} />
        <Route path="/organizer/events/:id/attendees" element={<AttendeeRosterView />} />
        <Route path="/organizer/scanner" element={<ScannerPage />} />
        <Route path="/organizer/events/:id/bookings" element={<PlaceholderPage name="Bookings Table" />} />
        <Route path="/organizer/staff" element={<PlaceholderPage name="Staff Credentials" />} />
      </Route>

      {/* ==================================================================== */}
      {/* SUPER-ADMIN GOVERNANCE (ADMIN ROLE ONLY UNDER ADMINLAYOUT)           */}
      {/* ==================================================================== */}
      <Route
        element={
          <ProtectedRoute allowedRoles={[Role.ADMIN]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin" element={<AdminDashboardView />} />
        <Route path="/admin/users" element={<UserManagementView />} />
        <Route path="/admin/transactions" element={<TransactionOverridesView />} />
        <Route path="/admin/audit" element={<AuditLogsView />} />
      </Route>

      {/* ==================================================================== */}
      {/* FALLBACK                                                            */}
      {/* ==================================================================== */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
