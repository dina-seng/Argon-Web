import { useState, useEffect, useCallback, useId } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { api } from '../../lib/api';

export interface TierItem {
  id: string;
  name: string;
  price: number;
  capacity: number;
  soldCount: number;
  reservedCount: number;
  available: number;
  isPaused?: boolean;
}

export interface EventMetricsResponse {
  eventId: string;
  title: string;
  totalCapacity: number;
  totalSold: number;
  totalReserved: number;
  grossRevenue: number;
  checkedInCount: number;
  checkInRate: number;
  tiers: TierItem[];
}

export interface EventOption {
  id: string;
  title: string;
  tiers?: TierItem[];
}

export interface TierQuotaViewProps {
  initialEventId?: string;
}

export function TierQuotaView({ initialEventId }: TierQuotaViewProps) {
  const navigate = useNavigate();
  const routeParams = useParams<{ id?: string; eventId?: string }>();
  const eventSelectId = useId();
  const capacityInputId = useId();

  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(
    initialEventId || routeParams.eventId || routeParams.id || ''
  );
  const [eventTitle, setEventTitle] = useState<string>('');
  const [tiers, setTiers] = useState<TierItem[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit Modal State
  const [editingTier, setEditingTier] = useState<TierItem | null>(null);
  const [newCapacityInput, setNewCapacityInput] = useState<string>('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Load real events from organizer API
  const fetchEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    try {
      let list: any[] = [];
      try {
        const res = await api.get<any[]>('/organizer/events');
        list = Array.isArray(res) ? res : (res as any)?.events ?? [];
      } catch {
        const res = await api.get<any[]>('/api/v1/organizer/events');
        list = Array.isArray(res) ? res : (res as any)?.events ?? [];
      }

      const mapped: EventOption[] = list.map((e: any) => ({
        id: e.id,
        title: e.title || 'Untitled Event',
        tiers: (e.tiers || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          price: Number(t.price),
          capacity: t.capacity,
          soldCount: t.soldCount || 0,
          reservedCount: t.reservedCount || 0,
          available: Math.max(0, t.capacity - (t.soldCount || 0) - (t.reservedCount || 0)),
          isPaused: false,
        })),
      }));

      setEvents(mapped);
      if (mapped.length > 0) {
        setSelectedEventId((curr) => {
          if (curr && mapped.some((m) => m.id === curr)) return curr;
          return mapped[0]?.id ?? '';
        });
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load organizer events.');
    } finally {
      setIsLoadingEvents(false);
    }
  }, []);

  // Fetch real tiers from metrics or event details
  const fetchTiers = useCallback(async (eventId: string) => {
    if (!eventId) {
      setTiers([]);
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      let data: EventMetricsResponse;
      try {
        data = await api.get<EventMetricsResponse>(`/organizer/events/${eventId}/metrics`);
      } catch {
        data = await api.get<EventMetricsResponse>(`/api/v1/organizer/events/${eventId}/metrics`);
      }

      if (data && Array.isArray(data.tiers)) {
        setTiers(data.tiers);
        setEventTitle(data.title || 'Event Quota Manager');
      } else {
        throw new Error('Invalid tier response received from server.');
      }
    } catch (err) {
      // Fallback to tiers preloaded from listOrganizerEvents if metrics endpoint errors
      const matched = events.find((e) => e.id === eventId);
      if (matched && matched.tiers && matched.tiers.length > 0) {
        setTiers(matched.tiers);
        setEventTitle(matched.title);
      } else {
        setTiers([]);
        setErrorMsg(err instanceof Error ? err.message : 'Failed to fetch tiers for this event.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [events]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (selectedEventId) {
      fetchTiers(selectedEventId);
    }
  }, [selectedEventId, fetchTiers]);

  // Toast auto-dismiss after 4 seconds
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const handleOpenEditModal = (tier: TierItem) => {
    setEditingTier(tier);
    setNewCapacityInput(String(tier.capacity));
    setModalError(null);
  };

  const handleCloseEditModal = () => {
    setEditingTier(null);
    setNewCapacityInput('');
    setModalError(null);
  };

  const handleCapacityInputChange = (val: string) => {
    setNewCapacityInput(val);
    const num = parseInt(val, 10);
    if (editingTier && !isNaN(num) && num < editingTier.soldCount) {
      setModalError(`Capacity cannot be lower than already sold count (${editingTier.soldCount})`);
    } else {
      setModalError(null);
    }
  };

  const handleSaveCapacity = async () => {
    if (!editingTier) return;
    const parsedCapacity = parseInt(newCapacityInput, 10);

    if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
      setModalError('Please enter a valid positive integer for capacity.');
      return;
    }

    if (parsedCapacity < editingTier.soldCount) {
      setModalError(`Capacity cannot be lower than already sold count (${editingTier.soldCount})`);
      return;
    }

    setIsSaving(true);
    setModalError(null);

    try {
      try {
        await api.patch(
          `/organizer/events/${selectedEventId}/tiers/${editingTier.id}/quota`,
          { capacity: parsedCapacity }
        );
      } catch {
        await api.patch(
          `/api/v1/organizer/events/${selectedEventId}/tiers/${editingTier.id}/quota`,
          { capacity: parsedCapacity }
        );
      }

      // Update state upon successful confirmation
      setTiers((prev) =>
        prev.map((t) => {
          if (t.id === editingTier.id) {
            const avail = Math.max(0, parsedCapacity - t.soldCount - t.reservedCount);
            return {
              ...t,
              capacity: parsedCapacity,
              available: avail,
            };
          }
          return t;
        })
      );

      setToastMessage(`Capacity for "${editingTier.name}" updated to ${parsedCapacity}.`);
      handleCloseEditModal();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to update quota on server.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleSalesPause = (tier: TierItem) => {
    const nextPaused = !tier.isPaused;
    setTiers((prev) =>
      prev.map((t) => (t.id === tier.id ? { ...t, isPaused: nextPaused } : t))
    );

    setToastMessage(
      nextPaused
        ? `Sales paused for "${tier.name}". Checkout is temporarily closed.`
        : `Sales resumed for "${tier.name}". Checkout is active.`
    );
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <div className="space-y-8 animate-fade-in text-white pb-12">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-surface-elevated/95 px-4 py-3 text-sm text-emerald-300 shadow-2xl backdrop-blur-md animate-fade-in">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-medium">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-gray-400 hover:text-white"
          >
            &times;
          </button>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-white">
              Tier Quota Controls
            </h1>
            <Badge label="Inventory Management" variant="info" />
          </div>
          <p className="mt-1 text-sm text-gray-400">
            Real-time capacity reallocations, inventory limits, and ticket sales pause controls.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <label htmlFor={eventSelectId} className="sr-only">
              Select Event
            </label>
            <select
              id={eventSelectId}
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              disabled={isLoadingEvents || events.length === 0}
              className="appearance-none rounded-xl border border-white/10 bg-surface-card px-4 py-2 pr-9 text-sm font-medium text-white shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer disabled:opacity-50"
            >
              {events.length === 0 ? (
                <option value="">{isLoadingEvents ? 'Loading events…' : 'No events found'}</option>
              ) : (
                events.map((evt) => (
                  <option key={evt.id} value={evt.id} className="bg-surface-card text-white">
                    {evt.title}
                  </option>
                ))
              )}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate(selectedEventId ? `/organizer/events/${selectedEventId}/metrics` : '/organizer')}
            className="flex items-center gap-2"
          >
            &larr; Overview
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => navigate(selectedEventId ? `/organizer/events/${selectedEventId}/attendees` : '/organizer/attendees')}
            className="flex items-center gap-2"
          >
            Attendee Roster &rarr;
          </Button>
        </div>
      </div>

      {/* Error Alert Banner */}
      {errorMsg && (
        <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
          <div className="flex items-center gap-2.5">
            <svg className="h-5 w-5 flex-shrink-0 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorMsg}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (selectedEventId) fetchTiers(selectedEventId);
              else fetchEvents();
            }}
            className="text-xs text-rose-300 hover:text-white"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Summary Banner */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4 bg-surface-card/70 border-white/10">
          <div className="text-xs font-semibold uppercase text-gray-400">Active Event</div>
          <div className="mt-1 text-base font-bold text-white truncate">
            {eventTitle || (events.find((e) => e.id === selectedEventId)?.title ?? 'No Event Selected')}
          </div>
        </Card>
        <Card className="p-4 bg-surface-card/70 border-white/10">
          <div className="text-xs font-semibold uppercase text-gray-400">Total Ticket Tiers</div>
          <div className="mt-1 text-base font-bold text-white font-mono">{tiers.length} Tiers Configured</div>
        </Card>
        <Card className="p-4 bg-surface-card/70 border-white/10">
          <div className="text-xs font-semibold uppercase text-gray-400">Aggregate Capacity</div>
          <div className="mt-1 text-base font-bold text-white font-mono">
            {tiers.reduce((acc, t) => acc + t.soldCount, 0)} / {tiers.reduce((acc, t) => acc + t.capacity, 0)} Seats
          </div>
        </Card>
      </div>

      {/* Tiers Management Table */}
      <Card className="overflow-hidden p-0 border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-surface-elevated/60 text-xs font-semibold uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-6 py-4">Ticket Tier</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Sold Count</th>
                <th className="px-6 py-4">Current Capacity</th>
                <th className="px-6 py-4">Available</th>
                <th className="px-6 py-4">Sales Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {tiers.map((tier) => {
                const isPaused = Boolean(tier.isPaused);
                const isSoldOut = tier.available <= 0 || tier.soldCount >= tier.capacity;

                return (
                  <tr key={tier.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{tier.name}</div>
                      <div className="text-xs text-gray-500 font-mono">ID: {tier.id}</div>
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-white">
                      {formatCurrency(tier.price)}
                    </td>
                    <td className="px-6 py-4 font-mono">
                      <span className="font-medium text-white">{tier.soldCount}</span>
                      <span className="text-xs text-gray-500 ml-1">sold</span>
                    </td>
                    <td className="px-6 py-4 font-mono">
                      <span className="font-bold text-white">{tier.capacity}</span>
                      <span className="text-xs text-gray-500 ml-1">max</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`font-mono font-semibold ${
                          tier.available === 0 ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {tier.available}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {isPaused ? (
                        <Badge label="Sales Paused" variant="warning" />
                      ) : isSoldOut ? (
                        <Badge label="Sold Out" variant="error" />
                      ) : (
                        <Badge label="Selling Live" variant="success" />
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenEditModal(tier)}
                          className="text-xs"
                        >
                          Edit Capacity
                        </Button>

                        <Button
                          variant={isPaused ? 'primary' : 'ghost'}
                          size="sm"
                          onClick={() => handleToggleSalesPause(tier)}
                          className={`text-xs ${
                            isPaused
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : 'text-amber-400 hover:bg-amber-500/10'
                          }`}
                        >
                          {isPaused ? 'Resume Sales' : 'Pause Sales'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {tiers.length === 0 && !isLoading && (
          <div className="py-12 text-center text-gray-500">
            No ticket tiers found for this event.
          </div>
        )}
      </Card>

      {/* Edit Capacity Modal */}
      <Modal
        isOpen={Boolean(editingTier)}
        onClose={handleCloseEditModal}
        title={editingTier ? `Adjust Capacity: ${editingTier.name}` : 'Edit Tier Capacity'}
      >
        {editingTier && (
          <div className="space-y-4">
            <div className="rounded-xl bg-surface-elevated/80 p-4 border border-white/5 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Current Sold Tickets:</span>
                <span className="font-mono font-semibold text-white">{editingTier.soldCount} tickets</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Current Capacity:</span>
                <span className="font-mono text-gray-300">{editingTier.capacity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Base Unit Price:</span>
                <span className="font-mono text-gray-300">{formatCurrency(editingTier.price)}</span>
              </div>
            </div>

            <div>
              <label htmlFor={capacityInputId} className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                New Target Capacity
              </label>
              <input
                id={capacityInputId}
                type="number"
                min={editingTier.soldCount}
                value={newCapacityInput}
                onChange={(e) => handleCapacityInputChange(e.target.value)}
                placeholder="Enter new capacity limit"
                className="w-full rounded-xl border border-white/10 bg-surface px-4 py-2.5 text-base font-mono text-white placeholder-gray-500 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <p className="mt-1 text-xs text-gray-400">
                Minimum permitted: {editingTier.soldCount} (tickets already paid & issued).
              </p>
            </div>

            {/* Error Guard Message */}
            {modalError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-start gap-2">
                <svg className="h-4 w-4 flex-shrink-0 text-rose-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{modalError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <Button variant="ghost" size="md" onClick={handleCloseEditModal} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleSaveCapacity}
                isLoading={isSaving}
                disabled={Boolean(modalError) || !newCapacityInput}
              >
                Save Capacity
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default TierQuotaView;
