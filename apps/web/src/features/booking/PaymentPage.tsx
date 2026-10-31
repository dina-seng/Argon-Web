import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTicketingStore } from '../../hooks/useTicketingStore';
import { QrCodeImage } from '../../components/ui/QrCodeImage';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { BookingStatus } from '@argon/shared';
import {
  Check,
  Loader2,
  Clock,
  ArrowLeft,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

import { INITIAL_EVENTS, type EventItem } from '../../lib/ticketingStore';

export default function PaymentPage() {
  const { bookingId } = useParams<{ bookingId?: string }>();
  const navigate = useNavigate();
  const { bookings, events, confirmPayment, cancelBooking } = useTicketingStore();

  // Find booking by URL param or default to active pending/paid booking ARG-2481
  const booking =
    bookings.find((b) => b.id === bookingId || b.orderNumber === bookingId) ||
    bookings.find((b) => b.orderNumber === 'ARG-2481') ||
    bookings[0];

  const defaultEvt = INITIAL_EVENTS[0]!;
  const event: EventItem =
    events.find((e) => e.id === booking?.eventId) ??
    defaultEvt;

  // Reservation countdown timer (10 minutes default)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(576); // 09:36 initial matches screenshot
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [simulatedTxId, setSimulatedTxId] = useState<string | null>(null);

  // Countdown timer effect
  useEffect(() => {
    if (booking?.status === BookingStatus.PAID) {
      setSecondsRemaining(576);
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [booking?.status]);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Payment Confirmation Handler
  const handleApprovePayment = () => {
    if (!booking) return;
    setIsProcessing(true);

    setTimeout(() => {
      try {
        const { ticket } = confirmPayment(booking.orderNumber);
        setSimulatedTxId(`KHQR-TX-${Math.floor(100000 + Math.random() * 900000)}`);
        setPaymentSuccess(true);
        setIsProcessing(false);

        // Auto navigate to Digital Ticket Pass after 1.8 seconds with celebration
        setTimeout(() => {
          navigate(`/tickets/${ticket.orderNumber}`);
        }, 1800);
      } catch (err) {
        console.error(err);
        setIsProcessing(false);
      }
    }, 1200);
  };

  const handleCancel = () => {
    if (booking) {
      cancelBooking(booking.orderNumber);
    }
    navigate('/');
  };

  const qrPaymentPayload = `KHQR:ARGON:${booking?.orderNumber ?? 'ARG-2481'}:USD:${(booking?.total ?? 19).toFixed(2)}:CRC16`;

  return (
    <div className="min-h-screen bg-[#090a10] text-zinc-100 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Step Indicator Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1e1738] text-purple-300 border border-purple-800/40 text-xs font-medium">
            <Check className="w-3.5 h-3.5 text-purple-400" />
            <span>Tickets</span>
          </div>

          <div className="w-8 sm:w-12 h-px bg-purple-700/60" />

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2a1d4f] text-white border border-purple-500 text-xs font-semibold shadow-[0_0_12px_rgba(120,87,255,0.25)]">
            <span>02 Payment</span>
          </div>

          <div className="w-8 sm:w-12 h-px bg-zinc-800" />

          <div className="text-zinc-500 text-xs font-medium px-2 py-1">
            <span>03 Your ticket</span>
          </div>
        </div>

        {/* Page Title & Subtitle */}
        <div className="mb-8">
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            One scan. Then you’re in.
          </h1>
          <p className="mt-2 text-zinc-400 text-sm sm:text-base">
            Pay with your Cambodian banking app. Keep this page open while we confirm your payment.
          </p>
        </div>

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Bank QR Payment Card */}
          <div className="lg:col-span-7 bg-[#12131b] border border-white/[0.08] rounded-2xl p-6 sm:p-7 shadow-xl">
            {/* Header with Title and Currency Tag */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
              <h2 className="text-lg font-semibold text-white">Bank QR payment</h2>
              <span className="bg-zinc-800/90 text-zinc-300 text-xs font-semibold px-2 py-0.5 rounded border border-zinc-700/50">
                USD
              </span>
            </div>

            {/* QR Card Presentation */}
            <div className="mt-6 flex flex-col items-center">
              {paymentSuccess ? (
                <div className="w-full max-w-[300px] py-12 px-6 bg-gradient-to-b from-emerald-950/40 to-zinc-900 border border-emerald-500/40 rounded-2xl text-center animate-in zoom-in-95">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center mx-auto mb-4 text-emerald-400">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-white">Payment Confirmed!</h3>
                  <p className="text-xs text-zinc-300 mt-1">Generating your digital ticket pass...</p>
                  <p className="text-[11px] font-mono text-zinc-500 mt-2">{simulatedTxId}</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-2xl max-w-[290px] w-full text-center text-zinc-950 flex flex-col items-center border-4 border-white">
                  <span className="font-extrabold tracking-widest text-[11px] text-zinc-900 mb-3 uppercase">
                    ARGON SESSIONS
                  </span>

                  <div className="p-2 bg-white rounded-xl">
                    <QrCodeImage
                      value={qrPaymentPayload}
                      size={200}
                      centerText="KHQR"
                      className="mx-auto"
                    />
                  </div>

                  <span className="font-extrabold text-xl text-zinc-950 mt-3 tracking-tight font-sans">
                    ${(booking?.total ?? 19).toFixed(2)} USD
                  </span>
                </div>
              )}

              <p className="mt-3 text-xs text-zinc-500 text-center">
                Illustrative payment QR · Not a payment request
              </p>

              {/* Status Alert Banner */}
              <div className="w-full mt-6 bg-[#25180f] border border-amber-900/50 rounded-xl p-4 flex items-start gap-3.5">
                {paymentSuccess ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <div className="shrink-0 mt-0.5">
                    <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-semibold text-amber-200">
                    {paymentSuccess ? 'Payment received successfully' : 'Waiting for payment'}
                  </h3>
                  <p className="text-xs text-amber-300/80 mt-0.5">
                    {paymentSuccess
                      ? 'Ticket issued. Redirecting to pass...'
                      : 'We’ll confirm automatically once received.'}
                  </p>
                </div>
              </div>

              {/* Countdown Row */}
              <div className="w-full mt-4 flex items-center justify-between text-xs px-1">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  Tickets held for you
                </span>
                <span
                  className={`font-mono font-bold text-sm ${
                    secondsRemaining < 120 ? 'text-red-400 animate-pulse' : 'text-orange-500'
                  }`}
                >
                  {formatCountdown(secondsRemaining)}
                </span>
              </div>

              {/* Interactive Demo Simulation Helper Button */}
              {!paymentSuccess && (
                <div className="w-full mt-5 pt-4 border-t border-zinc-800/80">
                  <button
                    onClick={handleApprovePayment}
                    disabled={isProcessing}
                    className="w-full py-2.5 px-4 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 hover:text-white text-xs font-medium flex items-center justify-center gap-2 transition"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Simulating Cambodian Banking App Approval...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        <span>Simulate Bank App QR Payment ($19.00 USD)</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-zinc-500 text-center mt-1.5">
                    Click to test instant payment confirmation &amp; ticket minting
                  </p>
                </div>
              )}

              {/* Cancel link */}
              <div className="mt-6 text-center">
                <button
                  onClick={handleCancel}
                  className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Cancel and return to event
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Your Order & How to Pay */}
          <div className="lg:col-span-5 space-y-6">
            {/* Your Order Card */}
            <div className="bg-[#12131b] border border-white/[0.08] rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                <h2 className="text-base font-semibold text-white">Your order</h2>
                <span className="font-mono text-xs font-medium text-zinc-400">
                  {booking?.orderNumber ?? 'ARG-2481'}
                </span>
              </div>

              {/* Event Thumbnail */}
              <div className="mt-4 rounded-xl overflow-hidden aspect-[16/8] relative border border-white/10 bg-zinc-900">
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Event Details */}
              <div className="mt-3">
                <h3 className="font-display text-lg font-bold text-white">{event.title}</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  {event.formattedDate} · {event.formattedTime}
                </p>
              </div>

              {/* Cost Breakdown */}
              <div className="mt-5 space-y-2.5 text-xs text-zinc-300 border-t border-zinc-800/80 pt-4">
                <div className="flex justify-between">
                  <span>General admission × {booking?.quantity ?? 1}</span>
                  <span className="font-medium">${(booking?.subtotal ?? 18).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service fee</span>
                  <span className="font-medium">${(booking?.serviceFee ?? 1).toFixed(2)}</span>
                </div>
              </div>

              {/* Total Row */}
              <div className="mt-4 pt-4 border-t border-zinc-800/80 flex items-baseline justify-between">
                <span className="text-xs text-zinc-300">Order total · USD</span>
                <span className="text-2xl font-black text-orange-500 font-sans tracking-tight">
                  ${(booking?.total ?? 19).toFixed(2)}
                </span>
              </div>
            </div>

            {/* How To Pay Card */}
            <div className="bg-[#12131b] border border-white/[0.08] rounded-2xl p-6 shadow-xl">
              <h3 className="text-base font-semibold text-white mb-4">How to pay</h3>

              <div className="space-y-3.5 text-xs text-zinc-300">
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-md bg-[#251f47] border border-purple-800/60 text-purple-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    1
                  </span>
                  <p className="mt-0.5 leading-relaxed">
                    Open your banking app and choose <span className="text-white font-medium">Scan QR</span>.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-md bg-[#251f47] border border-purple-800/60 text-purple-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    2
                  </span>
                  <p className="mt-0.5 leading-relaxed">
                    Scan this code and check the USD total.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-md bg-[#251f47] border border-purple-800/60 text-purple-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    3
                  </span>
                  <p className="mt-0.5 leading-relaxed">
                    Approve payment. Your ticket appears here.
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-zinc-800/80">
                <p className="text-[11px] text-zinc-500 leading-normal">
                  Please don’t pay twice. Need help? Contact support with your order number.
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
