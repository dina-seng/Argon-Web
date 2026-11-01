/**
 * features/organizer/DashboardPage.tsx
 * Organizer's event list: status, ticket sales, and publish / cancel / edit actions.
 */
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { EventStatus } from '@argon/shared';
import type { OrganizerEvent } from '@argon/shared';
import { api, ApiRequestError } from '@/lib/api';
import { CATEGORY_LABELS, STATUS_BADGES, formatEventDateShort } from '@/lib/eventLabels';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { EventCover } from '@/components/EventCover';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; error: ApiRequestError | Error }
  | { kind: 'ready'; events: OrganizerEvent[] };

export default function DashboardPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<OrganizerEvent[]>('/organizer/events')
      .then((events) => !cancelled && setState({ kind: 'ready', events }))
      .catch((error: Error) => !cancelled && setState({ kind: 'error', error }));
    return () => {
      cancelled = true;
    };
  }, []);

  async function changeStatus(event: OrganizerEvent, status: EventStatus.PUBLISHED | EventStatus.CANCELLED) {
    if (status === EventStatus.CANCELLED && !window.confirm(`Cancel "${event.title}"? This can't be undone.`)) return;

    setPendingId(event.id);
    setActionError(null);
    try {
      const updated = await api.patch<OrganizerEvent>(`/events/${event.id}/status`, { status });
      setState((s) => (s.kind === 'ready' ? { ...s, events: s.events.map((e) => (e.id === updated.id ? updated : e)) } : s));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold leading-[1.5] text-accent">Organizer dashboard</p>
          <h1 className="text-[32px] font-bold leading-[1.25] text-fg sm:text-[40px]">Your events</h1>
          <p className="text-base leading-[1.5] text-fg-muted">Create, publish, and manage your event listings.</p>
        </div>
        <Link
          to="/organizer/events/new"
          className="inline-flex h-12 items-center gap-2 rounded-lg bg-accent px-5 text-sm font-semibold text-surface transition-colors hover:bg-accent/90"
        >
          <Icon name="plus" size={16} />
          Create event
        </Link>
      </header>

      {state.kind === 'loading' && <p className="text-fg-muted">Loading your events…</p>}

      {state.kind === 'error' && <LoadError error={state.error} />}

      {state.kind === 'ready' && (
        <>
          <Summary events={state.events} />

          {actionError && (
            <p role="alert" className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {actionError}
            </p>
          )}

          {state.events.length === 0 ? (
            <Panel>
              <h2 className="text-xl font-bold text-fg">No events yet</h2>
              <p className="text-sm text-fg-muted">Create your first event to start selling tickets.</p>
              <Link
                to="/organizer/events/new"
                className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline"
              >
                Create an event
                <Icon name="arrowRight" size={16} />
              </Link>
            </Panel>
          ) : (
            <section className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold leading-[1.25] text-fg">All events</h2>
              <ul className="flex flex-col gap-4">
                {state.events.map((event) => (
                  <EventRow
                    key={event.id}
                    event={event}
                    isPending={pendingId === event.id}
                    onPublish={() => changeStatus(event, EventStatus.PUBLISHED)}
                    onCancel={() => changeStatus(event, EventStatus.CANCELLED)}
                  />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-line bg-surface-card px-6 py-12 text-center">
      {children}
    </div>
  );
}

function Summary({ events }: { events: OrganizerEvent[] }) {
  const published = events.filter((e) => e.status === EventStatus.PUBLISHED).length;
  const drafts = events.filter((e) => e.status === EventStatus.DRAFT).length;
  const sold = events.reduce((sum, e) => sum + e.soldCount, 0);

  return (
    <dl className="grid grid-cols-3 gap-3 sm:gap-6">
      {[
        { label: 'Published', value: published },
        { label: 'Drafts', value: drafts },
        { label: 'Tickets sold', value: sold },
      ].map((stat) => (
        <div key={stat.label} className="rounded-lg border border-line bg-surface-card p-4 sm:p-6">
          <dt className="text-xs font-semibold text-fg-muted sm:text-sm">{stat.label}</dt>
          <dd className="mt-2 text-2xl font-bold text-fg sm:text-[32px] sm:leading-[1.25]">{stat.value.toLocaleString()}</dd>
        </div>
      ))}
    </dl>
  );
}

interface EventRowProps {
  event: OrganizerEvent;
  isPending: boolean;
  onPublish: () => void;
  onCancel: () => void;
}

function EventRow({ event, isPending, onPublish, onCancel }: EventRowProps) {
  const badge = STATUS_BADGES[event.status];
  const canEdit = event.status === EventStatus.DRAFT || event.status === EventStatus.PUBLISHED;
  const soldPct = event.capacity > 0 ? Math.min(100, Math.round((event.soldCount / event.capacity) * 100)) : 0;

  return (
    <li className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface-card sm:flex-row">
      <EventCover category={event.category} coverImageUrl={event.coverImageUrl} className="h-32 shrink-0 sm:h-auto sm:w-48">
        <div className="absolute bottom-3 left-3">
          <Badge label={CATEGORY_LABELS[event.category]} />
        </div>
      </EventCover>

      <div className="grid flex-1 gap-4 p-6 md:grid-cols-[1fr_10rem_auto] md:items-center">
        <div className="flex min-w-0 flex-col gap-3">
          <div>
            <Badge label={badge.label} variant={badge.variant} />
          </div>
          <h3 className="truncate text-xl font-bold leading-[1.25] text-fg">{event.title}</h3>
          <div className="flex flex-col gap-2 text-sm leading-[1.5] text-fg-muted">
            <p className="flex items-center gap-3">
              <Icon name="calendar" />
              <span className="truncate">{formatEventDateShort(event.startsAt)}</span>
            </p>
            <p className="flex items-center gap-3">
              <Icon name="mapPin" />
              <span className="truncate">{event.venue}</span>
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm text-fg-muted">
            <span className="font-semibold text-fg">{event.soldCount.toLocaleString()}</span> / {event.capacity.toLocaleString()} sold
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
            <div className="h-full rounded-full bg-accent" style={{ width: `${soldPct}%` }} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 md:justify-end">
          {canEdit && (
            <Link
              to={`/organizer/events/${event.id}`}
              className="inline-flex h-9 items-center rounded-lg border border-line-strong px-3 text-sm font-semibold text-fg transition-colors hover:border-fg-muted"
            >
              Edit
            </Link>
          )}
          {event.status === EventStatus.DRAFT && (
            <Button size="sm" onClick={onPublish} disabled={isPending}>
              Publish
            </Button>
          )}
          {canEdit && (
            <Button size="sm" variant="danger" onClick={onCancel} disabled={isPending}>
              Cancel event
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}

function LoadError({ error }: { error: Error }) {
  const isAuth = error instanceof ApiRequestError && (error.status === 401 || error.status === 403);

  return (
    <Panel>
      <h2 className="text-xl font-bold text-fg">{isAuth ? 'Sign in as an organizer' : "Couldn't load your events"}</h2>
      <p className="text-sm text-fg-muted">
        {isAuth ? 'You need an organizer account to manage events.' : error.message}
      </p>
      {isAuth && import.meta.env.DEV && (
        <p className="mt-2 text-sm text-fg-muted">
          Dev tip: login isn&apos;t built yet. Run <code className="text-fg">npm run dev:token -w apps/api</code> and
          follow its instructions.
        </p>
      )}
    </Panel>
  );
}
