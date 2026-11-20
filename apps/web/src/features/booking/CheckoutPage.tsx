/**
 * features/booking/CheckoutPage.tsx
 * Matches design 03-Checkout-tickets-hold.
 */
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { PaginatedResponse, PublicEvent, PublicEventDetail } from '@argon/shared';
import { useAuth } from '../../hooks/useAuth';
import { api, ApiRequestError } from '../../lib/api';
import { countdown, mediumDate, money, nameFromEmail, rememberHold, SERVICE_FEE } from '../../lib/publicFormat';
import { Arrow, BackLink, CheckoutHeader } from '../../components/public/Brand';

const MAX_PER_BOOKING = 10;

/** The list endpoint has no tiers, so a bare tier link is resolved through each event's detail. */
async function findEventByTier(tierId: string): Promise<PublicEventDetail | null> {
  const { data } = await api.get<PaginatedResponse<PublicEvent>>('/events?pageSize=50');
  for (const summary of data) {
    const detail = await api.get<PublicEventDetail>(`/events/${summary.id}`);
    if (detail.tiers.some((t) => t.id === tierId)) return detail;
  }
  return null;
}

export default function CheckoutPage() {
  const { tierId } = useParams<{ tierId?: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const passed = location.state as { event?: PublicEventDetail; quantity?: number } | null;
  const eventParam = searchParams.get('event');
  const [eventDetail, setEventDetail] = useState<PublicEventDetail | null>(passed?.event ?? null);
  const [eventLoading, setEventLoading] = useState(!passed?.event);
  const [quantity, setQuantity] = useState(() => {
    const wanted = passed?.quantity ?? Number(searchParams.get('qty') ?? 1);
    return Number.isInteger(wanted) ? Math.min(MAX_PER_BOOKING, Math.max(1, wanted)) : 1;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(600);

  useEffect(() => {
    const timer = setInterval(() => setSecondsRemaining((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (eventDetail || !tierId) return;
    let cancelled = false;
    (eventParam ? api.get<PublicEventDetail>(`/events/${eventParam}`) : findEventByTier(tierId))
      .then((detail) => { if (!cancelled) setEventDetail(detail); })
      .catch(() => { if (!cancelled) setApiError("Couldn't load this ticket. Go back to the event and try again."); })
      .finally(() => { if (!cancelled) setEventLoading(false); });
    return () => { cancelled = true; };
  }, [eventDetail, eventParam, tierId]);

  const tier = eventDetail?.tiers.find((t) => t.id === tierId) ?? null;
  const isSoldOut = Boolean(tier && tier.remaining <= 0);
  const maxQuantity = tier ? Math.min(MAX_PER_BOOKING, Math.max(0, tier.remaining)) : MAX_PER_BOOKING;

  useEffect(() => {
    if (tier && tier.remaining > 0 && quantity > tier.remaining) {
      setQuantity(tier.remaining);
    }
  }, [tier, quantity]);

  const subtotal = (tier?.price ?? 0) * (isSoldOut ? 0 : quantity);
  const total = isSoldOut ? 0 : subtotal + SERVICE_FEE;

  const handleContinue = async () => {
    if (!tier || !eventDetail) return;
    setIsLoading(true);
    setApiError(null);
    try {
      interface BookingResponse { id: string; status: string; expiresAt: string; quantity: number; tierId: string; eventId: string }
      const booking = await api.post<BookingResponse>('/bookings', { eventId: eventDetail.id, tierId, quantity });
      if (user) {
        rememberHold(user.sub, {
          id: booking.id,
          eventTitle: eventDetail.title,
          eventStartsAt: eventDetail.startsAt,
          tierName: tier.name,
          expiresAt: booking.expiresAt,
        });
      }
      navigate(`/payment/${booking.id}`, { state: { booking, tier, event: eventDetail } });
    } catch (err) {
      setApiError(err instanceof ApiRequestError ? err.message : 'Failed to create booking. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fieldLabel = 'mb-[6px] block text-[13px] font-extrabold uppercase leading-[18px] tracking-[0.04em] text-peach';
  const fieldInput = 'ag-input h-[50px] !bg-ink !border-white/40 !px-[14px] text-[16px]';
  const passCopy = quantity === 1 ? 'Your QR pass will' : quantity === 2 ? 'Both QR passes will' : `All ${quantity} QR passes will`;

  return (
    <div className="flex min-h-screen flex-col bg-ink text-white">
      <CheckoutHeader step={1} />

      <div className="bg-white">
        <div className="ag-wrap flex min-h-[68px] items-center justify-between gap-4 py-2 text-ink">
          <p className="text-[15px] font-bold tracking-[-0.03em]">
            <span className="font-black text-blood">10-MINUTE HOLD:</span>{' '}
            reserve your admission before seats go back to the pool.
          </p>
          <span role="timer" className="text-[32px] font-black leading-none tracking-[-0.01em] text-blood">{countdown(secondsRemaining)}</span>
        </div>
      </div>

      <main className="ag-wrap flex-1 pb-16 pt-[50px]">
        <BackLink to={eventDetail ? `/events/${eventDetail.id}` : '/'}>Back to event</BackLink>
        <h1 className="ag-display mt-[21px] text-[clamp(44px,5.6vw,72px)]">Select tickets</h1>

        <div className="mt-[33px] grid grid-cols-1 items-start gap-[32px] lg:grid-cols-[848px_360px]">
          <div className="flex min-w-0 flex-col gap-[24px]">
            <section className="flex min-h-[120px] flex-wrap items-center justify-between gap-4 border-2 border-white px-[24px] py-3">
              {eventLoading ? (
                <div className="h-[60px] w-1/2 animate-pulse bg-ink-raised" />
              ) : (
                <div>
                  <p className="ag-label text-peach">{tier?.name ?? 'Ticket unavailable'}</p>
                  <p className="text-[23px] font-black leading-[30px] tracking-[-0.03em]">{money(tier?.price ?? 0)} USD per person</p>
                  {eventDetail && (
                    <p className="text-[14px] leading-[20px] text-peach-soft">
                      {eventDetail.title} · {mediumDate(eventDetail.startsAt)} · {eventDetail.venue}
                    </p>
                  )}
                </div>
              )}
              <div className="flex h-[52px] w-[148px] items-center justify-between border-2 border-white text-[20px] font-black">
                <button type="button" aria-label="Fewer tickets" disabled={quantity <= 1 || isSoldOut} onClick={() => setQuantity(quantity - 1)} className="h-full w-[48px] disabled:opacity-40">−</button>
                <span aria-live="polite">{isSoldOut ? 0 : quantity}</span>
                <button type="button" aria-label="More tickets" disabled={quantity >= maxQuantity || isSoldOut} onClick={() => setQuantity(quantity + 1)} className="h-full w-[48px] disabled:opacity-40">+</button>
              </div>
            </section>

            <section className="bg-ink-raised px-[28px] py-[26px]">
              <h2 className="ag-display text-[25px] leading-[32px] tracking-[-0.03em]">Ticket holder</h2>
              <div className="mt-[15px] grid grid-cols-1 gap-[16px] sm:grid-cols-2">
                <div>
                  <label htmlFor="holder-name" className={fieldLabel}>Full name</label>
                  <input id="holder-name" readOnly value={nameFromEmail(user?.email)} className={fieldInput} />
                </div>
                <div>
                  <label htmlFor="holder-email" className={fieldLabel}>Email</label>
                  <input id="holder-email" type="email" readOnly value={user?.email ?? ''} className={fieldInput} />
                </div>
              </div>
              <p className="mt-[17px] text-[14px] leading-[20px] text-peach-soft">
                {passCopy} be sent to this account. You can view them any time in My tickets.
              </p>
            </section>
          </div>

          <aside className="bg-white text-ink">
            <h2 className="flex h-[66px] items-center bg-flame px-[24px] text-[22px] font-black uppercase tracking-[-0.02em] text-white">Order summary</h2>
            <div className="px-[24px] pb-[24px]">
              <div className="flex h-[56px] items-center justify-between border-b border-ink/15 pt-[6px] text-[16px]">
                <span>{quantity} × {tier?.name ?? 'Ticket'}</span>
                <span className="font-extrabold tracking-[-0.02em]">{money(subtotal)}</span>
              </div>
              <div className="flex h-[49px] items-center justify-between border-b border-ink/15 text-[16px]">
                <span>Service fee</span>
                <span className="font-extrabold tracking-[-0.02em]">{money(SERVICE_FEE)}</span>
              </div>
              <div className="flex h-[77px] items-end justify-between pb-[17px]">
                <span className="text-[13px] font-extrabold uppercase tracking-[0.06em]">Order total · USD</span>
                <span className="text-[38px] font-black leading-[40px] tracking-[-0.04em]">{money(total)}</span>
              </div>
              <button
                type="button"
                onClick={handleContinue}
                disabled={isLoading || !tier || isSoldOut || quantity <= 0}
                className="flex h-[56px] w-full items-center justify-center bg-ink text-[16px] font-black uppercase tracking-[0.03em] text-white transition hover:bg-blood disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? 'Reserving…' : isSoldOut ? 'Sold out' : <span>Continue to payment <Arrow /></span>}
              </button>
              {apiError && <p role="alert" className="mt-3 text-center text-sm font-semibold text-blood">{apiError}</p>}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
