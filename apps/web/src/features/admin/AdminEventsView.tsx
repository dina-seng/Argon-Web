import { useState, useEffect, useCallback } from 'react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { api } from '../../lib/api';

export interface AdminEventTier {
  id: string;
  name: string;
  price: number;
  capacity: number;
  soldCount: number;
  reservedCount: number;
}

export interface AdminEventItem {
  id: string;
  title: string;
  description: string;
  venue: string;
  startsAt: string;
  status: 'PUBLISHED' | 'DRAFT' | 'CANCELLED' | 'COMPLETED';
  category: string;
  coverImageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  organizer: {
    id: string;
    name: string;
    email: string;
  };
  tiers: AdminEventTier[];
  totalCapacity: number;
  totalSold: number;
  grossRevenue: number;
  bookingsCount: number;
}

export interface PaginatedEventsResponse {
  data: AdminEventItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function AdminEventsView() {
  const [events, setEvents] = useState<AdminEventItem[]>([]);
  const [totalEvents, setTotalEvents] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT' | 'CANCELLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Status Modal State
  const [selectedEvent, setSelectedEvent] = useState<AdminEventItem | null>(null);
  const [targetStatus, setTargetStatus] = useState<'PUBLISHED' | 'DRAFT' | 'CANCELLED'>('PUBLISHED');
  const [moderationReason, setModerationReason] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
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

  const fetchEvents = useCallback(async (page: number, status: string, search: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '10');
      if (status !== 'ALL') params.set('status', status);
      if (search.trim()) params.set('search', search.trim());

      let res: PaginatedEventsResponse;
      try {
        res = await api.get<PaginatedEventsResponse>(`/api/v1/admin/events?${params.toString()}`);
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('404')) {
          res = await api.get<PaginatedEventsResponse>(`/admin/events?${params.toString()}`);
        } else {
          throw err;
        }
      }

      if (res && Array.isArray(res.data)) {
        setEvents(res.data);
        setTotalEvents(res.total);
        setCurrentPage(res.page);
        setTotalPages(res.totalPages || Math.ceil(res.total / 10) || 1);
      } else {
        throw new Error('Invalid events response structure');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve event directory.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents(currentPage, statusFilter, searchQuery);
  }, [currentPage, statusFilter, searchQuery, fetchEvents]);

  const handleOpenStatusModal = (evt: AdminEventItem) => {
    setSelectedEvent(evt);
    setTargetStatus(
      evt.status === 'CANCELLED' ? 'DRAFT' : (evt.status as 'PUBLISHED' | 'DRAFT' | 'CANCELLED')
    );
    setModerationReason('');
    setModalError(null);
  };

