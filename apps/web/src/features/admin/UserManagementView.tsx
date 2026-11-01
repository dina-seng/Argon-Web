import { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
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

  // Modal State
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [targetRole, setTargetRole] = useState<'CUSTOMER' | 'ORGANIZER' | 'ADMIN'>('ORGANIZER');
  const [isSavingRole, setIsSavingRole] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

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

      // Optimistic state update on real API success
      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, role: targetRole } : u))
      );

      setToastMessage({
        type: 'success',
        text: `Role for ${selectedUser.email} successfully updated to ${targetRole}.`,
      });
      handleCloseRoleModal();
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to update user role. Please try again.';
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

  return (
    <div className="space-y-6 animate-fade-in text-white pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 shadow-2xl transition-all ${
            toastMessage.type === 'success'
              ? 'border-emerald-500/30 bg-surface-card text-emerald-400'
              : 'border-rose-500/30 bg-surface-card text-rose-400'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
          <span className="text-sm font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-white">
              User Directory & Permissions
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              {totalUsers} Registered
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-400">
            Audit system user accounts, elevate organizer permissions, and regulate access control.
          </p>
        </div>

        <Button
          variant="secondary"
          size="md"
          onClick={() => fetchUsers(currentPage, searchQuery, roleFilter)}
          isLoading={isLoading}
          className="flex items-center gap-2 self-start sm:self-auto"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>Refresh List</span>
        </Button>
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 shrink-0 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              <strong>API Error:</strong> {error}
            </span>
          </div>
          <Button variant="secondary" size="sm" onClick={() => fetchUsers(currentPage, searchQuery, roleFilter)}>
            Retry
          </Button>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
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
              className="w-full rounded-xl border border-white/10 bg-surface-elevated pl-10 pr-4 py-2 text-sm text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-elevated border border-white/5 overflow-x-auto">
            {(['ALL', 'CUSTOMER', 'ORGANIZER', 'ADMIN'] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => {
                  setRoleFilter(role);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  roleFilter === role
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {role === 'ALL' ? 'All Roles' : role}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-elevated/70 border-b border-white/10 text-xs font-mono uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-6 py-3.5">User</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Joined Date</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
                      <span className="text-xs text-gray-400 font-mono">Loading user directory…</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg className="h-8 w-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      <span className="font-medium text-white">No users match query</span>
                      <span className="text-xs text-gray-400">
                        Try adjusting your search terms or role filters.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    {/* User info */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-300 font-mono text-xs font-bold">
                          {getUserInitials(user.name, user.email)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate">
                            {user.name || 'Unnamed Account'}
                          </div>
                          <div className="text-xs text-gray-400 font-mono truncate">
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
                        className="font-mono text-[11px]"
                      />
                    </td>

                    {/* Joined Date */}
                    <td className="px-6 py-4 text-xs font-mono text-gray-300">
                      {formatDate(user.createdAt)}
                    </td>

                    {/* Action Button */}
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenRoleModal(user)}
                        className="font-medium hover:border-indigo-500/40"
                      >
                        Change Role
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t border-white/10 px-6 py-3.5 bg-surface-elevated/30">
          <div className="text-xs text-gray-400">
            Showing <span className="font-mono text-white font-medium">{users.length}</span> of{' '}
            <span className="font-mono text-white font-medium">{totalUsers}</span> users
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-xs font-mono text-gray-300 px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* Role Elevation Modal */}
      {selectedUser && (
        <Modal
          isOpen={Boolean(selectedUser)}
          onClose={handleCloseRoleModal}
          title="Elevate or Modify User Role"
        >
          <div className="space-y-5">
            {/* User Target Card */}
            <div className="rounded-xl border border-white/10 bg-surface-elevated/70 p-4">
              <div className="text-xs font-mono uppercase tracking-wider text-gray-400 mb-1">
                Target User
              </div>
              <div className="font-semibold text-white text-base">
                {selectedUser.name || 'Unnamed User'}
              </div>
              <div className="text-xs text-indigo-400 font-mono mt-0.5">
                {selectedUser.email}
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className="text-gray-400">Current Assigned Role:</span>
                <Badge
                  label={selectedUser.role}
                  variant={getRoleBadgeVariant(selectedUser.role)}
                />
              </div>
            </div>

            {/* Error Message */}
            {modalError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                {modalError}
              </div>
            )}

            {/* Role Options */}
            <div className="space-y-3">
              <label className="text-xs font-mono uppercase tracking-wider text-gray-400 block">
                Select New Access Level
              </label>

              {/* Customer */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  targetRole === 'CUSTOMER'
                    ? 'border-indigo-500/60 bg-indigo-500/10 text-white'
                    : 'border-white/10 bg-surface-card hover:bg-surface-elevated text-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="roleSelect"
                  value="CUSTOMER"
                  checked={targetRole === 'CUSTOMER'}
                  onChange={() => setTargetRole('CUSTOMER')}
                  className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="font-semibold text-sm flex items-center gap-2">
                    <span>CUSTOMER</span>
                    <Badge label="Standard" variant="default" />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Standard attendee access. Can discover events, purchase tickets, view personal passes, and initiate checkouts.
                  </p>
                </div>
              </label>

              {/* Organizer */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  targetRole === 'ORGANIZER'
                    ? 'border-emerald-500/60 bg-emerald-500/10 text-white'
                    : 'border-white/10 bg-surface-card hover:bg-surface-elevated text-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="roleSelect"
                  value="ORGANIZER"
                  checked={targetRole === 'ORGANIZER'}
                  onChange={() => setTargetRole('ORGANIZER')}
                  className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="font-semibold text-sm flex items-center gap-2">
                    <span>ORGANIZER</span>
                    <Badge label="Elevated" variant="success" />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Event creator privileges. Can create events, configure ticket tiers & quotas, view attendee rosters, and scan QR passes.
                  </p>
                </div>
              </label>

              {/* Admin */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  targetRole === 'ADMIN'
                    ? 'border-purple-500/60 bg-purple-500/10 text-white'
                    : 'border-white/10 bg-surface-card hover:bg-surface-elevated text-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="roleSelect"
                  value="ADMIN"
                  checked={targetRole === 'ADMIN'}
                  onChange={() => setTargetRole('ADMIN')}
                  className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <div className="font-semibold text-sm flex items-center gap-2">
                    <span>ADMIN</span>
                    <Badge label="Full Platform Root" variant="info" />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Super-Administrator. Full platform governance, user role modification, transaction overrides, and audit log inspection.
                  </p>
                </div>
              </label>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <Button
                variant="secondary"
                size="md"
                onClick={handleCloseRoleModal}
                disabled={isSavingRole}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleSaveRole}
                isLoading={isSavingRole}
              >
                Save Role Assignment
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default UserManagementView;
