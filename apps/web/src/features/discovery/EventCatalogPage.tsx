/**
 * features/discovery/EventCatalogPage.tsx
 * "/" shows the next six events.
 * "/events" uses the same cards and adds the filters and paging the full catalog needs.
 */
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { PaginatedResponse, PublicEvent } from '@argon/shared';
import { EventCategory } from '@argon/shared';
import { api, ApiRequestError } from '@/lib/api';
import { CATEGORY_LABELS } from '@/lib/eventLabels';
import { lineupLabel } from '@/lib/publicFormat';
import { EventCard } from './EventCard';
import { DATE_PRESETS, isDatePreset, presetRange, type DatePreset } from './datePresets';
import { Header } from '../../components/layout/Header';
import { Arrow } from '../../components/public/Brand';
import { Footer } from '../../components/layout/Footer';

type FeedState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: PaginatedResponse<PublicEvent> };

const HOME_SIZE = 6;
const CATALOG_SIZE = 12;

const TIERS = [
  { num: '01', name: 'General', desc: 'Standing, walk-in entry', price: 'From $15', light: false },
  { num: '02', name: 'Golden Circle', desc: 'Closest to the stage', price: 'From $35', light: false },
  { num: '03', name: 'VIP Booth', desc: 'Private booth, best view', price: 'From $80', light: true },
];

function HeroRibbons() {
  return (
    <svg aria-hidden="true" viewBox="0 0 1440 432" preserveAspectRatio="xMidYMin slice" className="pointer-events-none absolute inset-0 hidden h-[432px] w-full lg:block">
      <defs>
        <linearGradient id="ribbonL" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D8392A" />
          <stop offset=".3" stopColor="#B4150F" />
          <stop offset=".7" stopColor="#A81310" />
          <stop offset="1" stopColor="#6E0B0A" />
        </linearGradient>
        <linearGradient id="ribbonR" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B81D16" />
          <stop offset=".5" stopColor="#8E1610" />
          <stop offset="1" stopColor="#6E0B0A" />
        </linearGradient>
      </defs>
      <path d="M-10 62C60 58 132 88 130 150C128 215 42 250 40 318C39 360 130 405 200 432H118C60 410 -2 372 0 322C2 262 88 222 92 158C95 118 50 98 -10 98Z" fill="url(#ribbonL)" />
      <path d="M-10 80C60 78 113 104 111 154C109 216 22 254 20 320C19 366 100 408 158 432" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="1.5" strokeDasharray="1 9" strokeLinecap="round" />
      <path d="M1440 38C1380 66 1362 140 1350 208C1338 282 1254 318 1254 372C1254 400 1296 420 1330 432H1368C1330 415 1284 398 1288 368C1294 326 1376 300 1396 212C1408 158 1412 106 1440 84Z" fill="url(#ribbonR)" />
    </svg>
  );
}

