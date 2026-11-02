import { useState, useEffect, useCallback, useMemo, useId } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { api } from '../../lib/api';

export interface AttendeeItem {
  id: string;
  ticketId: string;
  status: string;
  checkedInAt: string | null;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
  tier: {
    id: string;
    name: string;
    price: number;
  } | null;
  bookingId: string;
  createdAt: string;
}

export interface PaginatedAttendeesResponse {
  attendees: AttendeeItem[];
  total: number;
  page: number;
  limit: number;
}

export interface EventOption {
  id: string;
  title: string;
}

export type CheckInFilter = 'ALL' | 'CHECKED_IN' | 'NOT_CHECKED_IN';

export interface AttendeeRosterViewProps {
  initialEventId?: string;
}

export function AttendeeRosterView({ initialEventId }: AttendeeRosterViewProps) {
  const navigate = useNavigate();
  const routeParams = useParams<{ id?: string; eventId?: string }>();
  const eventSelectId = useId();
  const searchInputId = useId();
  const filterSelectId = useId();

  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(
    initialEventId || routeParams.eventId || routeParams.id || ''
  );
  const [attendees, setAttendees] = useState<AttendeeItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<CheckInFilter>('ALL');
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;

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

  // Fetch attendees for the selected event
  const fetchAttendees = useCallback(async (eventId: string, search: string) => {
    if (!eventId) {
      setAttendees([]);
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const queryParams = new URLSearchParams({
        page: '1',
        limit: '100',
      });
      if (search.trim()) {
        queryParams.set('search', search.trim());
      }

      let data: PaginatedAttendeesResponse;
      try {
        data = await api.get<PaginatedAttendeesResponse>(
          `/organizer/events/${eventId}/attendees?${queryParams.toString()}`
        );
      } catch {
        data = await api.get<PaginatedAttendeesResponse>(
          `/api/v1/organizer/events/${eventId}/attendees?${queryParams.toString()}`
        );
      }

      if (data && Array.isArray(data.attendees)) {
        setAttendees(data.attendees);
      } else {
        throw new Error('Invalid attendee roster response from server.');
      }
    } catch (err) {
      setAttendees([]);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load attendee roster from server.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (selectedEventId) {
      fetchAttendees(selectedEventId, searchTerm);
    }
  }, [selectedEventId, searchTerm, fetchAttendees]);

  // Client-side filtering by check-in status
  const filteredAttendees = useMemo(() => {
    return attendees.filter((item) => {
      if (filterStatus === 'CHECKED_IN') {
        return item.status === 'CHECKED_IN';
      }
      if (filterStatus === 'NOT_CHECKED_IN') {
        return item.status !== 'CHECKED_IN';
      }
      return true;
    });
  }, [attendees, filterStatus]);

  // Pagination slicing
  const totalPages = Math.max(1, Math.ceil(filteredAttendees.length / pageSize));
  const paginatedAttendees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAttendees.slice(start, start + pageSize);
  }, [filteredAttendees, currentPage, pageSize]);

  // Quick stats
  const totalCount = attendees.length;
  const checkedInCount = attendees.filter((a) => a.status === 'CHECKED_IN').length;
  const checkInRate = totalCount > 0 ? (checkedInCount / totalCount) * 100 : 0;

  const formatCheckInTime = (raw: string | null) => {
    if (!raw) return null;
    try {
      const d = new Date(raw);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return raw;
    }
  };

  const handleExportCsv = () => {
    const headers = ['Attendee Name', 'Email', 'Tier', 'Ticket ID', 'Status', 'Check-In Time'];
    const rows = filteredAttendees.map((a) => [
      a.user?.name ?? 'Unknown',
      a.user?.email ?? '',
      a.tier?.name ?? 'Standard',
      a.ticketId,
      a.status,
      a.checkedInAt ? new Date(a.checkedInAt).toLocaleString() : 'N/A',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `argon_attendees_${selectedEventId || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-fade-in text-white pb-12">
      {/* Top Header & Event Switcher */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-white">
              Attendee Roster
            </h1>
            <Badge label="Gate Audit" variant="info" />
          </div>
          <p className="mt-1 text-sm text-gray-400">
            Real-time verified ticket holders, entrance check-in timestamps, and ticket credentials.
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
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                setCurrentPage(1);
              }}
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
            variant="secondary"
            size="md"
            onClick={handleExportCsv}
            disabled={filteredAttendees.length === 0}
            className="flex items-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export CSV</span>
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
              if (selectedEventId) fetchAttendees(selectedEventId, searchTerm);
              else fetchEvents();
            }}
            className="text-xs text-rose-300 hover:text-white"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Metrics Mini-Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4 bg-surface-card/70 border-white/10">
          <div className="text-xs font-semibold uppercase text-gray-400">Total Registered</div>
          <div className="mt-1 text-2xl font-bold font-display text-white">{totalCount} Attendees</div>
        </Card>
        <Card className="p-4 bg-surface-card/70 border-white/10">
          <div className="text-xs font-semibold uppercase text-gray-400">Door Check-Ins</div>
          <div className="mt-1 text-2xl font-bold font-display text-emerald-400">
            {checkedInCount} Checked In
          </div>
        </Card>
        <Card className="p-4 bg-surface-card/70 border-white/10">
          <div className="text-xs font-semibold uppercase text-gray-400">Door Completion</div>
          <div className="mt-1 text-2xl font-bold font-display text-indigo-400">
            {checkInRate.toFixed(1)}% Turnout
          </div>
        </Card>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <label htmlFor={searchInputId} className="sr-only">
            Search Attendees
          </label>
          <input
            id={searchInputId}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by name, email, or ticket ID…"
            className="w-full rounded-xl border border-white/10 bg-surface-card pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor={filterSelectId} className="text-xs text-gray-400 whitespace-nowrap">
            Filter Status:
          </label>
          <select
            id={filterSelectId}
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value as CheckInFilter);
              setCurrentPage(1);
            }}
            className="rounded-xl border border-white/10 bg-surface-card px-3 py-2 text-sm text-white shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="ALL">All Attendees ({totalCount})</option>
            <option value="CHECKED_IN">Checked In ({checkedInCount})</option>
            <option value="NOT_CHECKED_IN">Not Checked In ({totalCount - checkedInCount})</option>
          </select>
        </div>
      </div>

      {/* Attendee Roster Table */}
      <Card className="overflow-hidden p-0 border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-surface-elevated/60 text-xs font-semibold uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-6 py-4">Attendee</th>
                <th className="px-6 py-4">Ticket Tier</th>
                <th className="px-6 py-4">Ticket ID / Hash</th>
                <th className="px-6 py-4">Gate Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {paginatedAttendees.map((attendee) => {
                const isCheckedIn = attendee.status === 'CHECKED_IN';
                const formattedTime = formatCheckInTime(attendee.checkedInAt);
                const initials = (attendee.user?.name ?? 'A')
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                return (
                  <tr key={attendee.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Attendee Name & Email */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-elevated border border-white/10 text-xs font-bold text-primary-400">
                          {initials}
                        </div>
                        <div>
                          <div className="font-semibold text-white">
                            {attendee.user?.name ?? 'Anonymous Attendee'}
                          </div>
                          <div className="text-xs text-gray-400">
                            {attendee.user?.email ?? 'No email provided'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Ticket Tier */}
                    <td className="px-6 py-4">
                      <span className="font-medium text-white">
                        {attendee.tier?.name ?? 'General Ticket'}
                      </span>
                    </td>

                    {/* Ticket ID / QR Hash Monospace */}
                    <td className="px-6 py-4">
                      <code className="rounded bg-black/40 px-2 py-1 font-mono text-xs text-gray-300 border border-white/5">
                        {attendee.ticketId}
                      </code>
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4">
                      {isCheckedIn ? (
                        <div className="flex items-center gap-2">
                          <Badge
                            label="CHECKED_IN"
                            variant="green"
                            className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          />
                          {formattedTime && (
                            <span className="text-xs text-gray-400 font-mono">
                              at {formattedTime}
                            </span>
                          )}
                        </div>
                      ) : (
                        <Badge
                          label="ACTIVE"
                          variant="blue"
                          className="bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {paginatedAttendees.length === 0 && !isLoading && (
          <div className="py-12 text-center text-gray-400">
            {events.length === 0
              ? 'No events found for this organizer account.'
              : 'No attendees match the specified filter or query.'}
          </div>
        )}

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/10 bg-surface-card px-6 py-3 text-xs text-gray-400">
            <span>
              Showing Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> (
              {filteredAttendees.length} attendees)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default AttendeeRosterView;
