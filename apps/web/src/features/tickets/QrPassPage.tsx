/**
 * features/tickets/QrPassPage.tsx
 * Matches design 08-QR-pass. Prices come from the event's tiers, because the
 * tickets endpoint doesn't return them.
 */
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { TicketStatus, type PublicEventDetail } from '@argon/shared';
import { Arrow, ArgonLogo, BrandQr } from '../../components/public/Brand';
import { Arches, SUNRISE } from '../../components/public/PosterArt';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api';
import { clockTime, fitSize, longDate, money, nameFromEmail, SERVICE_FEE, ticketCode, titleLines } from '../../lib/publicFormat';

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

const PAGE_BG = 'linear-gradient(180deg,#440707 0%,#260505 33%,#140404 90%)';

function PassHeader() {
  return (
    <header className="border-b border-white/15">
      <div className="ag-wrap flex h-[80px] items-center justify-between">
        <ArgonLogo />
        <Link to="/tickets" className="text-[14px] font-extrabold uppercase tracking-[0.06em] text-peach transition-colors hover:text-white"><Arrow left /> My tickets</Link>
      </div>
    </header>
  );
}

const fieldLabel = 'text-[11px] font-extrabold uppercase leading-[14px] tracking-[0.12em] text-[#8A5A4E]';
const fieldValue = 'mt-[3px] text-[17px] font-extrabold leading-[22px] tracking-[-0.03em]';

