import { useState, useEffect, useCallback } from 'react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { api } from '../../lib/api';

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: 'CUSTOMER' | 'ORGANIZER' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
  _count?: {
    bookings: number;
    events: number;
  };
}

export interface UserDetailsBooking {
  id: string;
  eventTitle: string;
  eventVenue: string;
  tierName: string;
  amount: number;
  quantity: number;
  status: string;
  createdAt: string;
  ticketsIssued: number;
  ticketsCheckedIn: number;
}

export interface UserDetailsEvent {
  id: string;
  title: string;
  status: string;
  venue: string;
  startsAt: string;
  capacity: number;
}

export interface UserDetailsResponse {
  id: string;
  email: string;
  name: string | null;
  role: 'CUSTOMER' | 'ORGANIZER' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
  isSuspended: boolean;
  suspensionReason: string | null;
  bookings: UserDetailsBooking[];
  events: UserDetailsEvent[];
}

export interface PaginatedUsersResponse {
  data: AdminUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserManagementViewProps {
  pageSize?: number;
}

export function UserManagementView({ pageSize = 10 }: UserManagementViewProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'CUSTOMER' | 'ORGANIZER' | 'ADMIN'>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Role Elevation Modal State
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [targetRole, setTargetRole] = useState<'CUSTOMER' | 'ORGANIZER' | 'ADMIN'>('ORGANIZER');
  const [isSavingRole, setIsSavingRole] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // User Profile Drawer State
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetailsResponse | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [isTogglingSuspend, setIsTogglingSuspend] = useState<boolean>(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const fetchUsers = useCallback(
    async (page: number, search: string, role: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        queryParams.set('page', String(page));
        queryParams.set('limit', String(pageSize));
        if (search.trim()) queryParams.set('search', search.trim());
        if (role !== 'ALL') queryParams.set('role', role);

        let res: PaginatedUsersResponse;
        try {
          res = await api.get<PaginatedUsersResponse>(`/api/v1/admin/users?${queryParams.toString()}`);
        } catch (err: unknown) {
          if (err instanceof Error && err.message.includes('404')) {
            res = await api.get<PaginatedUsersResponse>(`/admin/users?${queryParams.toString()}`);
          } else {
            throw err;
          }
        }

        if (res && Array.isArray(res.data)) {
          setUsers(res.data);
          setTotalUsers(res.total);
          setCurrentPage(res.page);
          setTotalPages(res.totalPages || Math.ceil(res.total / pageSize) || 1);
          setError(null);
        } else {
          throw new Error('Invalid user directory response structure');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to retrieve registered users.';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [pageSize]
  );

  useEffect(() => {
    fetchUsers(currentPage, searchQuery, roleFilter);
  }, [currentPage, searchQuery, roleFilter, fetchUsers]);

  const fetchUserDetails = async (userId: string) => {
    setDrawerUserId(userId);
    setIsLoadingDetails(true);
    setUserDetails(null);

    try {
      let res: UserDetailsResponse;
      try {
        res = await api.get<UserDetailsResponse>(`/api/v1/admin/users/${userId}/details`);
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('404')) {
          res = await api.get<UserDetailsResponse>(`/admin/users/${userId}/details`);
        } else {
          throw err;
        }
      }
      setUserDetails(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load user profile.';
      setToastMessage({ type: 'error', text: msg });
      setDrawerUserId(null);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleToggleSuspend = async () => {
    if (!userDetails) return;
    const nextSuspendState = !userDetails.isSuspended;
    setIsTogglingSuspend(true);

    try {
      try {
        await api.post(`/api/v1/admin/users/${userDetails.id}/suspend`, {
          suspend: nextSuspendState,
          reason: nextSuspendState ? 'Administrative suspension' : 'Administrative reactivation',
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('404')) {
          await api.post(`/admin/users/${userDetails.id}/suspend`, {
            suspend: nextSuspendState,
            reason: nextSuspendState ? 'Administrative suspension' : 'Administrative reactivation',
          });
        } else {
          throw err;
        }
      }

      setUserDetails((prev) => (prev ? { ...prev, isSuspended: nextSuspendState } : prev));
      setToastMessage({
        type: 'success',
        text: `Account for ${userDetails.email} ${nextSuspendState ? 'suspended' : 'reactivated'}.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update account suspension status.';
      setToastMessage({ type: 'error', text: msg });
    } finally {
      setIsTogglingSuspend(false);
    }
  };

  const handleOpenRoleModal = (user: AdminUser) => {
    setSelectedUser(user);
    setTargetRole(user.role);
    setModalError(null);
  };

  const handleCloseRoleModal = () => {
    setSelectedUser(null);
    setModalError(null);
  };

  const handleSaveRole = async () => {
    if (!selectedUser) return;
    if (targetRole === selectedUser.role) {
      handleCloseRoleModal();
      return;
    }

    setIsSavingRole(true);
    setModalError(null);

    try {
      try {
        await api.patch(`/api/v1/admin/users/${selectedUser.id}/role`, {
          role: targetRole,
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('404')) {
          await api.patch(`/admin/users/${selectedUser.id}/role`, {
            role: targetRole,
          });
        } else {
          throw err;
        }
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, role: targetRole } : u))
      );

      if (userDetails && userDetails.id === selectedUser.id) {
        setUserDetails((prev) => (prev ? { ...prev, role: targetRole } : prev));
      }

      setToastMessage({
        type: 'success',
        text: `Role for ${selectedUser.email} updated to ${targetRole}.`,
      });
      handleCloseRoleModal();
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to update user role.';
      setModalError(errorMsg);
    } finally {
      setIsSavingRole(false);
    }
  };

  const getRoleBadgeVariant = (role: AdminUser['role']) => {
    switch (role) {
      case 'ADMIN':
        return 'info';
      case 'ORGANIZER':
        return 'success';
      case 'CUSTOMER':
      default:
        return 'default';
    }
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const getUserInitials = (name: string | null, email: string) => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/).filter(Boolean);
      const first = parts[0];
      const last = parts[parts.length - 1];
      if (first && last && parts.length >= 2) {
        return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
      }
      if (first) {
        return first.slice(0, 2).toUpperCase();
      }
    }
    return email.slice(0, 2).toUpperCase();
  };

  const exportCsv = () => {
    if (users.length === 0) return;
    const headers = ['User ID', 'Email', 'Name', 'Role', 'Bookings Count', 'Events Count', 'Joined At'];
    const rows = users.map((u) => [
      u.id,
      u.email,
      u.name || '',
      u.role,
      String(u._count?.bookings ?? 0),
      String(u._count?.events ?? 0),
      u.createdAt,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `argon_users_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-md transition-all ${
            toastMessage.type === 'success'
              ? 'border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#131926] text-emerald-600 dark:text-emerald-400'
              : 'border-rose-200 dark:border-rose-800 bg-white dark:bg-[#131926] text-rose-600 dark:text-rose-400'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
          <span className="text-sm font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/70 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-slate-900 dark:text-white">
              Users & Roles
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border border-orange-200 dark:border-orange-900/60 bg-orange-50 dark:bg-orange-950/40 text-[#FF5B22]">
              {totalUsers} Registered
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Manage user accounts, inspect booking and event history, and elevate organizer permissions.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Button
            variant="secondary"
            size="md"
            onClick={exportCsv}
            disabled={users.length === 0}
            className="flex items-center gap-2 rounded-2xl bg-white dark:bg-[#131926] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <svg className="h-4 w-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Export CSV</span>
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={() => fetchUsers(currentPage, searchQuery, roleFilter)}
            isLoading={isLoading}
            className="flex items-center gap-2 rounded-2xl bg-white dark:bg-[#131926] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <svg
              className={`h-4 w-4 ${isLoading ? 'animate-spin text-[#FF5B22]' : 'text-slate-500 dark:text-slate-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 px-4 py-3 text-sm text-rose-700 dark:text-rose-400">
          <span>{error}</span>
          <Button variant="secondary" size="sm" onClick={() => fetchUsers(currentPage, searchQuery, roleFilter)}>
            Retry
          </Button>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-[#131926] p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name or email address…"
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-[#FF5B22] focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-colors"
            />
          </div>

          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 overflow-x-auto">
            {(['ALL', 'CUSTOMER', 'ORGANIZER', 'ADMIN'] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => {
                  setRoleFilter(role);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  roleFilter === role
                    ? 'bg-[#FF5B22] text-white shadow-sm font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                {role === 'ALL' ? 'All Roles' : role}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-[#131926] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 dark:bg-slate-900/40 border-b border-slate-200/60 dark:border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Activity</th>
                <th className="px-6 py-4">Joined Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                      <span className="text-xs text-slate-400 font-mono">Loading user directory…</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg className="h-8 w-8 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">No users match query</span>
                      <span className="text-xs text-slate-400">Try adjusting your search terms or role filters.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                    {/* User info */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs shadow-sm">
                          {getUserInitials(user.name, user.email)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 dark:text-white truncate">
                            {user.name || 'Unnamed Account'}
                          </div>
                          <div className="text-xs text-slate-400 font-mono truncate">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-6 py-4">
                      <Badge
                        label={user.role}
                        variant={getRoleBadgeVariant(user.role)}
                      />
                    </td>

                    {/* Activity */}
                    <td className="px-6 py-4 text-xs font-mono">
                      {user.role === 'CUSTOMER' && (
                        <span className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <span className="text-[#FF5B22] font-black">{user._count?.bookings ?? 0}</span> bookings
                        </span>
                      )}
                      {user.role === 'ORGANIZER' && (
                        <span className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[#FF5B22] bg-orange-50 dark:bg-orange-950/30 border border-orange-200/60 dark:border-orange-500/20 font-semibold">
                          <span className="font-black">{user._count?.events ?? 0}</span> events
                        </span>
                      )}
                      {user.role === 'ADMIN' && (
                        <span className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-white bg-slate-900 dark:bg-slate-800 font-bold">
                          Admin Root
                        </span>
                      )}
                    </td>

                    {/* Joined Date */}
                    <td className="px-6 py-4 text-xs font-mono text-slate-500 dark:text-slate-400">
                      {formatDate(user.createdAt)}
                    </td>

                    {/* Action Buttons */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => fetchUserDetails(user.id)}
                          className="rounded-2xl bg-white dark:bg-[#161D2E] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-[#FF5B22]"
                        >
                          Details
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenRoleModal(user)}
                          className="rounded-2xl bg-white dark:bg-[#161D2E] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-orange-500/50"
                        >
                          Role
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Showing <span className="font-mono text-slate-900 dark:text-white font-bold">{users.length}</span> of{' '}
            <span className="font-mono text-slate-900 dark:text-white font-bold">{totalUsers}</span> users
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="rounded-2xl bg-white dark:bg-[#161D2E] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100"
            >
              Previous
            </Button>
            <span className="text-xs font-mono text-slate-600 dark:text-slate-400 px-2 font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-2xl bg-white dark:bg-[#161D2E] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* User Profile & Activity Drawer */}
      {drawerUserId && (
        <Modal
          isOpen={Boolean(drawerUserId)}
          onClose={() => setDrawerUserId(null)}
          title="User Account & Activity Profile"
        >
          {isLoadingDetails || !userDetails ? (
            <div className="py-12 text-center text-slate-400">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent mx-auto mb-2" />
              <span className="text-xs font-mono">Loading profile telemetry…</span>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Profile Card */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-base">
                      {userDetails.name || 'Unnamed Account'}
                    </div>
                    <div className="text-xs text-[#FF5B22] font-mono mt-0.5">
                      {userDetails.email}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge label={userDetails.role} variant={getRoleBadgeVariant(userDetails.role)} />
                    {userDetails.isSuspended && (
                      <Badge label="SUSPENDED" variant="error" />
                    )}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs border-t border-slate-200/60 dark:border-slate-800 pt-3 text-slate-500 dark:text-slate-400">
                  <div>Joined: <strong className="text-slate-800 dark:text-slate-200">{formatDate(userDetails.createdAt)}</strong></div>
                  <div>ID: <strong className="font-mono text-slate-800 dark:text-slate-200 truncate">{userDetails.id.slice(0, 8)}…</strong></div>
                </div>

                {userDetails.isSuspended && userDetails.suspensionReason && (
                  <div className="mt-2 text-xs text-rose-600 dark:text-rose-400 font-semibold">
                    Suspension reason: {userDetails.suspensionReason}
                  </div>
                )}
              </div>

              {/* Account Suspension Control */}
              {userDetails.role !== 'ADMIN' && (
                <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131926]">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Account Access Status
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {userDetails.isSuspended ? 'Account is currently suspended from purchases.' : 'Account is active in good standing.'}
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleToggleSuspend}
                    isLoading={isTogglingSuspend}
                    className={`rounded-xl text-xs font-bold ${
                      userDetails.isSuspended
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    {userDetails.isSuspended ? 'Reactivate Account' : 'Suspend Account'}
                  </Button>
                </div>
              )}

              {/* Recent Bookings Drill-Down */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Recent Ticket Bookings ({userDetails.bookings.length})
                </div>
                {userDetails.bookings.length === 0 ? (
                  <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 text-center text-xs text-slate-400">
                    No booking orders placed by this user yet.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {userDetails.bookings.map((b) => (
                      <div
                        key={b.id}
                        className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                            {b.eventTitle}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {b.tierName} · {b.quantity} pass · ${b.amount.toFixed(2)}
                          </div>
                        </div>
                        <Badge
                          label={b.status}
                          variant={b.status === 'PAID' ? 'success' : b.status === 'PENDING' ? 'warning' : 'error'}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Organized Events (if organizer) */}
              {userDetails.events.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Organized Events Catalog ({userDetails.events.length})
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {userDetails.events.map((e) => (
                      <div
                        key={e.id}
                        className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                            {e.title}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Capacity: {e.capacity} attendees
                          </div>
                        </div>
                        <Badge
                          label={e.status}
                          variant={e.status === 'PUBLISHED' ? 'success' : 'default'}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* Role Elevation Modal */}
      {selectedUser && (
        <Modal
          isOpen={Boolean(selectedUser)}
          onClose={handleCloseRoleModal}
          title="Change User Role"
        >
          <div className="space-y-5">
            {/* User Target Card */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4">
              <div className="text-xs font-semibold text-slate-400 mb-1">
                Target User
              </div>
              <div className="font-bold text-slate-900 dark:text-white text-base">
                {selectedUser.name || 'Unnamed User'}
              </div>
              <div className="text-xs text-[#FF5B22] font-mono mt-0.5 font-medium">
                {selectedUser.email}
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className="text-slate-500 dark:text-slate-400">Current Role:</span>
                <Badge
                  label={selectedUser.role}
                  variant={getRoleBadgeVariant(selectedUser.role)}
                />
              </div>
            </div>

            {/* Error Message */}
            {modalError && (
              <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 p-3 text-xs text-rose-700 dark:text-rose-400 font-medium">
                {modalError}
              </div>
            )}

            {/* Role Options */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-400 block">
                Select Role
              </label>

              {/* Customer */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  targetRole === 'CUSTOMER'
                    ? 'border-[#FF5B22] bg-orange-50/50 dark:bg-orange-500/10 text-slate-900 dark:text-white shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131926] hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="roleSelect"
                  value="CUSTOMER"
                  checked={targetRole === 'CUSTOMER'}
                  onChange={() => setTargetRole('CUSTOMER')}
                  className="mt-1 h-4 w-4 text-[#FF5B22] focus:ring-[#FF5B22]"
                />
                <div>
                  <div className="font-bold text-sm flex items-center gap-2 text-slate-900 dark:text-white">
                    <span>CUSTOMER</span>
                    <Badge label="Customer" variant="default" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Standard attendee access. Can browse events, purchase tickets, and view their passes.
                  </p>
                </div>
              </label>

              {/* Organizer */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  targetRole === 'ORGANIZER'
                    ? 'border-[#FF5B22] bg-orange-50/50 dark:bg-orange-500/10 text-slate-900 dark:text-white shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131926] hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="roleSelect"
                  value="ORGANIZER"
                  checked={targetRole === 'ORGANIZER'}
                  onChange={() => setTargetRole('ORGANIZER')}
                  className="mt-1 h-4 w-4 text-[#FF5B22] focus:ring-[#FF5B22]"
                />
                <div>
                  <div className="font-bold text-sm flex items-center gap-2 text-slate-900 dark:text-white">
                    <span>ORGANIZER</span>
                    <Badge label="Organizer" variant="success" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Event organizer access. Can create events, manage ticket tiers, and scan tickets at check-in.
                  </p>
                </div>
              </label>

              {/* Admin */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  targetRole === 'ADMIN'
                    ? 'border-[#FF5B22] bg-orange-50/50 dark:bg-orange-500/10 text-slate-900 dark:text-white shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131926] hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="roleSelect"
                  value="ADMIN"
                  checked={targetRole === 'ADMIN'}
                  onChange={() => setTargetRole('ADMIN')}
                  className="mt-1 h-4 w-4 text-[#FF5B22] focus:ring-[#FF5B22]"
                />
                <div>
                  <div className="font-bold text-sm flex items-center gap-2 text-slate-900 dark:text-white">
                    <span>ADMIN</span>
                    <Badge label="Admin" variant="info" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Platform administrator access. Can manage users, view all bookings, and inspect audit logs.
                  </p>
                </div>
              </label>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="secondary"
                size="md"
                onClick={handleCloseRoleModal}
                disabled={isSavingRole}
                className="rounded-2xl bg-white dark:bg-[#161D2E] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleSaveRole}
                isLoading={isSavingRole}
                className="rounded-2xl bg-[#FF5B22] text-white hover:bg-[#e04f1c] font-bold shadow-md shadow-orange-500/20"
              >
                Save Role
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default UserManagementView;
