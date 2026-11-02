/**
 * features/discovery/EventCatalogPage.tsx
 * Customer event feed: grid of published events with filters and search.
 * Rendered inside PublicLayout — do NOT add Header/Footer here.
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { PaginatedResponse, PublicEvent } from '@argon/shared';
import { EventCategory } from '@argon/shared';
import { api, ApiRequestError } from '@/lib/api';
import { CATEGORY_LABELS } from '@/lib/eventLabels';
import { EventCard } from './EventCard';
import { SearchBar } from './SearchBar';
import { DATE_PRESETS, isDatePreset, presetRange, type DatePreset } from './datePresets';

type FeedState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: PaginatedResponse<PublicEvent> };

const PAGE_SIZE = 12;

export default function EventCatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? '';
  const datePreset = isDatePreset(searchParams.get('date')) ? (searchParams.get('date') as DatePreset) : 'any';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));

  const [state, setState] = useState<FeedState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });

    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category) params.set('category', category);
    const range = presetRange(datePreset);
    if (range.from) params.set('from', range.from);
    if (range.to) params.set('to', range.to);
    params.set('page', String(page));
    params.set('pageSize', String(PAGE_SIZE));

    api
      .get<PaginatedResponse<PublicEvent>>(`/events?${params.toString()}`)
      .then((data) => !cancelled && setState({ kind: 'ready', data }))
      .catch((err: Error) => {
        if (cancelled) return;
        const msg = err instanceof ApiRequestError ? err.message : "Couldn't load events.";
        setState({ kind: 'error', message: msg });
      });

    return () => { cancelled = true; };
  }, [q, category, datePreset, page]);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const totalPages = state.kind === 'ready' ? Math.ceil(state.data.total / PAGE_SIZE) : 1;

  return (
    <div className="flex flex-col gap-8">
      {/* Filters */}
      <div className="flex flex-col gap-4">
        <SearchBar value={q} onSearch={(v) => setParam('q', v)} />

        <div className="flex flex-wrap items-center gap-2">
          {/* Category chips */}
          <button
            onClick={() => setParam('category', '')}
            className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
              !category
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-line bg-surface-card text-fg-muted hover:border-line-strong hover:text-fg'
            }`}
          >
            All
          </button>
          {Object.values(EventCategory).map((cat) => (
            <button
              key={cat}
              onClick={() => setParam('category', category === cat ? '' : cat)}
              className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                category === cat
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-line bg-surface-card text-fg-muted hover:border-line-strong hover:text-fg'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Date presets */}
        <div className="flex flex-wrap items-center gap-2">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => setParam('date', preset.value === 'any' ? '' : preset.value)}
              className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                datePreset === preset.value
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-line bg-surface-card text-fg-muted hover:border-line-strong hover:text-fg'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {state.kind === 'loading' && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} className="h-[340px] animate-pulse rounded-lg bg-surface-card" />
          ))}
        </div>
      )}

      {state.kind === 'error' && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-line bg-surface-card px-6 py-12 text-center">
          <p className="text-base font-semibold text-fg">Couldn't load events</p>
          <p className="text-sm text-fg-muted">{state.message}</p>
        </div>
      )}

      {state.kind === 'ready' && state.data.data.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-line bg-surface-card px-6 py-12 text-center">
          <p className="text-base font-semibold text-fg">No events match</p>
          <p className="text-sm text-fg-muted">Try adjusting your filters or search term.</p>
        </div>
      )}

      {state.kind === 'ready' && state.data.data.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {state.data.data.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setParam('page', String(page - 1))}
                className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-fg-muted transition hover:border-line-strong hover:text-fg disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-fg-muted">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setParam('page', String(page + 1))}
                className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-fg-muted transition hover:border-line-strong hover:text-fg disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