export default function EventCatalogPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isCatalog = location.pathname.startsWith('/events');
  const pageSize = isCatalog ? CATALOG_SIZE : HOME_SIZE;

  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const [searchInput, setSearchInput] = useState(q);

  useEffect(() => {
    setSearchInput(q);
  }, [q]);
  const category = searchParams.get('category') ?? '';
  const rawDate = searchParams.get('date');
  const datePreset: DatePreset = isDatePreset(rawDate) ? rawDate : 'any';
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
    params.set('pageSize', String(pageSize));

    api
      .get<PaginatedResponse<PublicEvent>>(`/events?${params.toString()}`)
      .then((data) => !cancelled && setState({ kind: 'ready', data }))
      .catch((err: Error) => {
        if (cancelled) return;
        setState({ kind: 'error', message: err instanceof ApiRequestError ? err.message : "Couldn't load events." });
      });

    return () => { cancelled = true; };
  }, [q, category, datePreset, page, pageSize]);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = searchInput.trim();
    if (isCatalog) setParam('q', term);
    else navigate(term ? `/events?q=${encodeURIComponent(term)}` : '/events');
  };

  const events = state.kind === 'ready' ? state.data.data : [];
  const totalPages = state.kind === 'ready' ? Math.max(1, Math.ceil(state.data.total / pageSize)) : 1;
  const nights = state.kind === 'ready' ? state.data.total : 0;

  const chip = (active: boolean) =>
    `border px-[14px] py-[7px] text-[12px] font-extrabold uppercase tracking-[0.06em] transition ${
      active ? 'border-white bg-white text-blood-deep' : 'border-white/30 text-peach-soft hover:border-white hover:text-white'
    }`;

  return (
    <div className="flex min-h-screen flex-col bg-ink text-white">
      {/* Hero, with the red wash fading from the top of the page */}
      <div
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(180deg,rgba(20,4,4,0) 0px,#140404 432px),linear-gradient(90deg,#1E0404 0%,#510707 50%,#6C0A0A 100%)' }}
      >
        <HeroRibbons />
        <Header overlay />
        <section className="ag-wrap relative z-10 flex flex-col gap-8 pb-[82px] pt-[44px] lg:h-[364px] lg:flex-row lg:items-start lg:justify-between lg:pb-0 lg:pt-[74px]">
          <div className="relative">
            <h1 className="ag-display text-[clamp(56px,8.9vw,128px)]">
              <span className="block whitespace-nowrap">Upcoming</span>
              <span className="block whitespace-nowrap">
                On stage
                {nights > 0 && (
                  <span className="relative top-[-16px] ml-[18px] hidden -rotate-[4deg] rounded-full bg-white px-[24px] py-[10px] align-middle text-[24px] font-black leading-[30px] tracking-[0.01em] text-blood-deep lg:inline-block">
                    {nights} {nights === 1 ? 'night' : 'nights'}
                  </span>
                )}
              </span>
            </h1>
          </div>

          <div className="w-full lg:mt-[65px] lg:w-[360px]">
            <p className="text-[16px] leading-[24px] text-[#FFE6DC]">
              Concerts, festivals and live shows across Cambodia. Pick a tier, pay with KHQR, walk in with a QR pass.
            </p>
            <form onSubmit={handleSearch} role="search" className="mt-[18px] flex h-[62px] border-2 border-white">
              <label className="flex min-w-0 flex-1 flex-col justify-center px-[14px]">
                <span className="text-[11px] font-extrabold uppercase leading-[14px] tracking-[0.12em] text-peach">Search</span>
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Artist, club or city"
                  className="mt-[2px] w-full bg-transparent text-[16px] leading-[22px] text-white outline-none placeholder:text-white/50"
                />
              </label>
              <button type="submit" className="w-[70px] bg-flame text-[14px] font-black uppercase tracking-[0.04em] text-white transition hover:bg-blood">
                Go
              </button>
            </form>
          </div>
        </section>
      </div>

      {/* Lineup */}
      <div style={{ background: 'linear-gradient(180deg,#140404 0%,#290606 100%)' }}>
        <main className="ag-wrap border-t-[1.5px] border-white pb-[96px]">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-[24px] pt-[26px]">
            <h2 className="text-[22px] font-black uppercase leading-[26px] tracking-[0.12em]">
              {isCatalog ? 'All events' : `Lineup · ${lineupLabel(events)}`}
            </h2>
            {!isCatalog && (
              <Link to="/events" className="text-[14px] font-extrabold uppercase tracking-[0.06em] text-peach-soft underline underline-offset-[3px] hover:text-white">
                See all events <Arrow />
              </Link>
            )}
          </div>

          {isCatalog && (
            <div className="mb-[24px] flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setParam('category', '')} className={chip(!category)}>All</button>
                {Object.values(EventCategory).map((cat) => (
                  <button key={cat} type="button" onClick={() => setParam('category', category === cat ? '' : cat)} className={chip(category === cat)}>
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {DATE_PRESETS.map((preset) => (
                  <button key={preset.value} type="button" onClick={() => setParam('date', preset.value === 'any' ? '' : preset.value)} className={chip(datePreset === preset.value)}>
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {state.kind === 'loading' && (
            <div className="grid grid-cols-1 gap-[20px] sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((n) => <div key={n} className="h-[440px] animate-pulse bg-ink-raised" />)}
            </div>
          )}

          {state.kind === 'error' && (
            <div className="border border-white/15 bg-ink-raised px-6 py-12 text-center">
              <p className="text-base font-bold text-white">Couldn't load events</p>
              <p className="mt-1 text-sm text-peach-soft">{state.message}</p>
            </div>
          )}

          {state.kind === 'ready' && events.length === 0 && (
            <div className="border border-white/15 bg-ink-raised px-6 py-12 text-center">
              <p className="text-base font-bold text-white">No events match</p>
              <p className="mt-1 text-sm text-peach-soft">Try adjusting your filters or search term.</p>
            </div>
          )}

          {events.length > 0 && (
            <div className="grid grid-cols-1 gap-[20px] sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => <EventCard key={event.id} event={event} />)}
            </div>
          )}

          {isCatalog && totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setParam('page', String(page - 1))} className={`${chip(false)} disabled:opacity-40`}>Previous</button>
              <span className="px-4 text-sm text-peach-soft">Page {page} of {totalPages}</span>
              <button type="button" disabled={page >= totalPages} onClick={() => setParam('page', String(page + 1))} className={`${chip(false)} disabled:opacity-40`}>Next</button>
            </div>
          )}
        </main>
      </div>

      {/* Pick your tier */}
      <section className="bg-flame">
        <div className="ag-wrap flex flex-col gap-8 py-[64px] lg:flex-row lg:items-center lg:justify-between">
          <h2 className="ag-display text-[64px] leading-[58px]">Pick your<br />tier.</h2>
          <div className="grid gap-[16px] md:grid-cols-3 lg:w-[739px]">
            {TIERS.map((tier) => (
              <div key={tier.num} className={`h-[158px] px-[22px] pt-[22px] ${tier.light ? 'bg-white text-ink' : 'bg-ink text-white'}`}>
                <p className={`text-[11px] font-extrabold leading-[14px] tracking-[0.14em] ${tier.light ? 'text-blood' : 'text-peach'}`}>{tier.num}</p>
                <h3 className="mt-[8px] text-[24px] font-black uppercase leading-[30px] tracking-[-0.04em]">{tier.name}</h3>
                <p className="mt-[8px] text-[14px] leading-[20px]">{tier.desc}</p>
                <p className="mt-[12px] text-[18px] font-extrabold leading-[24px] tracking-[-0.02em]">{tier.price}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
