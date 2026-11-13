/**
 * features/tickets/MyTicketsPage.tsx
 * Matches design 07-My-tickets.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { TicketStatus } from '@argon/shared';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { EMBER, SUNRISE } from '../../components/public/PosterArt';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api';
import { clockTime, countdown, dayMonth, forgetHold, readHolds, type PendingHold } from '../../lib/publicFormat';

interface ApiTicket {
  id: string;
  orderNumber: string;
  eventId: string;
  eventTitle: string;
  eventVenue: string;
  eventStartsAt: string | null;
  tierName: string;
  status: TicketStatus;
  qrToken: string;
  checkedInAt: string | null;
  createdAt: string;
}

type FilterTab = 'all' | 'upcoming' | 'past';

const isUpcoming = (t: ApiTicket) =>
  t.status === TicketStatus.ACTIVE && (!t.eventStartsAt || new Date(t.eventStartsAt).getTime() > Date.now());

/** Date stub on the left of a ticket, with the perforated edge. */
function Stub({ iso, background, color = 'text-white' }: { iso: string | null; background: string; color?: string }) {
  const { day, month } = iso ? dayMonth(iso) : { day: '—', month: '' };
  return (
    <div className={`relative flex w-[149px] shrink-0 items-end border-r-2 border-dashed border-peach/60 p-[14px] ${color}`} style={{ background }}>
      <p className="ag-display text-[42px] leading-[35px] tracking-[-0.03em]">{day}<br />{month}</p>
    </div>
  );
}

function TicketCard({ iso, stub, stubColor, badge, title, meta, cta }: { iso: string | null; stub: string; stubColor?: string; badge: ReactNode; title: string; meta: string; cta: ReactNode }) {
  return (
    <article className="flex min-h-[202px] bg-white text-ink">
      <Stub iso={iso} background={stub} color={stubColor} />
      <div className="min-w-0 flex-1 px-[21px] pb-[20px] pt-[20px]">
        {badge}
        <h2 className="ag-display mt-[9px] text-[24px] leading-[23px] tracking-[-0.03em]">{title}</h2>
        <p className="mt-[5px] text-[14px] leading-[20px] text-peach-muted">{meta}</p>
        <div className="mt-[12px]">{cta}</div>
      </div>
    </article>
  );
}

const ctaClass = 'inline-flex h-[44px] items-center px-[16px] text-[14px] font-black uppercase tracking-[0.04em] text-white transition';

