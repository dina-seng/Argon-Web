import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTicketingStore } from '../../hooks/useTicketingStore';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import {
  Calendar,
  MapPin,
  Clock,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Plus,
  Minus
} from 'lucide-react';

import { INITIAL_EVENTS, type EventItem, type TicketTier } from '../../lib/ticketingStore';

export default function CheckoutPage() {
  const { tierId } = useParams<{ tierId?: string }>();
  const navigate = useNavigate();
  const { events, createPendingBooking, user } = useTicketingStore();

  const [quantity, setQuantity] = useState(1);

  const defaultEvt = INITIAL_EVENTS[0]!;
  const defaultTier = defaultEvt.tiers[0]!;
  const event: EventItem =
    events.find((e) => e.tiers.some((t) => t.id === tierId)) ??
    defaultEvt;
  const tier: TicketTier =
    event.tiers.find((t) => t.id === tierId) ??
    defaultTier;

  const subtotal = tier.price * quantity;
  const serviceFee = 1.0;
  const total = subtotal + serviceFee;

  const handleContinueToPayment = () => {
    createPendingBooking({
      eventId: event.id,
      tierId: tier.id,
      quantity,
      customOrderNumber: 'ARG-2481', // Matches design prototype
    });

    navigate(`/checkout/${tier.id}/payment`);
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

          <div className="text-zinc-500 text-xs font-medium px-2 py-1">
            <span>02 Payment</span>
          </div>

          <div className="w-8 sm:w-12 h-px bg-zinc-800" />

          <div className="text-zinc-500 text-xs font-medium px-2 py-1">
            <span>03 Your ticket</span>
          </div>
        </div>

        {/* Back Link */}
        <div className="mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to events</span>
          </Link>
        </div>

        {/* Title */}
        <div className="mb-8">
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Select Tickets
          </h1>
          <p className="mt-2 text-zinc-400 text-sm sm:text-base">
            Reserve your admission before seats are released back to the pool.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Left Column: Event & Tier Selection */}
          <div className="md:col-span-7 space-y-6">
            <div className="bg-[#12131b] border border-white/[0.08] rounded-2xl p-6 shadow-xl">
              <div className="flex items-start gap-4">
                <div className="w-24 h-20 rounded-xl overflow-hidden shrink-0 bg-zinc-900 border border-white/10">
                  <img
                    src={event.imageUrl}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold text-white">{event.title}</h2>
                  <div className="mt-2 space-y-1 text-xs text-zinc-400">
                    <p className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                      {event.formattedDate} · {event.formattedTime}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                      {event.venue}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tier Selector Box */}
              <div className="mt-6 pt-5 border-t border-zinc-800/80">
                <div className="flex items-center justify-between p-4 rounded-xl bg-[#181926] border border-purple-900/40">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{tier.name}</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      ${tier.price.toFixed(2)} USD per person
                    </p>
                  </div>

                  {/* Quantity Counter */}
                  <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-700/80 rounded-xl p-1">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white flex items-center justify-center transition"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-sm font-bold w-5 text-center text-white">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(Math.min(10, quantity + 1))}
                      disabled={quantity >= 10}
                      className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white flex items-center justify-center transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Attendee Info Preview */}
              <div className="mt-5 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 text-xs text-zinc-400">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">
                  Ticket Holder Information
                </span>
                <p className="text-white font-medium">{user.name}</p>
                <p className="font-mono text-zinc-400">{user.email}</p>
              </div>
            </div>

            {/* Hold Reservation Notice */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-purple-950/20 border border-purple-900/40 text-xs text-purple-300">
              <Clock className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">10-Minute Hold Reservation:</span>
                <p className="mt-0.5 text-zinc-400">
                  Once you proceed, your tickets will be locked for 10 minutes while you complete your Cambodian bank QR payment.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <div className="md:col-span-5 space-y-5">
            <div className="bg-[#12131b] border border-white/[0.08] rounded-2xl p-6 shadow-xl">
              <h3 className="text-base font-semibold text-white pb-3 border-b border-zinc-800/80">
                Order Summary
              </h3>

              <div className="mt-4 space-y-2.5 text-xs text-zinc-300">
                <div className="flex justify-between">
                  <span>
                    {tier.name} × {quantity}
                  </span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service fee</span>
                  <span className="font-medium">${serviceFee.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-zinc-800/80 flex items-baseline justify-between">
                <span className="text-xs text-zinc-300 font-medium">Order total · USD</span>
                <span className="text-2xl font-black text-orange-500 font-sans tracking-tight">
                  ${total.toFixed(2)}
                </span>
              </div>

              <button
                onClick={handleContinueToPayment}
                className="w-full mt-6 py-3.5 px-4 rounded-xl bg-[#7857ff] hover:bg-[#6b47ff] text-white font-semibold text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-purple-950/40"
              >
                <span>Continue to Payment</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="mt-4 text-center">
                <p className="text-[11px] text-zinc-500 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Instant digital issuance upon payment
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
