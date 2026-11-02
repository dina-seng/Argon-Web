import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { api, ApiRequestError } from '../../lib/api';
import type { PublicEventDetail } from '@argon/shared';
import {
  Calendar,
  MapPin,
  Clock,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Plus,
  Minus,
  Loader2
} from 'lucide-react';

export default function CheckoutPage() {
  const { tierId } = useParams<{ tierId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [eventDetail, setEventDetail] = useState<PublicEventDetail | null>(null);
  const [eventLoading, setEventLoading] = useState(true);

  // Look up the event that contains this tier
  useEffect(() => {
    if (!tierId) return;
    let cancelled = false;
    setEventLoading(true);
    // The API doesn't have a /tiers/:id endpoint, so we fetch the events list
    // and find the event matching the tier. For direct links we rely on navigation state.
    api.get<{ data: PublicEventDetail[] }>('/events?pageSize=50')
      .then(async (res) => {
        if (cancelled) return;
        const match = res.data.find((e) => e.tiers?.some((t) => t.id === tierId));
        if (match) {
          const detail = await api.get<PublicEventDetail>(`/events/${match.id}`);
          if (!cancelled) setEventDetail(detail);
        }
      })
      .catch(() => { /* non-fatal – tier info shows as minimal */ })
      .finally(() => { if (!cancelled) setEventLoading(false); });
    return () => { cancelled = true; };
  }, [tierId]);

  const tier = eventDetail?.tiers.find((t) => t.id === tierId) ?? null;

  const subtotal = (tier?.price ?? 0) * quantity;
  const serviceFee = 1.0;
  const total = subtotal + serviceFee;

  const handleContinueToPayment = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      interface BookingResponse { id: string; status: string; expiresAt: string; quantity: number; tierId: string; eventId: string; }
      const booking = await api.post<BookingResponse>('/bookings', { tierId, quantity });
      navigate(`/payment/${booking.id}`, { state: { booking, tier, event: eventDetail } });
    } catch (err) {
      setApiError(err instanceof ApiRequestError ? err.message : 'Failed to create booking. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a10] text-zinc-100 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Step Indicator Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2a1d4f] text-white border border-purple-500 text-xs font-semibold shadow-[0_0_12px_rgba(120,87,255,0.25)]">
            <span>01 Tickets</span>
          </div>
          <div className="w-8 sm:w-12 h-px bg-zinc-800" />
          <div className="text-zinc-500 text-xs font-medium px-2 py-1"><span>02 Payment</span></div>
          <div className="w-8 sm:w-12 h-px bg-zinc-800" />
          <div className="text-zinc-500 text-xs font-medium px-2 py-1"><span>03 Your ticket</span></div>
        </div>

        <div className="mb-4">
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to events</span>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Select Tickets</h1>
          <p className="mt-2 text-zinc-400 text-sm sm:text-base">Reserve your admission before seats are released back to the pool.</p>
        </div>

        {eventLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Left Column */}
            <div className="md:col-span-7 space-y-6">
              <div className="bg-[#12131b] border border-white/[0.08] rounded-2xl p-6 shadow-xl">
                <div className="flex items-start gap-4">
                  <div className="w-24 h-20 rounded-xl overflow-hidden shrink-0 bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-600 text-xs">
                    {eventDetail?.title?.slice(0, 2).toUpperCase() ?? '??'}
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold text-white">{eventDetail?.title ?? 'Event'}</h2>
                    <div className="mt-2 space-y-1 text-xs text-zinc-400">
                      <p className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        {eventDetail ? new Date(eventDetail.startsAt).toLocaleString() : '—'}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                        {eventDetail?.venue ?? '—'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-[#181926] border border-purple-900/40">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{tier?.name ?? 'General Admission'}</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">${(tier?.price ?? 0).toFixed(2)} USD per person</p>
                    </div>
                    <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-700/80 rounded-xl p-1">
                      <button onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}
                        className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white flex items-center justify-center transition">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-mono text-sm font-bold w-5 text-center text-white">{quantity}</span>
                      <button onClick={() => setQuantity(Math.min(10, quantity + 1))} disabled={quantity >= 10}
                        className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white flex items-center justify-center transition">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-5 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 text-xs text-zinc-400">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">Ticket Holder</span>
                  <p className="text-white font-medium">{user?.email?.split('@')[0] ?? 'Guest'}</p>
                  <p className="font-mono text-zinc-400">{user?.email ?? ''}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-purple-950/20 border border-purple-900/40 text-xs text-purple-300">
                <Clock className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">10-Minute Hold Reservation:</span>
                  <p className="mt-0.5 text-zinc-400">Once you proceed, your tickets will be locked for 10 minutes while you complete payment.</p>
                </div>
              </div>
            </div>

            {/* Right Column: Order Summary */}
            <div className="md:col-span-5 space-y-5">
              <div className="bg-[#12131b] border border-white/[0.08] rounded-2xl p-6 shadow-xl">
                <h3 className="text-base font-semibold text-white pb-3 border-b border-zinc-800/80">Order Summary</h3>
                <div className="mt-4 space-y-2.5 text-xs text-zinc-300">
                  <div className="flex justify-between">
                    <span>{tier?.name ?? 'Ticket'} × {quantity}</span>
                    <span className="font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Service fee</span>
                    <span className="font-medium">${serviceFee.toFixed(2)}</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-zinc-800/80 flex items-baseline justify-between">
                  <span className="text-xs text-zinc-300 font-medium">Order total · USD</span>
                  <span className="text-2xl font-black text-orange-500 font-sans tracking-tight">${total.toFixed(2)}</span>
                </div>

                <button onClick={handleContinueToPayment} disabled={isLoading || !tier}
                  className="w-full mt-6 py-3.5 px-4 rounded-xl bg-[#7857ff] hover:bg-[#6b47ff] text-white font-semibold text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-purple-950/40 disabled:opacity-60 disabled:cursor-not-allowed">
                  <span>{isLoading ? 'Reserving…' : 'Continue to Payment'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {apiError && <p className="mt-2 text-sm text-red-400">{apiError}</p>}

                <div className="mt-4 text-center">
                  <p className="text-[11px] text-zinc-500 flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Instant digital issuance upon payment
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
