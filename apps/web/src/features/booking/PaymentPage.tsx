/**
 * features/booking/PaymentPage.tsx
 * Matches design 04-KHQR-payment. Loads the booking itself so a reload keeps working,
 * and watches it so the customer moves on as soon as the bank confirms.
 */
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { PublicEventDetail } from '@argon/shared';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { clockTime, countdown, forgetHold, longDate, money, SERVICE_FEE } from '../../lib/publicFormat';
import { BrandQr, CheckoutHeader } from '../../components/public/Brand';

interface BookingState {
  id: string;
  status?: string;
  quantity: number;
  tierId: string;
  eventId: string;
  expiresAt: string;
}

const POLL_MS = 4000;
const secondsUntil = (iso?: string) => (iso ? Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000)) : 600);

export default function PaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { bookingId } = useParams<{ bookingId?: string }>();
  const { user } = useAuth();

  const passed = location.state as { booking?: BookingState; event?: PublicEventDetail } | null;
  const [booking, setBooking] = useState<BookingState | undefined>(passed?.booking);
  const [event, setEvent] = useState<PublicEventDetail | undefined>(passed?.event);
  const [secondsRemaining, setSecondsRemaining] = useState(() => secondsUntil(passed?.booking?.expiresAt));
  const [paid, setPaid] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const handleSimulatePayment = async () => {
    if (!id || simulating) return;
    setSimulating(true);
    try {
      await api.post(`/bookings/${id}/simulate-payment`, {});
      setPaid(true);
      if (user) forgetHold(user.sub, id);
      setTimeout(() => navigate('/tickets'), 1500);
    } catch {
      // Background check polling will verify
    } finally {
      setSimulating(false);
    }
  };

  const id = bookingId ?? booking?.id;
  const tier = event?.tiers.find((t) => t.id === booking?.tierId);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const check = async () => {
      try {
        const latest = await api.get<BookingState>(`/bookings/${id}`);
        if (cancelled) return;
        setBooking(latest);
        setSecondsRemaining(secondsUntil(latest.expiresAt));
        if (latest.status === 'PAID') {
          setPaid(true);
          if (user) forgetHold(user.sub, id);
          timer = setTimeout(() => navigate('/tickets'), 1500);
          return;
        }
      } catch {
        // A failed check shouldn't interrupt paying; the next one retries.
      }
      if (!cancelled) timer = setTimeout(check, POLL_MS);
    };

    void check();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [id, navigate, user]);

  const eventId = booking?.eventId;
  useEffect(() => {
    if (event || !eventId) return;
    let cancelled = false;
    api.get<PublicEventDetail>(`/events/${eventId}`)
      .then((detail) => { if (!cancelled) setEvent(detail); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [event, eventId]);

  useEffect(() => {
    const timer = setInterval(() => setSecondsRemaining((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  const quantity = booking?.quantity ?? 1;
  const subtotal = (tier?.price ?? 0) * quantity;
  const total = subtotal + SERVICE_FEE;
  const expired = (secondsRemaining === 0 || booking?.status === 'EXPIRED') && !paid;

  const steps = [
    'Open any KHQR banking app (ABA, ACLEDA, Wing, Bakong...)',
    `Scan the code and check the amount is ${money(total)} USD`,
    'Confirm — your QR passes appear here automatically',
  ];

  return (
    <div className="flex min-h-screen flex-col bg-ink text-white">
      <CheckoutHeader step={2} bordered />

      <main className="ag-wrap flex-1 pb-16 pt-[48px]">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[860px_340px] lg:gap-[40px]">
          <div className="min-w-0">
            <p className="text-[13px] font-extrabold uppercase leading-[16px] tracking-[0.16em] text-peach">
              Bank QR payment · Hold ends in <span className="text-white">{countdown(secondsRemaining)}</span>
            </p>
            <h1 className="ag-display mt-[12px] text-[clamp(44px,5.8vw,84px)] leading-[0.88]">One scan.<br />Then you're in.</h1>

            <div className="mt-[36px] flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-[32px]">
              <div className="w-[294px] max-w-full shrink-0 border-t-[10px] border-flame bg-white px-[20px] pb-[20px] pt-[20px] text-ink">
                <div className="mb-[12px] flex justify-between text-[14px] font-black leading-[16px] tracking-[0.14em]">
                  <span>KHQR</span>
                  <span className="text-[13px] text-blood">ARGON</span>
                </div>
                <BrandQr value={`KHQR:ARGON:${id ?? 'UNKNOWN'}:USD:${total.toFixed(2)}`} size={240} />
                <p className="mt-[14px] text-center text-[30px] font-black leading-[34px] tracking-[-0.04em]">{tier ? money(total) : '…'}</p>
                <p className="mt-[2px] whitespace-nowrap text-center text-[12px] leading-[16px] text-peach-muted">Illustrative payment QR · Not a payment request</p>
                {import.meta.env.DEV && !paid && !expired && (
                  <button
                    type="button"
                    onClick={handleSimulatePayment}
                    disabled={simulating}
                    className="mt-3 flex h-[40px] w-full items-center justify-center border border-amber-500/50 bg-amber-500/10 text-xs font-bold uppercase tracking-wider text-amber-800 hover:bg-amber-500/20 disabled:opacity-50"
                  >
                    {simulating ? 'Confirming…' : '⚡ [Dev] Confirm KHQR Payment'}
                  </button>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="ag-display text-[23px] leading-[30px] tracking-[-0.03em]">How to pay</h2>
                <ol className="mt-[12px] flex flex-col gap-[14px]">
                  {steps.map((step, i) => (
                    <li key={step} className="flex items-start gap-[14px]">
                      <span className="flex h-[32px] w-[32px] shrink-0 items-center justify-center bg-flame text-[16px] font-black">{i + 1}</span>
                      <span className="pt-[1px] text-[16px] leading-[24px] text-peach-soft">{step}</span>
                    </li>
                  ))}
                </ol>
                <div role="status" className="mt-[28px] flex h-[49px] items-center gap-[12px] border border-white/30 px-[16px]">
                  <span aria-hidden="true" className={`h-[12px] w-[12px] rounded-full ${paid ? 'bg-green-400' : expired ? 'bg-flame' : 'animate-pulse bg-amber-400'}`} />
                  <span className="text-[15px] font-extrabold tracking-[-0.02em]">
                    {paid ? 'Payment received — getting your tickets…' : expired ? 'This hold has expired. Please reserve again.' : 'Waiting for payment confirmation...'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <aside className="border-2 border-white bg-white text-ink">
            <h2 className="flex h-[66px] items-center bg-ink px-[24px] text-[22px] font-black uppercase tracking-[-0.03em] text-white">Your order</h2>
            <div className="px-[22px] pb-[34px] pt-[24px]">
              <div className="border-b border-ink/15 pb-[14px]">
                <p className="text-[19px] font-black leading-[22px] tracking-[-0.03em]">{event?.title ?? 'Your event'}</p>
                {event && (
                  <p className="text-[14px] leading-[17px] text-peach-muted">
                    {longDate(event.startsAt)} · {clockTime(event.startsAt)} · {event.venue}
                  </p>
                )}
              </div>
              <div className="flex h-[49px] items-center justify-between border-b border-ink/15 text-[16px]">
                <span>Tickets · {quantity} × {tier?.name ?? 'Ticket'}</span>
                <span className="font-extrabold tracking-[-0.02em]">{money(subtotal)}</span>
              </div>
              <div className="flex h-[49px] items-center justify-between border-b border-ink/15 text-[16px]">
                <span>Service fee</span>
                <span className="font-extrabold tracking-[-0.02em]">{money(SERVICE_FEE)}</span>
              </div>
              <div className="flex h-[76px] items-end justify-between pb-[12px]">
                <span className="text-[13px] font-extrabold uppercase tracking-[0.06em]">Order total · USD</span>
                <span className="text-[38px] font-black leading-[40px] tracking-[-0.04em]">{money(total)}</span>
              </div>
              <Link to={eventId ? `/events/${eventId}` : '/'} className="text-[14px] font-extrabold tracking-[-0.02em] text-blood underline">
                Change tickets
              </Link>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
