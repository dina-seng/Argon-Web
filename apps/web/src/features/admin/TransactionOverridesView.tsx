import { useState, useEffect, useCallback } from 'react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { api } from '../../lib/api';

export interface AdminTicketItem {
  id: string;
  qrToken?: string;
  status: 'ACTIVE' | 'CHECKED_IN' | 'REVOKED';
  checkedInAt?: string | null;
  checkedInBy?: string | null;
}

export interface AdminBookingItem {
  id: string;
  customerName: string;
  customerEmail: string;
  eventTitle: string;
  tierName: string;
  quantity: number;
  totalAmount: number;
  paymentRef: string;
  status: 'PENDING' | 'PAID' | 'REFUNDED' | 'CANCELLED';
  createdAt: string;
  notes?: string;
  tickets?: AdminTicketItem[];
}

export interface TransactionOverridesViewProps {
  initialStatusFilter?: 'ALL' | 'PENDING' | 'PAID' | 'REFUNDED';
}

export function TransactionOverridesView({
  initialStatusFilter = 'ALL',
}: TransactionOverridesViewProps) {
  const [bookings, setBookings] = useState<AdminBookingItem[]>([]);
  const [totalBookings, setTotalBookings] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const pageSize = 10;
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PAID' | 'REFUNDED'>(
    initialStatusFilter
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State for Force Confirm
  const [confirmModalBooking, setConfirmModalBooking] = useState<AdminBookingItem | null>(null);
  const [isForceConfirming, setIsForceConfirming] = useState<boolean>(false);

  // Modal State for Refund
  const [refundModalBooking, setRefundModalBooking] = useState<AdminBookingItem | null>(null);
  const [isRefunding, setIsRefunding] = useState<boolean>(false);

  // Drawer / Modal State for Ticket Inspection
  const [ticketModalBooking, setTicketModalBooking] = useState<AdminBookingItem | null>(null);
  const [isOverridingTicketId, setIsOverridingTicketId] = useState<string | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('page', String(currentPage));
      queryParams.set('limit', String(pageSize));
      if (statusFilter !== 'ALL') queryParams.set('status', statusFilter);
      if (searchQuery.trim()) queryParams.set('search', searchQuery.trim());

      const queryStr = `?${queryParams.toString()}`;

      let res: { bookings: any[]; total: number };
      try {
        res = await api.get<{ bookings: any[]; total: number }>(`/api/v1/admin/bookings${queryStr}`);
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('404')) {
          res = await api.get<{ bookings: any[]; total: number }>(`/admin/bookings${queryStr}`);
        } else {
          throw err;
        }
      }

      const list = Array.isArray(res.bookings) ? res.bookings : [];
      const mapped: AdminBookingItem[] = list.map((b: any) => ({
        id: b.id,
        customerName: b.customerName ?? b.user?.name ?? b.user?.email?.split('@')[0] ?? 'Attendee',
        customerEmail: b.customerEmail ?? b.user?.email ?? '',
        eventTitle: b.eventTitle ?? b.event?.title ?? 'Event',
        tierName: b.tierName ?? b.tier?.name ?? 'Standard Pass',
        quantity: b.quantity ?? 1,
        totalAmount: Number(b.totalAmount ?? 0),
        paymentRef: b.paymentRef ?? b.paymentReference ?? 'PENDING_KHQR',
        status: b.status,
        createdAt: typeof b.createdAt === 'string' ? b.createdAt : new Date(b.createdAt).toISOString(),
        notes: b.notes,
        tickets: Array.isArray(b.tickets) ? b.tickets : [],
      }));

      setBookings(mapped);
      const totalCount = typeof res.total === 'number' ? res.total : mapped.length;
      setTotalBookings(totalCount);
      setTotalPages(Math.max(1, Math.ceil(totalCount / pageSize)));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load bookings.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, statusFilter, searchQuery]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Reset to page 1 when search or status filter changes
  const handleStatusFilterChange = (status: 'ALL' | 'PENDING' | 'PAID' | 'REFUNDED') => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleForceConfirm = async () => {
    if (!confirmModalBooking) return;
    setIsForceConfirming(true);

    try {
      try {
        await api.post(`/api/v1/admin/bookings/${confirmModalBooking.id}/force-confirm`);
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('404')) {
          await api.post(`/admin/bookings/${confirmModalBooking.id}/force-confirm`);
        } else {
          throw err;
        }
      }

      setBookings((prev) =>
        prev.map((b) => (b.id === confirmModalBooking.id ? { ...b, status: 'PAID' } : b))
      );
      setToastMessage({
        type: 'success',
        text: `Booking #${confirmModalBooking.id.slice(0, 8)} payment confirmed. Tickets generated.`,
      });
      setConfirmModalBooking(null);
      fetchBookings();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to confirm booking payment.';
      setToastMessage({
        type: 'error',
        text: msg,
      });
    } finally {
      setIsForceConfirming(false);
    }
  };

  const handleRefund = async () => {
    if (!refundModalBooking) return;
    setIsRefunding(true);

    try {
      try {
        await api.post(`/api/v1/admin/bookings/${refundModalBooking.id}/refund`);
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('404')) {
          await api.post(`/admin/bookings/${refundModalBooking.id}/refund`);
        } else {
          throw err;
        }
      }

      setBookings((prev) =>
        prev.map((b) => (b.id === refundModalBooking.id ? { ...b, status: 'REFUNDED' } : b))
      );
      setToastMessage({
        type: 'success',
        text: `Booking #${refundModalBooking.id.slice(0, 8)} refunded. Tickets revoked and quota restored.`,
      });
      setRefundModalBooking(null);
      fetchBookings();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to refund booking.';
      setToastMessage({
        type: 'error',
        text: msg,
      });
    } finally {
      setIsRefunding(false);
    }
  };

  const handleManualCheckInOverride = async (ticketId: string) => {
    setIsOverridingTicketId(ticketId);
    try {
      let updatedTicket: AdminTicketItem | null = null;
      try {
        updatedTicket = await api.post<AdminTicketItem>(`/api/v1/admin/tickets/${ticketId}/check-in-override`);
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('404')) {
          updatedTicket = await api.post<AdminTicketItem>(`/admin/tickets/${ticketId}/check-in-override`);
        } else {
          throw err;
        }
      }

      // Update in ticket modal
      if (ticketModalBooking) {
        setTicketModalBooking({
          ...ticketModalBooking,
          tickets: (ticketModalBooking.tickets ?? []).map((t) =>
            t.id === ticketId
              ? { ...t, status: 'CHECKED_IN', checkedInAt: updatedTicket?.checkedInAt || new Date().toISOString() }
              : t
          ),
        });
      }

      // Update in main bookings list
      setBookings((prev) =>
        prev.map((b) => ({
          ...b,
          tickets: (b.tickets ?? []).map((t) =>
            t.id === ticketId ? { ...t, status: 'CHECKED_IN', checkedInAt: new Date().toISOString() } : t
          ),
        }))
      );

      setToastMessage({
        type: 'success',
        text: `Ticket #${ticketId.slice(0, 8)} checked in manually.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to check in ticket.';
      setToastMessage({
        type: 'error',
        text: msg,
      });
    } finally {
      setIsOverridingTicketId(null);
    }
  };

  const handleExportCSV = () => {
    if (bookings.length === 0) return;

    const headers = [
      'Booking ID',
      'Payment Reference',
      'Status',
      'Customer Name',
      'Customer Email',
      'Event Title',
      'Tier Name',
      'Quantity',
      'Total Amount ($ USD)',
      'Created At',
    ];

    const rows = bookings.map((b) => [
      `"${b.id}"`,
      `"${b.paymentRef}"`,
      b.status,
      `"${b.customerName.replace(/"/g, '""')}"`,
      `"${b.customerEmail}"`,
      `"${b.eventTitle.replace(/"/g, '""')}"`,
      `"${b.tierName.replace(/"/g, '""')}"`,
      b.quantity,
      b.totalAmount.toFixed(2),
      `"${new Date(b.createdAt).toLocaleString()}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `argon_bookings_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusBadgeVariant = (status: AdminBookingItem['status']) => {
    switch (status) {
      case 'PAID':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'REFUNDED':
        return 'error';
      case 'CANCELLED':
      default:
        return 'default';
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const pendingCount = bookings.filter((b) => b.status === 'PENDING').length;

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
              Bookings & Orders
            </h1>
            {pendingCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                {pendingCount} Pending
              </span>
            )}
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            View customer bookings, confirm pending payments manually, inspect issued tickets, and issue refunds.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={handleExportCSV}
            disabled={bookings.length === 0}
            className="flex items-center gap-2 rounded-2xl bg-white dark:bg-[#131926] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <svg className="h-4 w-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export CSV</span>
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={() => fetchBookings()}
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

      {/* Error Alert */}
      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 px-4 py-3 text-sm text-rose-700 dark:text-rose-400">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 shrink-0 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={() => fetchBookings()}>
            Retry
          </Button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-[#131926] p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by Booking ID, email, payment ref, or QR token…"
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-[#FF5B22] focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-colors"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 overflow-x-auto">
            {(['ALL', 'PENDING', 'PAID', 'REFUNDED'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => handleStatusFilterChange(status)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-[#FF5B22] text-white shadow-sm font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
                }`}
              >
                {status === 'ALL' ? 'All Bookings' : status}
                {status === 'PENDING' && pendingCount > 0 && (
                  <span className="ml-1.5 rounded bg-white/20 px-1.5 py-0.2 text-[10px] font-bold">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-[#131926] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 dark:bg-slate-900/40 border-b border-slate-200/60 dark:border-slate-800 text-xs font-mono uppercase tracking-wider text-slate-400 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4 font-semibold">Booking / Reference</th>
                <th className="px-6 py-4 font-semibold">Customer & Event</th>
                <th className="px-6 py-4 font-semibold">Amount ($ USD)</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                      <span className="text-xs text-slate-400 font-mono">Loading transaction ledger…</span>
                    </div>
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg className="h-8 w-8 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">No bookings match filter</span>
                      <span className="text-xs text-slate-400">Try searching with a broader query.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Booking ID & Payment Ref */}
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                        #{b.id.slice(0, 13)}…
                      </div>
                      <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                        Ref: {b.paymentRef}
                      </div>
                      {b.tickets && b.tickets.length > 0 && (
                        <div className="mt-1 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setTicketModalBooking(b)}
                            className="text-[11px] font-mono text-[#FF5B22] hover:underline"
                          >
                            {b.tickets.length} ticket(s) issued →
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Customer & Event */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 dark:text-white">{b.customerName}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">{b.customerEmail}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                        <span className="text-[#FF5B22] font-semibold">{b.eventTitle}</span> • {b.tierName} (x{b.quantity})
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(b.totalAmount)}
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4">
                      <Badge
                        label={b.status}
                        variant={getStatusBadgeVariant(b.status)}
                        className="font-mono text-[11px]"
                      />
                    </td>

                    {/* Action Buttons */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {b.tickets && b.tickets.length > 0 && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setTicketModalBooking(b)}
                            className="rounded-xl bg-white dark:bg-[#161D2E] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs"
                          >
                            Tickets
                          </Button>
                        )}

                        {b.status === 'PENDING' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setConfirmModalBooking(b)}
                            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm"
                          >
                            Confirm Payment
                          </Button>
                        )}

                        {b.status === 'PAID' && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setRefundModalBooking(b)}
                            className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-sm"
                          >
                            Refund
                          </Button>
                        )}

                        {b.status === 'REFUNDED' && (
                          <span className="text-xs font-mono text-slate-400">
                            Archived
                          </span>
                        )}
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
            Showing <span className="font-mono text-slate-900 dark:text-white font-bold">{bookings.length}</span> of{' '}
            <span className="font-mono text-slate-900 dark:text-white font-bold">{totalBookings}</span> bookings
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

      {/* Ticket Inspector Modal */}
      {ticketModalBooking && (
        <Modal
          isOpen={Boolean(ticketModalBooking)}
          onClose={() => setTicketModalBooking(null)}
          title={`Issued Tickets for Booking #${ticketModalBooking.id.slice(0, 8)}`}
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4">
              <div className="font-bold text-slate-900 dark:text-white text-base">
                {ticketModalBooking.eventTitle}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Attendee: <span className="text-slate-900 dark:text-white font-semibold">{ticketModalBooking.customerName}</span> (
                {ticketModalBooking.customerEmail})
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tier: <span className="text-[#FF5B22] font-semibold">{ticketModalBooking.tierName}</span> (x
                {ticketModalBooking.quantity})
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                Tickets ({ticketModalBooking.tickets?.length ?? 0})
              </div>

              {ticketModalBooking.tickets?.map((t, idx) => (
                <div
                  key={t.id}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131926] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                        Ticket #{idx + 1}
                      </span>
                      <Badge
                        label={t.status}
                        variant={
                          t.status === 'ACTIVE'
                            ? 'success'
                            : t.status === 'CHECKED_IN'
                            ? 'info'
                            : 'error'
                        }
                        className="font-mono text-[10px]"
                      />
                    </div>
                    {t.qrToken && (
                      <div className="font-mono text-[11px] text-slate-600 dark:text-slate-300 break-all select-all bg-slate-50 dark:bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800">
                        Token: {t.qrToken}
                      </div>
                    )}
                    {t.checkedInAt && (
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                        <span>Checked in at {new Date(t.checkedInAt).toLocaleTimeString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0">
                    {t.status === 'ACTIVE' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleManualCheckInOverride(t.id)}
                        isLoading={isOverridingTicketId === t.id}
                        className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 font-bold text-xs"
                      >
                        Override Check-In
                      </Button>
                    )}
                    {t.status === 'CHECKED_IN' && (
                      <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        Admitted
                      </span>
                    )}
                    {t.status === 'REVOKED' && (
                      <span className="text-xs font-mono text-rose-500 font-bold">
                        Revoked
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setTicketModalBooking(null)}
                className="rounded-2xl bg-white dark:bg-[#161D2E] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Force Confirm Confirmation Modal */}
      {confirmModalBooking && (
        <Modal
          isOpen={Boolean(confirmModalBooking)}
          onClose={() => setConfirmModalBooking(null)}
          title="Confirm Booking Payment"
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4">
              <div className="text-xs font-mono uppercase tracking-wider text-emerald-800 dark:text-emerald-400 font-bold mb-1">
                Confirm Payment
              </div>
              <p className="text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed font-medium">
                You are confirming payment for booking{' '}
                <strong className="text-emerald-900 dark:text-emerald-100 font-mono">#{confirmModalBooking.id}</strong> for{' '}
                <strong className="text-emerald-900 dark:text-emerald-100">{confirmModalBooking.customerName}</strong> (
                {confirmModalBooking.customerEmail}).
              </p>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Event:</span>
                <span className="font-bold text-slate-900 dark:text-white">{confirmModalBooking.eventTitle}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Tier & Quantity:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {confirmModalBooking.tierName} (x{confirmModalBooking.quantity})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Settlement Amount:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(confirmModalBooking.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Payment Reference:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{confirmModalBooking.paymentRef}</span>
              </div>
            </div>

            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed font-medium">
              This will mark the booking as paid and generate active tickets for the customer.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setConfirmModalBooking(null)}
                disabled={isForceConfirming}
                className="rounded-2xl bg-white dark:bg-[#161D2E] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleForceConfirm}
                isLoading={isForceConfirming}
                className="rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-600/20"
              >
                Confirm Booking
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Refund Confirmation Modal */}
      {refundModalBooking && (
        <Modal
          isOpen={Boolean(refundModalBooking)}
          onClose={() => setRefundModalBooking(null)}
          title="Refund Booking"
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 p-4">
              <div className="text-xs font-mono uppercase tracking-wider text-rose-800 dark:text-rose-400 font-bold mb-1">
                Refund Booking
              </div>
              <p className="text-xs text-rose-950 dark:text-rose-200 leading-relaxed font-medium">
                You are about to refund booking{' '}
                <strong className="text-rose-900 dark:text-rose-100 font-mono">#{refundModalBooking.id}</strong> for{' '}
                <strong className="text-rose-900 dark:text-rose-100">{refundModalBooking.customerName}</strong>.
              </p>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Event:</span>
                <span className="font-bold text-slate-900 dark:text-white">{refundModalBooking.eventTitle}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Refund Amount:</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  {formatCurrency(refundModalBooking.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Impact:</span>
                <span className="text-rose-700 dark:text-rose-400 font-bold">
                  Cancel {refundModalBooking.quantity} ticket(s) and restore tier capacity
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              All tickets associated with this booking will be cancelled immediately.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setRefundModalBooking(null)}
                disabled={isRefunding}
                className="rounded-2xl bg-white dark:bg-[#161D2E] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={handleRefund}
                isLoading={isRefunding}
                className="rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-md shadow-rose-600/20"
              >
                Confirm Refund
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default TransactionOverridesView;
