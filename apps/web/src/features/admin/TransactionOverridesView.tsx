import { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { api } from '../../lib/api';

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
}

export interface TransactionOverridesViewProps {
  initialStatusFilter?: 'ALL' | 'PENDING' | 'PAID' | 'REFUNDED';
}

export function TransactionOverridesView({
  initialStatusFilter = 'ALL',
}: TransactionOverridesViewProps) {
  const [bookings, setBookings] = useState<AdminBookingItem[]>([]);
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
      const query = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
      let res: { bookings: any[]; total: number };
      try {
        res = await api.get<{ bookings: any[]; total: number }>(`/api/v1/admin/bookings${query}`);
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('404')) {
          res = await api.get<{ bookings: any[]; total: number }>(`/admin/bookings${query}`);
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
        paymentRef: b.paymentRef ?? 'PENDING_KHQR',
        status: b.status,
        createdAt: typeof b.createdAt === 'string' ? b.createdAt : new Date(b.createdAt).toISOString(),
        notes: b.notes,
      }));

      setBookings(mapped);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load bookings queue.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

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

      // Update local state
      setBookings((prev) =>
        prev.map((b) => (b.id === confirmModalBooking.id ? { ...b, status: 'PAID' } : b))
      );
      setToastMessage({
        type: 'success',
        text: `Booking #${confirmModalBooking.id.slice(0, 8)} successfully FORCE-CONFIRMED. Tickets generated.`,
      });
      setConfirmModalBooking(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to force-confirm booking.';
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

      // Update local state
      setBookings((prev) =>
        prev.map((b) => (b.id === refundModalBooking.id ? { ...b, status: 'REFUNDED' } : b))
      );
      setToastMessage({
        type: 'success',
        text: `Booking #${refundModalBooking.id.slice(0, 8)} successfully REFUNDED. Tickets revoked and tier quota restored.`,
      });
      setRefundModalBooking(null);
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

  const filteredBookings = bookings.filter((b) => {
    if (statusFilter !== 'ALL' && b.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return (
        b.id.toLowerCase().includes(q) ||
        b.customerName.toLowerCase().includes(q) ||
        b.customerEmail.toLowerCase().includes(q) ||
        b.paymentRef.toLowerCase().includes(q) ||
        b.eventTitle.toLowerCase().includes(q)
      );
    }
    return true;
  });

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
              Transaction Overrides & Incident Runbook
            </h1>
            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                {pendingCount} Stuck / Pending
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-400">
            Emergency administrative tool for disputed payments, dropped Bakong webhooks, and manual settlement.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={() => fetchBookings()}
            isLoading={isLoading}
            className="flex items-center gap-2"
          >
            <svg
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>Reload Queue</span>
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
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

      {/* Operational Runbook Guidance Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Force Confirm SOP */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold uppercase tracking-wider font-mono">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Runbook: When to Force-Confirm</span>
          </div>
          <p className="text-gray-300 leading-relaxed">
            Use when a buyer confirms payment deduction in their banking app (e.g. ABA / Wing Bakong KHQR)
            but network jitter or a webhook timeout left the booking in <code>PENDING</code>. This immediately
            transitions the booking to <code>PAID</code>, provisions cryptographic QR tickets, and increments tier capacity.
          </p>
        </div>

        {/* Refund SOP */}
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-xs space-y-1.5">
          <div className="flex items-center gap-2 text-rose-400 font-semibold uppercase tracking-wider font-mono">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Runbook: When to Refund</span>
          </div>
          <p className="text-gray-300 leading-relaxed">
            Use for disputed charges, accidental duplicate checkout, or organizer event cancellations.
            This transitions the booking to <code>REFUNDED</code>, marks associated tickets as <code>REVOKED</code>,
            and decrements tier <code>soldCount</code> to return the capacity back into the available pool.
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          {/* Search Input */}
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
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Booking ID, customer email, or KHQR ref…"
              className="w-full rounded-xl border border-white/10 bg-surface-elevated pl-10 pr-4 py-2 text-sm text-white placeholder-gray-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-elevated border border-white/5 overflow-x-auto">
            {(['ALL', 'PENDING', 'PAID', 'REFUNDED'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {status === 'ALL' ? 'All Transactions' : status}
                {status === 'PENDING' && pendingCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-amber-400/20 px-1.5 py-0.2 text-[10px] text-amber-300">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Bookings Incident Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-elevated/70 border-b border-white/10 text-xs font-mono uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-6 py-3.5">Booking / Reference</th>
                <th className="px-6 py-3.5">Customer & Event</th>
                <th className="px-6 py-3.5">Amount ($ USD)</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Emergency Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                      <span className="text-xs text-gray-400 font-mono">Loading incident ledger queue…</span>
                    </div>
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg className="h-8 w-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="font-medium text-white">No transactions match filter</span>
                      <span className="text-xs text-gray-400">Queue is healthy and clear.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Booking ID & Payment Ref */}
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs font-semibold text-white">
                        #{b.id.slice(0, 13)}…
                      </div>
                      <div className="font-mono text-[11px] text-gray-400 mt-0.5">
                        Ref: {b.paymentRef}
                      </div>
                      {b.notes && (
                        <div className="text-[11px] text-amber-400/90 mt-1 max-w-xs truncate">
                          {b.notes}
                        </div>
                      )}
                    </td>

                    {/* Customer & Event */}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{b.customerName}</div>
                      <div className="text-xs text-gray-400 font-mono">{b.customerEmail}</div>
                      <div className="text-xs text-gray-300 mt-1">
                        <span className="text-indigo-400 font-medium">{b.eventTitle}</span> • {b.tierName} (x{b.quantity})
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="px-6 py-4 font-mono font-semibold text-white">
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
                        {b.status === 'PENDING' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setConfirmModalBooking(b)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                          >
                            Force Confirm
                          </Button>
                        )}

                        {b.status === 'PAID' && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setRefundModalBooking(b)}
                            className="font-semibold"
                          >
                            Refund
                          </Button>
                        )}

                        {b.status === 'REFUNDED' && (
                          <span className="text-xs font-mono text-gray-400">
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
      </Card>

      {/* Force Confirm Confirmation Modal */}
      {confirmModalBooking && (
        <Modal
          isOpen={Boolean(confirmModalBooking)}
          onClose={() => setConfirmModalBooking(null)}
          title="Force-Confirm Stuck Booking"
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold mb-1">
                Resolution Action: Force-Confirm
              </div>
              <p className="text-xs text-gray-200 leading-relaxed">
                You are about to manually force-confirm booking{' '}
                <strong className="text-white font-mono">#{confirmModalBooking.id}</strong> for{' '}
                <strong className="text-white">{confirmModalBooking.customerName}</strong> (
                {confirmModalBooking.customerEmail}).
              </p>
            </div>

            <div className="space-y-2 text-xs text-gray-300 bg-surface-elevated/60 p-4 rounded-xl border border-white/5">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400">Event:</span>
                <span className="font-semibold text-white">{confirmModalBooking.eventTitle}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400">Tier & Quantity:</span>
                <span className="font-semibold text-white">
                  {confirmModalBooking.tierName} (x{confirmModalBooking.quantity})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400">Settlement Amount:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {formatCurrency(confirmModalBooking.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-400">Payment Reference:</span>
                <span className="font-mono text-gray-300">{confirmModalBooking.paymentRef}</span>
              </div>
            </div>

            <p className="text-xs text-amber-300/90 leading-relaxed">
              <strong>Caution:</strong> This will generate valid active tickets with cryptographic QR tokens
              and increment the tier quota. Ensure the payment transfer has been verified on NBC Bakong.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setConfirmModalBooking(null)}
                disabled={isForceConfirming}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleForceConfirm}
                isLoading={isForceConfirming}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                Confirm & Provision Tickets
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
          title="Emergency Transaction Refund"
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
              <div className="text-xs font-mono uppercase tracking-wider text-rose-400 font-semibold mb-1">
                Resolution Action: Refund & Revoke
              </div>
              <p className="text-xs text-gray-200 leading-relaxed">
                You are about to refund booking{' '}
                <strong className="text-white font-mono">#{refundModalBooking.id}</strong> for{' '}
                <strong className="text-white">{refundModalBooking.customerName}</strong>.
              </p>
            </div>

            <div className="space-y-2 text-xs text-gray-300 bg-surface-elevated/60 p-4 rounded-xl border border-white/5">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400">Event:</span>
                <span className="font-semibold text-white">{refundModalBooking.eventTitle}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400">Refund Amount:</span>
                <span className="font-mono font-bold text-rose-400">
                  {formatCurrency(refundModalBooking.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-400">Impact:</span>
                <span className="text-rose-300 font-medium">
                  Revoke {refundModalBooking.quantity} ticket(s) & restore tier capacity
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              All issued QR passes associated with this booking will be invalidated immediately at
              gate check-in scanners.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setRefundModalBooking(null)}
                disabled={isRefunding}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={handleRefund}
                isLoading={isRefunding}
              >
                Process Refund & Invalidate Passes
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default TransactionOverridesView;
