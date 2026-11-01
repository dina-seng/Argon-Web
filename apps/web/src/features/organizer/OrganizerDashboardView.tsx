import { useState, useEffect, useCallback, useId } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { api } from '../../lib/api';

export interface TierMetric {
  id: string;
  name: string;
  price: number;
  capacity: number;
  soldCount: number;
  reservedCount: number;
  available: number;
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
  tiers: TierMetric[];
}

export interface EventOption {
  id: string;
  title: string;
  date?: string;
  venue?: string;
}

export interface OrganizerDashboardViewProps {
  initialEventId?: string;
}

export function OrganizerDashboardView({ initialEventId }: OrganizerDashboardViewProps) {
  const navigate = useNavigate();
  const routeParams = useParams<{ id?: string; eventId?: string }>();
  const eventSelectId = useId();

  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(
    initialEventId || routeParams.eventId || routeParams.id || ''
  );
  const [metrics, setMetrics] = useState<EventMetricsResponse | null>(null);
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch organizer's real events
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
        date: e.startsAt ? new Date(e.startsAt).toLocaleDateString() : '',
        venue: e.venue || '',
      }));

      setEvents(mapped);
      if (mapped.length > 0) {
        setSelectedEventId((curr) => {
          if (curr && mapped.some((m) => m.id === curr)) {
            return curr;
          }
          return mapped[0]?.id ?? '';
        });
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load organizer events.');
    } finally {
      setIsLoadingEvents(false);
    }
  }, []);

  // Fetch live metrics for selected event
  const fetchMetrics = useCallback(async (eventId: string, isManual = false) => {
    if (!eventId) {
      setIsLoading(false);
      return;
    }
    if (isManual) {
      setIsRefreshing(true);
    }
    setErrorMsg(null);

    try {
      let data: EventMetricsResponse;
      try {
        data = await api.get<EventMetricsResponse>(`/organizer/events/${eventId}/metrics`);
      } catch {
        data = await api.get<EventMetricsResponse>(`/api/v1/organizer/events/${eventId}/metrics`);
      }

      if (data && typeof data.totalSold === 'number') {
        setMetrics(data);
      } else {
        throw new Error('Malformed metrics response received from server.');
      }
    } catch (err) {
      setMetrics(null);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to fetch event metrics.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setLastRefreshedAt(new Date());
    }
  }, []);

  // Initial fetch of events
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // When selected event changes, fetch metrics
  useEffect(() => {
    if (selectedEventId) {
      setIsLoading(true);
      fetchMetrics(selectedEventId);
    }
  }, [selectedEventId, fetchMetrics]);

  // Polling / auto-refresh every 8 seconds
  useEffect(() => {
    if (!selectedEventId) return;
    const timer = setInterval(() => {
      fetchMetrics(selectedEventId, false);
    }, 8000);

    return () => clearInterval(timer);
  }, [selectedEventId, fetchMetrics]);

  const soldPct =
    metrics && metrics.totalCapacity > 0
      ? Math.min(100, (metrics.totalSold / metrics.totalCapacity) * 100)
      : 0;

  const checkInPct =
    metrics && metrics.totalSold > 0
      ? Math.min(100, (metrics.checkedInCount / metrics.totalSold) * 100)
      : metrics?.checkInRate ?? 0;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <div className="space-y-8 animate-fade-in text-white pb-12">
      {/* Top Header & Event Switcher Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-white">
              Organizer Metrics Dashboard
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live • Updated {lastRefreshedAt.toLocaleTimeString()}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-400">
            Real-time ticketing velocity, quota utilization, and gate check-in throughput.
          </p>
        </div>

        {/* Controls: Event Dropdown + Refresh Button */}
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
            onClick={() => {
              if (selectedEventId) fetchMetrics(selectedEventId, true);
              else fetchEvents();
            }}
            isLoading={isRefreshing || isLoading || isLoadingEvents}
            className="flex items-center gap-2"
          >
            <svg
              className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
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
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Error Alert Banner */}
      {errorMsg && (
        <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
          <div className="flex items-center gap-2.5">
            <svg className="h-5 w-5 flex-shrink-0 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{errorMsg}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (selectedEventId) fetchMetrics(selectedEventId, true);
              else fetchEvents();
            }}
            className="text-xs text-rose-300 hover:text-white"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Empty State when no events exist */}
      {!isLoadingEvents && events.length === 0 && (
        <Card className="py-12 text-center border-dashed border-white/10">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-surface-elevated text-gray-400 mb-3">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-white">No Organizer Events Found</h3>
          <p className="mt-1 text-xs text-gray-400 max-w-sm mx-auto">
            You don&apos;t have any events registered under your organizer account yet.
          </p>
          <div className="mt-4">
            <Button variant="primary" size="sm" onClick={() => navigate('/organizer/events/new')}>
              Create Your First Event
            </Button>
          </div>
        </Card>
      )}

      {/* Metrics Content (when loaded) */}
      {metrics && (
        <>
          {/* Primary KPI Metric Cards Grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* KPI 1: Total Revenue */}
            <Card className="flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-gray-400">
                  <span className="text-xs font-semibold uppercase tracking-wider">Gross Revenue</span>
                  <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-display font-bold text-white tracking-tight">
                    {formatCurrency(metrics.grossRevenue)}
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    From {metrics.totalSold} paid attendee transactions
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-emerald-400">
                <span>Settled in USD</span>
                <span className="font-semibold text-gray-400">Live DB Metrics</span>
              </div>
            </Card>

            {/* KPI 2: Tickets Sold vs Capacity */}
            <Card className="flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-gray-400">
                  <span className="text-xs font-semibold uppercase tracking-wider">Tickets Sold</span>
                  <div className="rounded-lg bg-primary-500/10 p-2 text-primary-400">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-display font-bold text-white tracking-tight">
                    {metrics.totalSold}{' '}
                    <span className="text-lg font-normal text-gray-400">/ {metrics.totalCapacity}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                    <span>Capacity Utilized</span>
                    <span className="font-semibold text-white">{soldPct.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-500 to-indigo-400 transition-all duration-500"
                    style={{ width: `${soldPct}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-gray-400">
                  <span>{Math.max(0, metrics.totalCapacity - metrics.totalSold)} remaining</span>
                  <span>{metrics.totalReserved} reserved</span>
                </div>
              </div>
            </Card>

            {/* KPI 3: Gate Check-In Velocity */}
            <Card className="flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-gray-400">
                  <span className="text-xs font-semibold uppercase tracking-wider">Gate Check-Ins</span>
                  <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-display font-bold text-white tracking-tight">
                    {metrics.checkedInCount}{' '}
                    <span className="text-lg font-normal text-gray-400">/ {metrics.totalSold}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                    <span>Gate Velocity</span>
                    <span className="font-semibold text-amber-400">{checkInPct.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all duration-500"
                    style={{ width: `${checkInPct}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-gray-400">
                  <span>{Math.max(0, metrics.totalSold - metrics.checkedInCount)} yet to arrive</span>
                  <span>Turnstiles open</span>
                </div>
              </div>
            </Card>

            {/* KPI 4: Quick Navigation Action Hub */}
            <Card className="flex flex-col justify-between bg-surface-card/90">
              <div>
                <div className="flex items-center justify-between text-gray-400">
                  <span className="text-xs font-semibold uppercase tracking-wider">Quick Actions</span>
                  <span className="h-2 w-2 rounded-full bg-primary-400" />
                </div>
                <h2 className="mt-2 text-base font-semibold text-white">Event Operations</h2>
                <p className="mt-1 text-xs text-gray-400">
                  Manage allocations or inspect attendee verification rosters.
                </p>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(selectedEventId ? `/organizer/events/${selectedEventId}/tiers` : '/organizer/tiers')}
                  className="w-full justify-between"
                >
                  <span>Tier Quota Controls</span>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(selectedEventId ? `/organizer/events/${selectedEventId}/attendees` : '/organizer/attendees')}
                  className="w-full justify-between"
                >
                  <span>Attendee Roster</span>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </div>
            </Card>
          </div>

          {/* Tier Breakdown Table Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold font-display text-white">Ticket Tier Quotas & Breakdown</h2>
                <p className="text-xs text-gray-400">
                  Live capacity limits, sales velocity, and inventory remaining per tier.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(selectedEventId ? `/organizer/events/${selectedEventId}/tiers` : '/organizer/tiers')}
                  className="text-xs"
                >
                  Adjust Allocations &rarr;
                </Button>
              </div>
            </div>

            <Card className="overflow-hidden p-0 border border-white/10">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-white/10 bg-surface-elevated/60 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <tr>
                      <th className="px-6 py-4">Ticket Tier</th>
                      <th className="px-6 py-4">Price</th>
                      <th className="px-6 py-4">Capacity</th>
                      <th className="px-6 py-4">Tickets Sold</th>
                      <th className="px-6 py-4">Available</th>
                      <th className="px-6 py-4">Sellout Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {metrics.tiers.map((tier) => {
                      const tierSoldPct =
                        tier.capacity > 0 ? (tier.soldCount / tier.capacity) * 100 : 0;
                      const isSoldOut = tier.available <= 0 || tier.soldCount >= tier.capacity;
                      const isAlmostSoldOut = !isSoldOut && tier.available <= 10;

                      return (
                        <tr key={tier.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-white">{tier.name}</div>
                            <div className="text-xs text-gray-500 font-mono">ID: {tier.id}</div>
                          </td>
                          <td className="px-6 py-4 font-mono font-medium text-white">
                            {formatCurrency(tier.price)}
                          </td>
                          <td className="px-6 py-4 font-mono">{tier.capacity}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-medium text-white">
                                {tier.soldCount}
                              </span>
                              <span className="text-xs text-gray-500 font-mono">
                                ({tierSoldPct.toFixed(0)}%)
                              </span>
                              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-elevated hidden sm:block">
                                <div
                                  className="h-full rounded-full bg-primary-500"
                                  style={{ width: `${tierSoldPct}%` }}
                                />
                              </div>
                            </div>
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
                            {isSoldOut ? (
                              <Badge label="Sold Out" variant="error" />
                            ) : isAlmostSoldOut ? (
                              <Badge label="Low Inventory" variant="warning" />
                            ) : (
                              <Badge label="Active" variant="success" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {metrics.tiers.length === 0 && (
                <div className="py-12 text-center text-gray-500">
                  No ticket tiers registered for this event.
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export default OrganizerDashboardView;