  const handleSaveStatus = async () => {
    if (!selectedEvent) return;
    setIsUpdatingStatus(true);
    setModalError(null);

    try {
      let updated: AdminEventItem;
      try {
        updated = await api.patch<AdminEventItem>(`/api/v1/admin/events/${selectedEvent.id}/status`, {
          status: targetStatus,
          reason: moderationReason.trim() || undefined,
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('404')) {
          updated = await api.patch<AdminEventItem>(`/admin/events/${selectedEvent.id}/status`, {
            status: targetStatus,
            reason: moderationReason.trim() || undefined,
          });
        } else {
          throw err;
        }
      }

      setEvents((prev) =>
        prev.map((e) => (e.id === selectedEvent.id ? { ...e, status: updated.status } : e))
      );

      setToastMessage({
        type: 'success',
        text: `Event "${selectedEvent.title}" status changed to ${targetStatus}.`,
      });
      setSelectedEvent(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update event status.';
      setModalError(msg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleExportCSV = () => {
    if (events.length === 0) return;

    const headers = [
      'ID',
      'Title',
      'Status',
      'Category',
      'Venue',
      'Starts At',
      'Organizer Name',
      'Organizer Email',
      'Total Capacity',
      'Total Sold',
      'Gross Revenue ($ USD)',
    ];

    const rows = events.map((e) => [
      `"${e.id}"`,
      `"${e.title.replace(/"/g, '""')}"`,
      e.status,
      e.category,
      `"${e.venue.replace(/"/g, '""')}"`,
      `"${new Date(e.startsAt).toLocaleString()}"`,
      `"${(e.organizer?.name ?? '').replace(/"/g, '""')}"`,
      `"${e.organizer?.email ?? ''}"`,
      e.totalCapacity,
      e.totalSold,
      e.grossRevenue.toFixed(2),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `argon_events_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const getStatusBadgeVariant = (status: AdminEventItem['status']) => {
    switch (status) {
      case 'PUBLISHED':
        return 'success';
      case 'DRAFT':
        return 'warning';
      case 'CANCELLED':
        return 'error';
      case 'COMPLETED':
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100 pb-16">
      {/* Toast Feedback */}
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
              Event Moderation
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border border-orange-200 dark:border-orange-900/60 bg-orange-50 dark:bg-orange-950/40 text-[#FF5B22]">
              {totalEvents} Total Events
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Oversee events across all organizers, review ticket quotas, and manage publication statuses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={handleExportCSV}
            disabled={events.length === 0}
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
            onClick={() => fetchEvents(currentPage, statusFilter, searchQuery)}
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
          <span>{error}</span>
          <Button variant="secondary" size="sm" onClick={() => fetchEvents(currentPage, statusFilter, searchQuery)}>
            Retry
          </Button>
        </div>
      )}

      {/* Filter and Search Bar */}
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
              placeholder="Search by event title, venue, or organizer…"
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-[#FF5B22] focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-colors"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 overflow-x-auto">
            {(['ALL', 'PUBLISHED', 'DRAFT', 'CANCELLED'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => {
                  setStatusFilter(status);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-[#FF5B22] text-white shadow-sm font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
                }`}
              >
                {status === 'ALL' ? 'All Events' : status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-[#131926] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 dark:bg-slate-900/40 border-b border-slate-200/60 dark:border-slate-800 text-xs font-mono uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4 font-semibold">Event & Venue</th>
                <th className="px-6 py-4 font-semibold">Organizer</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Tickets Sold / Capacity</th>
                <th className="px-6 py-4 font-semibold">Gross Revenue</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                      <span className="text-xs text-slate-400 font-mono">Loading event directory…</span>
                    </div>
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg className="h-8 w-8 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">No events match filter</span>
                      <span className="text-xs text-slate-400">Try adjusting your search query or status filter.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Title & Venue */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 dark:text-white">{evt.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <svg className="h-3 w-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{evt.venue}</span>
                        <span>•</span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {new Date(evt.startsAt).toLocaleDateString()}
                        </span>
                      </div>
                    </td>

                    {/* Organizer */}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{evt.organizer.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{evt.organizer.email}</div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <Badge label={evt.status} variant={getStatusBadgeVariant(evt.status)} className="font-mono text-[11px]" />
                    </td>

                    {/* Capacity & Sold Count */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                          {evt.totalSold} / {evt.totalCapacity}
                        </div>
                        <span className="text-xs text-slate-400">
                          ({evt.totalCapacity > 0 ? Math.round((evt.totalSold / evt.totalCapacity) * 100) : 0}%)
                        </span>
                      </div>
                      <div className="w-32 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                        <div
                          className="bg-[#FF5B22] h-1.5 rounded-full transition-all"
                          style={{
                            width: `${evt.totalCapacity > 0 ? Math.min(100, Math.round((evt.totalSold / evt.totalCapacity) * 100)) : 0}%`,
                          }}
                        />
                      </div>
                    </td>

                    {/* Revenue */}
                    <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(evt.grossRevenue)}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenStatusModal(evt)}
                        className="rounded-2xl bg-white dark:bg-[#161D2E] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-orange-500/50"
                      >
                        Change Status
                      </Button>
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
            Showing <span className="font-mono text-slate-900 dark:text-white font-bold">{events.length}</span> of{' '}
            <span className="font-mono text-slate-900 dark:text-white font-bold">{totalEvents}</span> events
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="rounded-2xl bg-white dark:bg-[#161D2E] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
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
              className="rounded-2xl bg-white dark:bg-[#161D2E] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Moderation Status Modal */}
      {selectedEvent && (
        <Modal
          isOpen={Boolean(selectedEvent)}
          onClose={() => setSelectedEvent(null)}
          title="Moderate Event Status"
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-1 font-bold">
                Target Event
              </div>
              <div className="font-bold text-slate-900 dark:text-white text-base">{selectedEvent.title}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Hosted by: <span className="text-[#FF5B22] font-semibold">{selectedEvent.organizer.name}</span> ({selectedEvent.organizer.email})
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="text-slate-500 dark:text-slate-400">Current Status:</span>
                <Badge label={selectedEvent.status} variant={getStatusBadgeVariant(selectedEvent.status)} />
              </div>
            </div>

            {modalError && (
              <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 p-3 text-xs text-rose-700 dark:text-rose-400 font-medium">
                {modalError}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-wider text-slate-400 block font-semibold">
                Select Status
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'PUBLISHED', label: 'Published', desc: 'Visible to all customers' },
                  { id: 'DRAFT', label: 'Draft', desc: 'Hidden from marketplace' },
                  { id: 'CANCELLED', label: 'Cancelled', desc: 'Locks ticket sales' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setTargetStatus(s.id as any)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      targetStatus === s.id
                        ? 'border-[#FF5B22] bg-orange-50/50 dark:bg-orange-950/20 text-slate-900 dark:text-white shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="font-bold text-sm text-slate-900 dark:text-white">{s.label}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-slate-400 block font-semibold">
                Audit Reason (Optional)
              </label>
              <input
                type="text"
                value={moderationReason}
                onChange={(e) => setModerationReason(e.target.value)}
                placeholder="e.g. Approved for discovery or organizer request"
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-[#FF5B22] focus:outline-none focus:ring-1 focus:ring-[#FF5B22]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setSelectedEvent(null)}
                disabled={isUpdatingStatus}
                className="rounded-2xl bg-white dark:bg-[#161D2E] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleSaveStatus}
                isLoading={isUpdatingStatus}
                className="rounded-2xl bg-[#FF5B22] text-white hover:bg-[#e04f1c] font-bold shadow-md shadow-orange-500/20"
              >
                Save Status
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default AdminEventsView;
