/**
 * features/discovery/EventDetailPage.tsx
 * Matches design 02-Event-detail.
 */
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { PublicEventDetail } from '@argon/shared';
import { api, ApiRequestError } from '@/lib/api';
import { CATEGORY_LABELS } from '@/lib/eventLabels';
import { clockTime, dotDate, fitSize, longDate, money, parseDescription, shortMoney, titleLines } from '@/lib/publicFormat';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { BackLink } from '../../components/public/Brand';
import { Arches, CoverPhoto, Dots, Outline, SUNRISE } from '../../components/public/PosterArt';

type DetailState =
  | { kind: 'loading' }
  | { kind: 'notFound' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; event: PublicEventDetail };

const LOW_STOCK = 50;
const MAX_PER_BOOKING = 10;
const POLICIES = ['QR entry · one scan per ticket', 'Ages 16+', 'No re-entry'];

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState<DetailState>({ kind: 'loading' });
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });
    api
      .get<PublicEventDetail>(`/events/${id}`)
      .then((event) => {
        if (cancelled) return;
        setState({ kind: 'ready', event });
        setSelectedTierId(event.tiers.find((t) => t.remaining > 0)?.id ?? null);
      })
      .catch((error: Error) => {
        if (cancelled) return;
        const missing = error instanceof ApiRequestError && (error.status === 404 || error.status === 400);
        setState(missing ? { kind: 'notFound' } : { kind: 'error', message: error.message });
      });
    return () => { cancelled = true; };
  }, [id]);

  const goBack = () => (location.key === 'default' ? navigate('/') : navigate(-1));

  if (state.kind !== 'ready') {
    return (
      <div className="flex min-h-screen flex-col bg-ink text-white">
        <Header />
        <div className="ag-wrap flex-1 py-[38px]">
          {state.kind === 'loading' ? (
            <div className="h-[440px] animate-pulse bg-ink-raised" />
          ) : (
            <>
              <BackLink onClick={goBack}>All events</BackLink>
              <div className="mt-6 border border-white/15 bg-ink-raised px-6 py-12 text-center">
                <h1 className="text-xl font-black">{state.kind === 'notFound' ? 'Event not found' : "Couldn't load this event"}</h1>
                <p className="mt-2 text-sm text-peach-soft">
                  {state.kind === 'notFound' ? 'It may have been cancelled or is no longer available.' : state.message}
                </p>
                <Link to="/" className="mt-4 inline-block text-sm font-extrabold uppercase tracking-[0.06em] text-peach underline">Browse events →</Link>
              </div>
            </>
          )}
        </div>
        <Footer compact className="bg-ink-foot" />
      </div>
    );
  }

  const { event } = state;
  const hasStarted = new Date(event.startsAt).getTime() <= Date.now();
  const selectedTier = event.tiers.find((t) => t.id === selectedTierId) ?? null;
  const maxQuantity = selectedTier ? Math.min(MAX_PER_BOOKING, selectedTier.remaining) : 1;
  const qty = Math.min(quantity, Math.max(1, maxQuantity));
  const total = selectedTier ? selectedTier.price * qty : 0;
  const daysUntil = Math.ceil((new Date(event.startsAt).getTime() - Date.now()) / 86_400_000);
  const { about, schedule } = parseDescription(event.description);
  const parts = titleLines(event.title);
  const longest = parts.reduce((a, b) => (a.length > b.length ? a : b));
  const titleSize = fitSize(96, longest, 12);
  const running = schedule.length > 0 ? schedule : [{ time: clockTime(event.startsAt), label: 'Doors open' }];

  return (
    <div className="flex min-h-screen flex-col bg-ink text-white">
      <Header />

      <main className="ag-wrap flex-1 pb-[96px]">
        <div className="pb-[12px] pt-[32px]">
          <BackLink onClick={goBack}>All events</BackLink>
        </div>

        {/* Hero */}
        <div className="relative h-[300px] overflow-hidden lg:h-[440px]" style={{ background: SUNRISE }}>
          <CoverPhoto src={event.coverImageUrl} />
          <Dots from="55%" />
          <Arches cx={920} cy={520} ring={330} discs={[259, 189, 119]} />
          <Outline text={dotDate(event.startsAt)} size={312} color="#fff" opacity={0.85} width={3} className="right-[54px] top-[156px] hidden tracking-[-0.03em] lg:block" />
          <div className="absolute left-[16px] top-[16px] flex gap-[8px] lg:left-[40px] lg:top-[40px]">
            <span className="flex h-[27px] items-center bg-ink px-[12px] text-[12px] font-extrabold uppercase tracking-[0.08em] text-white">
              {CATEGORY_LABELS[event.category]}
            </span>
            {daysUntil > 0 && (
              <span className="flex h-[27px] items-center bg-white px-[12px] text-[12px] font-extrabold uppercase tracking-[0.08em] text-blood">
                Starts in {daysUntil} {daysUntil === 1 ? 'day' : 'days'}
              </span>
            )}
          </div>
          <h1 className="ag-display absolute bottom-[40px] left-[16px] right-[16px] text-ink lg:left-[40px]" style={{ fontSize: `min(${titleSize}px, 11vw)` }}>
            {parts.map((p) => <span key={p} className="block">{p}</span>)}
          </h1>
        </div>

        <div className="mt-[40px] grid grid-cols-1 items-start gap-10 lg:grid-cols-[820px_380px]">
          <div className="min-w-0">
            {/* Facts */}
            <dl className="grid grid-cols-1 sm:grid-cols-3">
              {[
                ['Date', longDate(event.startsAt)],
                ['Doors', `${clockTime(event.startsAt)} ICT`],
                ['Venue', event.venue],
              ].map(([label, value], i) => (
                <div key={label} className={`min-h-[81px] py-[18px] pl-[20px] ${i > 0 ? 'sm:border-l sm:border-white/20' : ''}`}>
                  <dt className="ag-label text-peach">{label}</dt>
                  <dd className="mt-[2px] text-[22px] font-extrabold leading-[28px] tracking-[-0.03em]">{value}</dd>
                </div>
              ))}
            </dl>

            <section className="mt-[34px] max-w-[690px]">
              <h2 className="ag-display text-[33px] leading-[40px] tracking-[-0.03em]">About this event</h2>
              <p className="mt-[14px] text-[17.2px] leading-[29px] text-peach-soft">
                {about || "The organizer hasn't added a description yet."}
              </p>
            </section>

            <section className="mt-[36px]">
              <h2 className="ag-display text-[33px] leading-[40px] tracking-[-0.03em]">Running order</h2>
              <ul className="mt-[15px] border-t-2 border-white">
                {running.map((row) => (
                  <li key={`${row.time}${row.label}`} className="flex h-[53px] items-center justify-between border-b border-white/15 text-[17px]">
                    <span className="font-extrabold tracking-[-0.02em]">{row.label}</span>
                    <span className="text-peach-soft">{row.time}</span>
                  </li>
                ))}
              </ul>
            </section>

            <ul className="mt-[36px] flex flex-wrap gap-[12px]">
              {POLICIES.map((tag) => (
                <li key={tag} className="flex h-[39px] items-center border border-white/30 px-[14px] text-[14px]">{tag}</li>
              ))}
            </ul>
          </div>

          {/* Tickets */}
          <aside className="bg-white text-ink">
            <div className="flex h-[75px] items-center justify-between bg-flame px-[24px] text-white">
              <h2 className="ag-display text-[27px] tracking-[-0.03em]">Tickets</h2>
              <span className="text-[14px] font-extrabold tracking-[-0.01em]">USD · incl. VAT</span>
            </div>
            <div className="px-[24px] pb-[26px] pt-[12px]">
              <div role="radiogroup" aria-label="Ticket tier">
                {event.tiers.map((tier) => {
                  const soldOut = tier.remaining === 0;
                  const low = !soldOut && tier.remaining <= LOW_STOCK;
                  const selected = tier.id === selectedTierId;
                  return (
                    <label key={tier.id} className={`flex h-[73px] items-center gap-[17px] border-b border-ink/15 pl-[5px] ${soldOut ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                      <input
                        type="radio"
                        name="tier"
                        className="sr-only"
                        checked={selected}
                        disabled={soldOut}
                        onChange={() => setSelectedTierId(tier.id)}
                      />
                      <span aria-hidden="true" className={`flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full border ${selected ? 'border-flame' : soldOut ? 'border-ink/15' : 'border-ink/60'}`}>
                        {selected && <span className="h-[12px] w-[12px] rounded-full bg-flame" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-[17px] font-extrabold leading-[22px] tracking-[-0.03em] ${soldOut ? 'opacity-50' : ''}`}>{tier.name}</span>
                        <span className={`block text-[13px] leading-[18px] ${low ? 'font-bold text-blood' : soldOut ? 'text-ink/45' : 'text-peach-muted'}`}>
                          {soldOut ? 'Sold out' : low ? `Only ${tier.remaining} left` : `${/general/i.test(tier.name) ? 'Standing · ' : ''}${tier.remaining} left`}
                        </span>
                      </span>
                      <span className={`text-[19px] font-black tracking-[-0.03em] ${soldOut ? 'text-ink/50 line-through' : ''}`}>{shortMoney(tier.price)}</span>
                    </label>
                  );
                })}
              </div>

              {selectedTier && (
                <>
                  <div className="mt-[18px] flex items-center justify-between">
                    <span className="text-[16px] font-extrabold tracking-[-0.02em]">Quantity</span>
                    <div className="flex h-[48px] w-[136px] items-center justify-between border-2 border-ink text-[20px] font-black">
                      <button type="button" aria-label="Fewer tickets" disabled={qty <= 1} onClick={() => setQuantity(qty - 1)} className="h-full w-[44px] disabled:opacity-40">−</button>
                      <span aria-live="polite">{qty}</span>
                      <button type="button" aria-label="More tickets" disabled={qty >= maxQuantity} onClick={() => setQuantity(qty + 1)} className="h-full w-[44px] disabled:opacity-40">+</button>
                    </div>
                  </div>
                  <div className="mt-[18px] flex items-center justify-between border-t-2 border-ink pt-[10px]">
                    <span className="text-[24px] font-black tracking-[-0.03em]">Total</span>
                    <span className="text-[25px] font-black tracking-[-0.03em]">{money(total)}</span>
                  </div>
                </>
              )}

              {hasStarted ? (
                <p className="mt-[12px] border border-ink/20 py-[16px] text-center text-sm font-bold">This event has started</p>
              ) : selectedTier ? (
                <Link
                  to={`/checkout/${selectedTier.id}?event=${event.id}&qty=${qty}`}
                  state={{ event, quantity: qty }}
                  className="mt-[6px] flex h-[56px] items-center justify-center bg-flame text-[16px] font-black uppercase tracking-[0.04em] text-white transition hover:bg-blood"
                >
                  Reserve tickets
                </Link>
              ) : (
                <p className="mt-[12px] border border-ink/20 py-[16px] text-center text-sm font-bold">Sold out</p>
              )}

              {selectedTier && (
                <p className="mt-[12px] text-[13px] leading-[18px] text-peach-muted">Your tickets are held for 10 minutes while you pay.</p>
              )}
            </div>
          </aside>
        </div>
      </main>

      <Footer compact className="bg-ink-foot" />
    </div>
  );
}
