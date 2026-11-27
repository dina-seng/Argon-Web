/**
 * features/booking/PaymentPage.tsx
 * Matches design 04-KHQR-payment. Loads the booking itself so a reload keeps working,
 * and watches it so the customer moves on as soon as the bank confirms.
 */
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { PublicEventDetail } from '@argon/shared';
import { api, ApiRequestError } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { clockTime, countdown, forgetHold, longDate, money, SERVICE_FEE } from '../../lib/publicFormat';
import { CheckoutHeader } from '../../components/public/Brand';

interface BookingState {
  id: string;
  status?: string;
  quantity: number;
  tierId: string;
  eventId: string;
  expiresAt: string;
  paymentAmount?: string | null;
  paymentMethod?: 'KHQR' | 'CARD' | null;
  paymentExpiresAt?: string | null;
}

interface PaymentCode {
  qrImage: string;
  amount: number;
  expiresAt: string;
}

interface CardForm {
  action: string;
  fields: Record<string, string>;
}

const POLL_MS = 5000;
const secondsUntil = (iso?: string) => (iso ? Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000)) : 600);

function paymentFailure(error: unknown, method: 'KHQR' | 'CARD' | 'TEST') {
  const simulation = method === 'TEST';
  const status = error instanceof ApiRequestError ? error.status : undefined;
  if (status === 401) return { message: 'Sign in again to continue with this booking.', retry: false };
  if (status === 403 || status === 404) {
    return {
      message: simulation ? 'Test payments are unavailable for this booking.' : 'This booking is unavailable.',
      retry: false,
    };
  }
  if (status === 409) {
    return { message: 'This booking can no longer start a payment. If you already paid, wait for confirmation before booking again.', retry: false };
  }
  if (status === 503) return { message: 'Online payments are currently unavailable. Please try again later.', retry: false };
  if (status === 429) return { message: 'Too many attempts. Wait a moment and try again.', retry: true };
  return {
    message: simulation ? 'We couldn’t confirm the test payment. Try again.'
      : method === 'CARD' ? 'We couldn’t open card checkout. Try again.' : 'We couldn’t load the KHQR code. Try again.',
    retry: true,
  };
}

export default function PaymentPage() {
  const location = useLocation();
  const { bookingId } = useParams<{ bookingId?: string }>();
  const passed = location.state as { booking?: BookingState; event?: PublicEventDetail } | null;
  const id = bookingId ?? passed?.booking?.id;
  const initial = passed?.booking?.id === id ? passed : null;
  return <BookingPayment key={id} id={id} initial={initial} />;
}