export default function QrPassPage() {
  const { id } = useParams<{ id?: string }>();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<ApiTicket[]>([]);
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    api.get<ApiTicket[]>('/tickets/my')
      .then(setTickets)
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  }, []);

  const ticket = tickets.find((t) => t.id === id);
  const eventId = ticket?.eventId;
  const tierName = ticket?.tierName;

  useEffect(() => {
    setPrice(null);
    if (!eventId) return;
    let cancelled = false;
    api.get<PublicEventDetail>(`/events/${eventId}`)
      .then((event) => {
        if (!cancelled) setPrice(event.tiers.find((t) => t.name === tierName)?.price ?? null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [eventId, tierName]);

  if (loading || !ticket) {
    return (
      <div className="flex min-h-screen flex-col text-white" style={{ background: PAGE_BG }}>
        <PassHeader />
        {loading ? (
          <div className="mx-auto mt-[49px] h-[700px] w-[480px] max-w-[calc(100%-32px)] animate-pulse bg-ink-raised" />
        ) : (
          <div className="ag-wrap py-16 text-center">
            <h1 className="ag-display text-[32px] leading-[36px]">{loadFailed ? "Couldn't load this ticket" : 'Ticket not found'}</h1>
            <p className="mt-2 text-peach-soft">{loadFailed ? 'Check your connection and try again.' : 'This ticket isn’t on your account.'}</p>
          </div>
        )}
      </div>
    );
  }

  const order = tickets
    .filter((t) => t.orderNumber === ticket.orderNumber)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const position = order.findIndex((t) => t.id === ticket.id) + 1;
  const next = order[position];
  const subtotal = price === null ? null : price * order.length;
  const checkedIn = ticket.status === TicketStatus.CHECKED_IN;
  const revoked = ticket.status === TicketStatus.REVOKED;

  const parts = titleLines(ticket.eventTitle);
  const longest = parts.reduce((a, b) => (a.length > b.length ? a : b));
  const titleSize = fitSize(46, longest, 13);
  const dateLine = ticket.eventStartsAt
    ? `${longDate(ticket.eventStartsAt)} · Doors ${clockTime(ticket.eventStartsAt)}`
    : 'Date to be confirmed';
  const paidAt = new Date(ticket.createdAt);
  const paidOn = `${paidAt.toLocaleDateString('en-GB', { timeZone: 'Asia/Phnom_Penh', day: 'numeric', month: 'short', year: 'numeric' })}, ${clockTime(ticket.createdAt)}`;

  return (
    <div className="min-h-screen text-white" style={{ background: PAGE_BG }}>
      <PassHeader />

      <main className="ag-type mx-auto grid w-[min(1040px,calc(100%-32px))] grid-cols-1 items-start gap-[32px] pb-[96px] pt-[49px] lg:grid-cols-[480px_528px]">
        {/* Ticket */}
        <article className="bg-white text-ink">
          <div className="relative h-[177px] overflow-hidden px-[24px] pt-[24px]" style={{ background: SUNRISE }}>
            <Arches cx={400} cy={238} ring={162} discs={[111]} />
            <p className="relative text-[12px] font-extrabold uppercase leading-[16px] tracking-[0.14em] text-blood">{dateLine}</p>
            <h1 className="ag-display relative mt-[3px]" style={{ fontSize: titleSize, lineHeight: `${Math.round(titleSize * 0.87)}px` }}>
              {parts.map((p) => <span key={p} className="block">{p}</span>)}
            </h1>
            <p className="relative mt-[9px] text-[15px] font-extrabold leading-[20px] tracking-[-0.03em] text-white">{ticket.eventVenue}</p>
          </div>

          <div className="flex flex-col items-center px-[24px] pt-[28px]">
            {checkedIn || revoked ? (
              <div className="flex h-[300px] flex-col items-center justify-center text-center">
                <span className="ag-display text-[32px] leading-[36px]">{checkedIn ? 'Checked in' : 'Revoked'}</span>
                {checkedIn && ticket.checkedInAt && <span className="mt-2 text-sm text-peach-muted">{clockTime(ticket.checkedInAt)} ICT</span>}
              </div>
            ) : (
              <>
                <span className="inline-flex h-[28px] items-center gap-[8px] bg-green-100 px-[12px] text-[13px] font-extrabold uppercase tracking-[0.05em] text-green-900">
                  <span aria-hidden="true" className="h-[8px] w-[8px] rounded-full bg-green-600" />
                  Ready at the door
                </span>
                <div className="mt-[14px]"><BrandQr value={ticket.qrToken} size={260} /></div>
                <p className="mt-[14px] text-[13px] leading-[18px] text-peach-muted">Turn your screen brightness up · Scan at gate</p>
              </>
            )}
          </div>

          <dl className="mt-[23px] grid grid-cols-2 gap-x-[24px] gap-y-[14px] border-t-[3px] border-dashed border-[#F3D5CB] px-[24px] pb-[21px] pt-[21px]">
            <div><dt className={fieldLabel}>Holder</dt><dd className={fieldValue}>{nameFromEmail(user?.email)}</dd></div>
            <div><dt className={fieldLabel}>Tier</dt><dd className={fieldValue}>{ticket.tierName}</dd></div>
            <div><dt className={fieldLabel}>Ticket</dt><dd className={fieldValue}>{position} of {order.length}</dd></div>
            <div><dt className={fieldLabel}>Ticket ID</dt><dd className="mt-[3px] font-code text-[16px] font-bold leading-[22px]">{ticketCode(ticket.id)}</dd></div>
          </dl>
        </article>

        {/* Receipt and gate info */}
        <div className="flex flex-col gap-[20px]">
          <section className="border-2 border-white px-[24px] pb-[24px] pt-[24px]">
            <h2 className="ag-display text-[23px] leading-[30px] tracking-[-0.03em]">Payment receipt</h2>
            <div className="mt-[8px] flex h-[45px] items-center justify-between border-b border-white/15 text-[16px] text-peach-soft">
              <span>{order.length} × {ticket.tierName}</span>
              <span className="font-extrabold tracking-[-0.02em] text-white">{subtotal === null ? '—' : money(subtotal)}</span>
            </div>
            <div className="flex h-[45px] items-center justify-between border-b border-white/15 text-[16px] text-peach-soft">
              <span>Service fee</span>
              <span className="font-extrabold tracking-[-0.02em] text-white">{money(SERVICE_FEE)}</span>
            </div>
            <div className="mt-[10px] flex items-end justify-between">
              <span className="text-[14px] font-extrabold uppercase tracking-[0.05em]">Paid · KHQR</span>
              <span className="text-[34px] font-black leading-[38px] tracking-[-0.04em]">{subtotal === null ? '—' : money(subtotal + SERVICE_FEE)}</span>
            </div>
            <p className="mt-[8px] font-code text-[13px] leading-[18px] text-peach-soft">Ref {ticket.orderNumber} · {paidOn}</p>
          </section>

          <section className="bg-ink-raised px-[24px] py-[24px]">
            <h2 className="ag-display text-[19px] leading-[24px] tracking-[-0.03em]">At the gate</h2>
            <ul className="mt-[10px] flex list-disc flex-col gap-[9px] pl-[18px] text-[15px] leading-[22px] text-peach-soft">
              <li>Each QR works once — the second scan is rejected.</li>
              <li>Screenshots are fine; the code works offline.</li>
              <li>Bring the ID matching the holder name.</li>
            </ul>
          </section>

          <Link
            to={next ? `/tickets/${next.id}` : '/tickets'}
            className="flex h-[52px] items-center justify-center bg-flame text-[16px] font-black uppercase tracking-[0.03em] text-white transition hover:bg-blood"
          >
            <span>{next ? `Next ticket (${position + 1} of ${order.length})` : 'Back to my tickets'} <Arrow /></span>
          </Link>
        </div>
      </main>
    </div>
  );
}
