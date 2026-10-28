import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Role } from '@argon/shared';
import { useAuth } from './hooks/useAuth';
import { AdminLayout } from './components/layout/AdminLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Button } from './components/ui/Button';

// Organizer Feature Views
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
 * PlaceholderPage – Standalone placeholder for pending public and customer routes.
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
 * LoginPage – Dev-friendly login with quick one-click role switchers.
 */
function LoginPage() {
  const { switchDevRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const fromLocation = (location.state as { from?: { pathname?: string } })?.from?.pathname;

  const handleRoleLogin = (role: Role) => {
    switchDevRole(role);
    if (fromLocation) {
      navigate(fromLocation, { replace: true });
    } else if (role === Role.ADMIN) {
      navigate('/admin', { replace: true });
    } else if (role === Role.ORGANIZER) {
      navigate('/organizer', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-surface-card p-8 shadow-2xl text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 font-bold font-display text-xl border border-emerald-500/30 mb-4">
          A
        </div>
        <h1 className="font-display text-2xl font-bold text-white">Sign In to Argon</h1>
        <p className="mt-2 text-sm text-gray-400">
          Select an identity profile to access role-gated administrative portals.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Button
            variant="primary"
            onClick={() => handleRoleLogin(Role.ADMIN)}
            className="w-full justify-center bg-indigo-600 hover:bg-indigo-500"
          >
            Sign in as Platform Super-Admin
          </Button>

          <Button
            variant="primary"
            onClick={() => handleRoleLogin(Role.ORGANIZER)}
            className="w-full justify-center bg-emerald-600 hover:bg-emerald-500"
          >
            Sign in as Event Organizer
          </Button>

          <Button
            variant="secondary"
            onClick={() => handleRoleLogin(Role.CUSTOMER)}
            className="w-full justify-center"
          >
            Sign in as Customer
          </Button>
        </div>

        <div className="mt-6 text-xs text-gray-400">
          Development environment: Uses mock JWT credentials.
        </div>
      </div>
    </div>
  );
}

/**
 * AppRoutes – Application route hierarchy with role-gated access control.
 */
export default function AppRoutes() {
  return (
    <Routes>
      {/* ==================================================================== */}
      {/* PUBLIC ROUTES                                                       */}
      {/* ==================================================================== */}
      <Route path="/" element={<PlaceholderPage name="Discover Events" />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<PlaceholderPage name="Register" />} />
      <Route path="/events/:id" element={<PlaceholderPage name="Event Detail" />} />

      {/* ==================================================================== */}
      {/* CUSTOMER ROUTES                                                     */}
      {/* ==================================================================== */}
      <Route path="/checkout/:tierId" element={<PlaceholderPage name="Checkout" />} />
      <Route path="/checkout/:tierId/payment" element={<PlaceholderPage name="Payment" />} />
      <Route path="/tickets" element={<PlaceholderPage name="My Tickets" />} />
      <Route path="/tickets/:id" element={<PlaceholderPage name="QR Pass" />} />

      {/* ==================================================================== */}
      {/* ORGANIZER SUITE (ORGANIZER & ADMIN ROLES)                            */}
      {/* ==================================================================== */}
      <Route
        element={
          <ProtectedRoute allowedRoles={[Role.ORGANIZER, Role.ADMIN]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/organizer" element={<OrganizerDashboardView />} />
        <Route path="/organizer/metrics" element={<OrganizerDashboardView />} />
        <Route path="/organizer/events/:id/metrics" element={<OrganizerDashboardView />} />
        <Route path="/organizer/tiers" element={<TierQuotaView />} />
        <Route path="/organizer/events/:id/tiers" element={<TierQuotaView />} />
        <Route path="/organizer/attendees" element={<AttendeeRosterView />} />
        <Route path="/organizer/events/:id/attendees" element={<AttendeeRosterView />} />

        {/* Organizer secondary operations */}
        <Route path="/organizer/events/new" element={<PlaceholderPage name="Create Event" />} />
        <Route path="/organizer/events/:id" element={<PlaceholderPage name="Edit Event" />} />
        <Route path="/organizer/events/:id/bookings" element={<PlaceholderPage name="Bookings Table" />} />
        <Route path="/organizer/staff" element={<PlaceholderPage name="Staff Credentials" />} />
      </Route>

      {/* ==================================================================== */}
      {/* SUPER-ADMIN GOVERNANCE (ADMIN ROLE ONLY)                             */}
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