function BookingPayment({ id, initial }: {
  id?: string;
  initial: { booking?: BookingState; event?: PublicEventDetail } | null;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [booking, setBooking] = useState<BookingState | undefined>(initial?.booking);
  const [event, setEvent] = useState<PublicEventDetail | undefined>(initial?.event);
  const [secondsRemaining, setSecondsRemaining] = useState(() => secondsUntil(initial?.booking?.expiresAt));
  const [confirmed, setConfirmed] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [payment, setPayment] = useState<PaymentCode>();
  const [paymentError, setPaymentError] = useState<ReturnType<typeof paymentFailure>>();
  const [bookingError, setBookingError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [openingCard, setOpeningCard] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'KHQR' | 'CARD'>();
  const simulationEnabled = import.meta.env.DEV && import.meta.env.VITE_ALLOW_PAYMENT_SIMULATION === 'true';

  const handleSimulatePayment = async () => {
    if (!id || simulating) return;
    setSimulating(true);
    setPaymentError(undefined);
    try {
      const result = await api.post<BookingState>(`/bookings/${id}/simulate-payment`, {});
      if (result.status !== 'PAID') throw new Error('Unexpected payment status');
      setConfirmed(true);
    } catch (error) {
      setPaymentError(paymentFailure(error, 'TEST'));
    } finally {
      setSimulating(false);
    }
  };

  const handleCardPayment = async () => {
    if (!id || openingCard) return;
    setSelectedMethod('CARD');
    setOpeningCard(true);
    setPaymentError(undefined);
    try {
      const checkout = await api.post<CardForm>(`/bookings/${id}/payment`, { method: 'CARD' });
      const form = document.createElement('form');
      form.method = 'POST';
      form.enctype = 'multipart/form-data';
      form.action = checkout.action;
      form.hidden = true;
      for (const [name, value] of Object.entries(checkout.fields)) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.append(input);
      }
      document.body.append(form);
      form.submit();
      form.remove();
    } catch (error) {
      setPaymentError(paymentFailure(error, 'CARD'));
      setOpeningCard(false);
    }
  };

  const tier = event?.tiers.find((t) => t.id === booking?.tierId);
  const status = booking?.status;
  const holdExpiresAt = booking?.expiresAt;
  const userId = user?.sub;
  const paid = confirmed || status === 'PAID';
  const method = booking?.paymentMethod ?? selectedMethod;

  useEffect(() => {
    if (!id || paid || simulationEnabled || method !== 'KHQR' || status !== 'PENDING' || !holdExpiresAt || new Date(holdExpiresAt).getTime() <= Date.now()) return;
    let cancelled = false;
    setPayment(undefined);
    setPaymentError(undefined);
    api.post<PaymentCode>(`/bookings/${id}/payment`, { method: 'KHQR' })
      .then((code) => { if (!cancelled) setPayment(code); })
      .catch((error: unknown) => {
        if (!cancelled) setPaymentError(paymentFailure(error, 'KHQR'));
      });
    return () => { cancelled = true; };
  }, [id, paid, simulationEnabled, method, status, holdExpiresAt, attempt]);

  useEffect(() => {
    if (!id || paid) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const check = async () => {
      try {
        const latest = await api.get<BookingState>(`/bookings/${id}?checkPayment=true`);
        if (cancelled) return;
        setBookingError('');
        setBooking(latest);
        setSecondsRemaining(secondsUntil(latest.expiresAt));
        if (latest.status !== 'PENDING') return;
      } catch (error) {
        if (cancelled) return;
        const status = error instanceof ApiRequestError ? error.status : undefined;
        if (status === 401 || status === 403 || status === 404) {
          setBookingError(paymentFailure(error, 'KHQR').message);
          return;
        }
        setBookingError('We couldn’t check the booking status. We’ll try again shortly.');
      }
      if (!cancelled) timer = setTimeout(check, POLL_MS);
    };

    void check();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [id, paid]);

  useEffect(() => {
    if (!id || !paid) return;
    if (userId) forgetHold(userId, id);
    const timer = setTimeout(() => navigate('/tickets', { replace: true }), 1500);
    return () => clearTimeout(timer);
  }, [id, paid, navigate, userId]);

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
  const total = payment?.amount ?? (booking?.paymentAmount != null
    ? Number(booking.paymentAmount)
    : tier ? tier.price * quantity + SERVICE_FEE : undefined);
  const subtotal = total === undefined ? undefined : total - SERVICE_FEE;
  const expired = (secondsRemaining === 0 || status === 'EXPIRED') && !paid;
  const inactive = Boolean(status && status !== 'PENDING' && status !== 'PAID');
  const paymentDeadline = payment?.expiresAt ?? booking?.paymentExpiresAt;
  const codeExpired = Boolean(paymentDeadline && Date.parse(paymentDeadline) <= Date.now());
  const showQr = payment && !paid && !expired && !inactive && !codeExpired;
  const paymentSecondsRemaining = paymentDeadline
    ? Math.min(secondsRemaining, secondsUntil(paymentDeadline))
    : secondsRemaining;
  const displayTotal = total === undefined ? '…' : money(total);
  const statusMessage = paid ? (simulationEnabled ? 'Test payment confirmed. Opening your tickets…' : 'Payment received. Opening your tickets…')
    : status === 'EXPIRED' ? 'This hold has expired. If your bank shows a charge, contact the event organizer.'
    : inactive ? 'This booking can no longer accept payment.'
    : expired || codeExpired ? 'Payment time has ended. If you already paid, keep this page open while we check.'
    : !id ? 'Reserve tickets to start payment.'
    : bookingError || paymentError?.message || (
      !booking ? 'Loading your booking…'
        : simulating ? 'Confirming your test payment…'
        : showQr ? 'Waiting for payment confirmation…'
        : simulationEnabled ? 'Test payment mode. No bank charge will be made.'
        : openingCard ? 'Opening secure card checkout…'
        : method === 'KHQR' ? 'Loading payment code…'
        : method === 'CARD' ? 'Checking for card payment confirmation. You can continue to card checkout if you haven’t paid.'
        : 'Choose KHQR or a credit or debit card.'
    );
  const canPay = status === 'PENDING' && !paid && !expired && !codeExpired && !bookingError;

  const steps = [
    'Open any KHQR banking app (ABA, ACLEDA, Wing, Bakong...)',
    `Scan the code and check the amount is ${displayTotal} USD`,
    'Confirm — your QR passes appear here automatically',
  ];

  return (
    <div className="flex min-h-screen flex-col bg-ink text-white">
      <CheckoutHeader step={2} bordered />

      <main className="ag-wrap flex-1 pb-16 pt-[48px]">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[860px_340px] lg:gap-[40px]">
          <div className="min-w-0">
            <p className="text-[13px] font-extrabold uppercase leading-[16px] tracking-[0.16em] text-peach">
              {simulationEnabled ? 'Test payment' : 'Payment'}
              {id && !paid && !inactive && (
                <> · {payment ? 'Code' : 'Hold'} ends in <span className="text-white">{countdown(paymentSecondsRemaining)}</span></>
              )}
            </p>
            <h1 className="ag-display mt-[12px] text-[clamp(44px,5.8vw,84px)] leading-[0.88]">Pay for your tickets</h1>

            <div className="mt-[36px] flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-[32px]">
              <div className="w-[294px] max-w-full shrink-0 border-t-[10px] border-flame bg-white px-[20px] pb-[20px] pt-[20px] text-ink">
                <div className="mb-[12px] flex justify-between text-[14px] font-black leading-[16px] tracking-[0.14em]">
                  <span>{method === 'KHQR' ? 'KHQR' : method === 'CARD' ? 'Card' : 'Payment'}</span>
                  <span className="text-[13px] text-blood">ARGON</span>
                </div>
                {showQr && <img src={payment.qrImage} alt="Scan this KHQR code to pay" className="mx-auto w-full max-w-[240px]" />}
                <p className="mt-[14px] text-center text-[30px] font-black leading-[34px] tracking-[-0.04em]">{displayTotal}</p>
                {!simulationEnabled && canPay && !method && (
                  <button type="button" onClick={() => setSelectedMethod('KHQR')} className="mt-3 block w-full border border-ink px-3 py-2 font-bold">
                    Pay with KHQR
                  </button>
                )}
                {!simulationEnabled && canPay && method !== 'KHQR' && (!paymentError || paymentError.retry) && (
                  <button type="button" onClick={handleCardPayment} disabled={openingCard} className="mt-3 block w-full border border-ink px-3 py-2 font-bold disabled:opacity-50">
                    {openingCard ? 'Opening PayWay…' : 'Pay with credit or debit card'}
                  </button>
                )}
                {paymentError?.retry && !simulationEnabled && method === 'KHQR' && canPay && (
                  <button type="button" onClick={() => setAttempt((n) => n + 1)} className="mt-3 text-sm font-bold text-blood underline">
                    Retry payment code
                  </button>
                )}
                {simulationEnabled && canPay && (!paymentError || paymentError.retry) && (
                  <button
                    type="button"
                    onClick={handleSimulatePayment}
                    disabled={simulating}
                    className="mt-3 flex h-[40px] w-full items-center justify-center border border-amber-500/50 bg-amber-500/10 text-xs font-bold uppercase tracking-wider text-amber-800 hover:bg-amber-500/20 disabled:opacity-50"
                  >
                    {simulating ? 'Confirming…' : 'Simulate test payment'}
                  </button>
                )}
              </div>

              <div className="min-w-0 flex-1">
                {showQr && <h2 className="ag-display text-[23px] leading-[30px] tracking-[-0.03em]">How to pay</h2>}
                {showQr && <ol className="mt-[12px] flex flex-col gap-[14px]">
                  {steps.map((step, i) => (
                    <li key={step} className="flex items-start gap-[14px]">
                      <span className="flex h-[32px] w-[32px] shrink-0 items-center justify-center bg-flame text-[16px] font-black">{i + 1}</span>
                      <span className="pt-[1px] text-[16px] leading-[24px] text-peach-soft">{step}</span>
                    </li>
                  ))}
                </ol>}
                <div role="status" className="mt-[28px] flex min-h-[49px] items-center gap-[12px] border border-white/30 px-[16px] py-2">
                  <span aria-hidden="true" className={`h-[12px] w-[12px] shrink-0 rounded-full ${paid ? 'bg-green-400' : expired || inactive || codeExpired || paymentError || bookingError ? 'bg-flame' : 'bg-amber-400'}`} />
                  <span className="text-[15px] font-extrabold tracking-[-0.02em]">{statusMessage}</span>
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
                <span className="font-extrabold tracking-[-0.02em]">{subtotal === undefined ? '…' : money(subtotal)}</span>
              </div>
              <div className="flex h-[49px] items-center justify-between border-b border-ink/15 text-[16px]">
                <span>Service fee</span>
                <span className="font-extrabold tracking-[-0.02em]">{money(SERVICE_FEE)}</span>
              </div>
              <div className="flex h-[76px] items-end justify-between pb-[12px]">
                <span className="text-[13px] font-extrabold uppercase tracking-[0.06em]">Order total · USD</span>
                <span className="text-[38px] font-black leading-[40px] tracking-[-0.04em]">{displayTotal}</span>
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