export default function MyTicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<ApiTicket[]>([]);
  const [holds, setHolds] = useState<PendingHold[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('upcoming');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    api.get<ApiTicket[]>('/tickets/my')
      .then(setTickets)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load tickets'))
      .finally(() => setLoading(false));
  }, []);

  // Holds are remembered locally, so confirm each one is still unpaid before offering it.
  const userId = user?.sub;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    Promise.all(
      readHolds(userId).map((hold) =>
        api.get<{ status: string }>(`/bookings/${hold.id}`)
          .then(({ status }) => {
            if (status === 'PENDING') return hold;
            forgetHold(userId, hold.id);
            return null;
          })
          .catch(() => null),
      ),
    ).then((checked) => {
      if (!cancelled) setHolds(checked.filter((h): h is PendingHold => h !== null));
    });
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (holds.length === 0) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [holds.length]);

  /** "Ticket 1 of 2", counted within each order. */
  const positions = useMemo(() => {
    const groups = new Map<string, ApiTicket[]>();
    for (const t of tickets) groups.set(t.orderNumber, [...(groups.get(t.orderNumber) ?? []), t]);
    const result = new Map<string, string>();
    for (const group of groups.values()) {
      [...group]
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
        .forEach((t, i) => result.set(t.id, `Ticket ${i + 1} of ${group.length}`));
    }
    return result;
  }, [tickets]);

  const liveHolds = holds.filter((h) => new Date(h.expiresAt).getTime() > now);
  const upcoming = tickets
    .filter(isUpcoming)
    .sort((a, b) => (a.eventStartsAt ?? '').localeCompare(b.eventStartsAt ?? '') || (positions.get(a.id) ?? '').localeCompare(positions.get(b.id) ?? ''));
  const past = tickets.filter((t) => !isUpcoming(t));
  const upcomingCount = upcoming.length + liveHolds.length;
  // As designed, the Upcoming view keeps attended shows below; revoked tickets need All or Past.
  const shownPast = activeTab === 'upcoming' ? past.filter((t) => t.status === TicketStatus.CHECKED_IN) : past;

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All tickets' },
    { key: 'upcoming', label: `Upcoming · ${upcomingCount}` },
    { key: 'past', label: 'Past events' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-ink text-white">
      <Header />

      <main className="ag-wrap flex-1 pb-[64px] pt-[48px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="ag-display text-[clamp(56px,6.7vw,96px)] leading-[0.84]">My<br />tickets</h1>
          <div className="flex flex-wrap gap-[6px]">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                aria-pressed={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`h-[44px] border px-[18px] text-[16px] font-extrabold tracking-[-0.02em] transition ${
                  activeTab === tab.key ? 'border-white bg-white text-blood-deep' : 'border-white/30 text-white hover:border-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading && <div className="mt-[40px] h-[202px] animate-pulse bg-ink-raised" />}
        {error && <p role="alert" className="mt-[40px] border border-red-500/40 bg-red-900/20 px-4 py-3 text-sm text-red-300">{error}</p>}

        {!loading && !error && (
          <>
            {activeTab !== 'past' && (
              upcomingCount === 0 ? (
                <div className="mt-[40px] border border-white/15 bg-ink-raised px-6 py-12 text-center">
                  <h2 className="ag-display text-[24px] leading-[28px]">No upcoming tickets</h2>
                  <p className="mt-2 text-sm text-peach-soft">Pick a night and book your pass.</p>
                  <Link to="/" className={`${ctaClass} mt-4 bg-flame hover:bg-blood`}>Browse events</Link>
                </div>
              ) : (
                <div className="mt-[40px] grid grid-cols-1 gap-[20px] md:grid-cols-2 xl:grid-cols-3">
                  {upcoming.map((t) => (
                    <TicketCard
                      key={t.id}
                      iso={t.eventStartsAt}
                      stub={SUNRISE}
                      badge={<span className="inline-flex h-[23px] items-center bg-green-100 px-[10px] text-[12px] font-extrabold uppercase tracking-[0.06em] text-green-900">Active</span>}
                      title={t.eventTitle}
                      meta={`${t.tierName} · ${positions.get(t.id)}`}
                      cta={<Link to={`/tickets/${t.id}`} className={`${ctaClass} bg-flame hover:bg-blood`}>View QR pass</Link>}
                    />
                  ))}
                  {liveHolds.map((h) => (
                    <TicketCard
                      key={h.id}
                      iso={h.eventStartsAt}
                      stub={EMBER}
                      stubColor="text-cream"
                      badge={<span className="inline-flex h-[23px] items-center bg-amber-100 px-[10px] text-[12px] font-extrabold uppercase tracking-[0.06em] text-amber-900">Payment pending</span>}
                      title={h.eventTitle}
                      meta={`${h.tierName} · hold expires in ${countdown(Math.floor((new Date(h.expiresAt).getTime() - now) / 1000))}`}
                      cta={<Link to={`/payment/${h.id}`} className={`${ctaClass} bg-ink hover:bg-blood`}>Finish payment</Link>}
                    />
                  ))}
                </div>
              )
            )}

            {activeTab !== 'all' || past.length > 0 ? (
              <section className="mt-[56px] border-t-2 border-white pt-[20px]">
                <h2 className="text-[20px] font-black uppercase leading-[26px] tracking-[0.14em]">Past events</h2>
                {shownPast.length === 0 ? (
                  <p className="mt-4 text-sm text-peach-soft">No past events yet.</p>
                ) : (
                  <ul className="mt-[19px] flex flex-col gap-[12px]">
                    {shownPast.map((t) => {
                      const { day, month } = t.eventStartsAt ? dayMonth(t.eventStartsAt) : { day: '—', month: '' };
                      const checkedIn = t.status === TicketStatus.CHECKED_IN;
                      return (
                        <li key={t.id}>
                          <Link to={`/tickets/${t.id}`} className="flex min-h-[121px] border border-white/15 bg-ink-raised transition hover:border-white/40">
                            <div className="flex w-[150px] shrink-0 items-end border-r-2 border-dashed border-white/25 bg-[#2A0A0A] p-[14px] text-[#EBC9BC]">
                              <p className="ag-display text-[42px] leading-[35px] tracking-[-0.03em]">{day}<br />{month}</p>
                            </div>
                            <div className="min-w-0 px-[21px] py-[19px]">
                              <span className="inline-flex h-[23px] items-center bg-[#3A2A2A] px-[10px] text-[12px] font-extrabold uppercase tracking-[0.06em] text-peach-soft">
                                {checkedIn ? `Checked in${t.checkedInAt ? ` · ${clockTime(t.checkedInAt)}` : ''}` : t.status === TicketStatus.REVOKED ? 'Revoked' : 'Not used'}
                              </span>
                              <h3 className="ag-display mt-[9px] text-[24px] leading-[24px] tracking-[-0.03em]">{t.eventTitle}</h3>
                              <p className="mt-[4px] text-[14px] leading-[20px] text-peach-soft">{t.tierName} · {t.eventVenue}</p>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            ) : null}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
