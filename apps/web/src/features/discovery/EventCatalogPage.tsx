/**
 * features/discovery/EventCatalogPage.tsx
 * Customer feed of upcoming published events with category, date and keyword filters.
 * Filters live in the URL (?category=MUSIC&date=weekend&q=jazz) so views can be shared.
 */
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EVENTS_PAGE_SIZE, EventCategory } from '@argon/shared';
import type { PaginatedResponse, PublicEvent } from '@argon/shared';
import { api } from '@/lib/api';
import { CATEGORY_LABELS } from '@/lib/eventLabels';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { DATE_PRESETS, isDatePreset, presetRange } from './datePresets';
import type { DatePreset } from './datePresets';
import { EventCard } from './EventCard';
import { SearchBar } from './SearchBar';

interface Filters {
  category: EventCategory | null;
  date: DatePreset;
  q: string;
}

type FeedState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; events: PublicEvent[]; total: number; page: number; loadingMore: boolean };

function readFilters(params: URLSearchParams): Filters {
  const category = params.get('category');
  const date = params.get('date');
  return {
    category: Object.values<string>(EventCategory).includes(category ?? '') ? (category as EventCategory) : null,
    date: isDatePreset(date) ? date : 'any',
    q: params.get('q') ?? '',
  };
}

function feedUrl(filters: Filters, page: number): string {
  const query = new URLSearchParams({ page: String(page), pageSize: String(EVENTS_PAGE_SIZE) });
  if (filters.category) query.set('category', filters.category);
  if (filters.q) query.set('q', filters.q);
  const { from, to } = presetRange(filters.date);
  if (from) query.set('from', from);
  if (to) query.set('to', to);
  return `/events?${query}`;
}

export default function EventCatalogPage() {
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params);
  const { category, date, q } = filters;
  const hasFilters = category !== null || date !== 'any' || q !== '';

  const [state, setState] = useState<FeedState>({ kind: 'loading' });
  // Ignore responses from requests that a newer filter change has superseded.
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    setState({ kind: 'loading' });
    api
      .get<PaginatedResponse<PublicEvent>>(feedUrl({ category, date, q }, 1))
      .then((res) => {
        if (id === requestId.current) setState({ kind: 'ready', events: res.data, total: res.total, page: 1, loadingMore: false });
      })
      .catch((error: Error) => {
        if (id === requestId.current) setState({ kind: 'error', message: error.message });
      });
  }, [category, date, q]);

  async function loadMore() {
    if (state.kind !== 'ready') return;
    const id = requestId.current;
    const nextPage = state.page + 1;
    setState({ ...state, loadingMore: true });
    try {
      const res = await api.get<PaginatedResponse<PublicEvent>>(feedUrl(filters, nextPage));
      if (id !== requestId.current) return;
      setState((s) =>
        s.kind === 'ready'
          ? { kind: 'ready', events: [...s.events, ...res.data], total: res.total, page: nextPage, loadingMore: false }
          : s,
      );
    } catch {
      if (id === requestId.current) setState((s) => (s.kind === 'ready' ? { ...s, loadingMore: false } : s));
    }
  }

  function setFilter(key: keyof Filters, value: string | null) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    // Typing in search shouldn't add a history entry per keystroke.
    setParams(next, { replace: key === 'q' });
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-semibold leading-[1.5] text-accent">Explore Cambodia</p>
        <h1 className="text-[32px] font-bold leading-[1.25] text-fg sm:text-[40px]">Discover local events</h1>
        <p className="text-base leading-[1.5] text-fg-muted">
          Concerts, food, sports, workshops and more happening near you.
        </p>
      </header>

      <section className="flex flex-col gap-4" aria-label="Search and filters">
        <h2 className="text-sm font-semibold leading-[1.5] text-fg">Find your next event</h2>
        <SearchBar value={q} onSearch={(value) => setFilter('q', value || null)} />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div
            role="group"
            aria-label="Category"
            className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-0"
          >
            <Pill pressed={category === null} onClick={() => setFilter('category', null)}>
              All events
            </Pill>
            {Object.values(EventCategory).map((c) => (
              <Pill key={c} pressed={category === c} onClick={() => setFilter('category', c)}>
                {CATEGORY_LABELS[c]}
              </Pill>
            ))}
          </div>
          <DateSelect value={date} onChange={(value) => setFilter('date', value === 'any' ? null : value)} />
        </div>
      </section>

      {state.kind === 'loading' && <FeedSkeleton />}

      {state.kind === 'error' && (
        <Message title="Couldn't load events" text={state.message} />
      )}

      {state.kind === 'ready' && (
        <>
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-2xl font-bold leading-[1.25] text-fg">Upcoming events</h2>
            <p className="shrink-0 text-sm leading-[17px] text-fg-muted" aria-live="polite">
              {state.total === 0
                ? 'No events'
                : `Showing ${state.events.length} of ${state.total} ${state.total === 1 ? 'event' : 'events'}`}
            </p>
          </div>

          {state.events.length === 0 ? (
            <Message
              title="No events match"
              text={hasFilters ? 'Try a different search, category or date.' : 'There are no upcoming events yet. Check back soon.'}
              action={
                hasFilters && (
                  <Button variant="secondary" onClick={() => setParams({})}>
                    Clear filters
                  </Button>
                )
              }
            />
          ) : (
            <>
              <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {state.events.map((event) => (
                  <li key={event.id}>
                    <EventCard event={event} />
                  </li>
                ))}
              </ul>
              {state.events.length < state.total ? (
                <div className="flex justify-center">
                  <Button variant="secondary" onClick={loadMore} isLoading={state.loadingMore}>
                    Load more events
                  </Button>
                </div>
              ) : (
                <p className="text-center text-sm leading-[1.5] text-fg-muted">You&apos;ve reached the end of the list.</p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function Pill({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={[
        'inline-flex h-12 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-semibold leading-[17px] transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        pressed
          ? 'border-2 border-accent bg-accent-soft text-accent'
          : 'border border-line-strong bg-surface-card text-fg hover:border-fg-muted',
      ].join(' ')}
    >
      {pressed && <Icon name="check" size={16} />}
      {children}
    </button>
  );
}

function DateSelect({ value, onChange }: { value: DatePreset; onChange: (value: DatePreset) => void }) {
  return (
    <div className="relative flex items-center gap-2 text-sm text-fg-muted lg:ml-auto">
      <Icon name="calendar" className="pointer-events-none absolute left-0" />
      <label htmlFor="date-filter" className="sr-only">
        Date
      </label>
      <select
        id="date-filter"
        value={value}
        onChange={(e) => onChange(e.target.value as DatePreset)}
        className="h-12 cursor-pointer appearance-none bg-transparent pl-7 pr-6 leading-[17px] text-fg-muted hover:text-fg focus:outline-none focus-visible:text-fg"
      >
        {DATE_PRESETS.map((p) => (
          <option key={p.value} value={p.value} className="bg-surface-card text-fg">
            {p.label}
          </option>
        ))}
      </select>
      <Icon name="chevronDown" size={16} className="pointer-events-none absolute right-0" />
    </div>
  );
}

function Message({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-line bg-surface-card px-6 py-12 text-center">
      <h2 className="text-xl font-bold text-fg">{title}</h2>
      <p className="text-sm text-fg-muted">{text}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading events">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="h-[380px] animate-pulse rounded-lg border border-line bg-surface-card" />
      ))}
    </ul>
  );
}
