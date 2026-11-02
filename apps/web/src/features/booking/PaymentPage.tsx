import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { QrCodeImage } from '../../components/ui/QrCodeImage';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import {
  Check,
  Loader2,
  Clock,
  ArrowLeft,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface BookingState {
  id: string;
  quantity: number;
  tierId: string;
  eventId: string;
  expiresAt: string;
}

export default function PaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const booking: BookingState | undefined = location.state?.booking;
  const tier = location.state?.tier as { name: string; price: number } | undefined;
  const event = location.state?.event as { title: string; venue: string; startsAt: string } | undefined;

  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    if (booking?.expiresAt) {
      const diff = Math.floor((new Date(booking.expiresAt).getTime() - Date.now()) / 1000);
      return Math.max(0, diff);
    }
    return 600;
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [simulatedTxId, setSimulatedTxId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // The real confirmation happens via the payment webhook on the API side.
  // This button simulates the bank app completing the payment for dev/demo purposes.
  const handleSimulatePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setSimulatedTxId(`KHQR-TX-${Math.floor(100000 + Math.random() * 900000)}`);
      setPaymentSuccess(true);
      setIsProcessing(false);
      setTimeout(() => navigate('/tickets'), 1800);
    }, 1200);
  };

  const subtotal = (tier?.price ?? 0) * (booking?.quantity ?? 1);
  const serviceFee = 1.0;
  const total = subtotal + serviceFee;
  const qrPaymentPayload = `KHQR:ARGON:${booking?.id ?? 'UNKNOWN'}:USD:${total.toFixed(2)}:CRC16`;

  return (
    <div className="min-h-screen bg-[#090a10] text-zinc-100 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Step Indicator */}
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
          <div className="text-zinc-500 text-xs font-medium px-2 py-1"><span>03 Your ticket</span></div>
        </div>

        <div className="mb-8">
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight">One scan. Then you're in.</h1>
          <p className="mt-2 text-zinc-400 text-sm sm:text-base">Pay with your Cambodian banking app. Keep this page open while we confirm your payment.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: QR */}
          <div className="lg:col-span-7 bg-[#12131b] border border-white/[0.08] rounded-2xl p-6 sm:p-7 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
              <h2 className="text-lg font-semibold text-white">Bank QR payment</h2>
              <span className="bg-zinc-800/90 text-zinc-300 text-xs font-semibold px-2 py-0.5 rounded border border-zinc-700/50">USD</span>
            </div>

            <div className="mt-6 flex flex-col items-center">
              {paymentSuccess ? (
                <div className="w-full max-w-[300px] py-12 px-6 bg-gradient-to-b from-emerald-950/40 to-zinc-900 border border-emerald-500/40 rounded-2xl text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center mx-auto mb-4 text-emerald-400">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-white">Payment Confirmed!</h3>
                  <p className="text-xs text-zinc-300 mt-1">Generating your digital ticket pass...</p>
                  <p className="text-[11px] font-mono text-zinc-500 mt-2">{simulatedTxId}</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-2xl max-w-[290px] w-full text-center text-zinc-950 flex flex-col items-center border-4 border-white">
                  <span className="font-extrabold tracking-widest text-[11px] text-zinc-900 mb-3 uppercase">ARGON SESSIONS</span>
                  <div className="p-2 bg-white rounded-xl">
                    <QrCodeImage value={qrPaymentPayload} size={200} centerText="KHQR" className="mx-auto" />
                  </div>
                  <span className="font-extrabold text-xl text-zinc-950 mt-3 tracking-tight font-sans">${total.toFixed(2)} USD</span>
                </div>
              )}

              <p className="mt-3 text-xs text-zinc-500 text-center">Illustrative payment QR · Not a payment request</p>

              <div className="w-full mt-6 bg-[#25180f] border border-amber-900/50 rounded-xl p-4 flex items-start gap-3.5">
                {paymentSuccess ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Loader2 className="w-5 h-5 text-amber-400 animate-spin shrink-0 mt-0.5" />
                )}
                <div>
                  <h3 className="text-sm font-semibold text-amber-200">{paymentSuccess ? 'Payment received' : 'Waiting for payment'}</h3>
                  <p className="text-xs text-amber-300/80 mt-0.5">{paymentSuccess ? 'Ticket issued. Redirecting...' : "We'll confirm automatically once received."}</p>
                </div>
              </div>

              <div className="w-full mt-4 flex items-center justify-between text-xs px-1">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  Tickets held for you
                </span>
                <span className={`font-mono font-bold text-sm ${secondsRemaining < 120 ? 'text-red-400 animate-pulse' : 'text-orange-500'}`}>
                  {formatCountdown(secondsRemaining)}
                </span>
              </div>

              {!paymentSuccess && (
                <div className="w-full mt-5 pt-4 border-t border-zinc-800/80">
                  <button onClick={handleSimulatePayment} disabled={isProcessing}
                    className="w-full py-2.5 px-4 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 hover:text-white text-xs font-medium flex items-center justify-center gap-2 transition">
                    {isProcessing ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Processing...</span></>
                    ) : (
                      <><Sparkles className="w-3.5 h-3.5 text-purple-400" /><span>Simulate Bank App QR Payment (${total.toFixed(2)} USD)</span></>
                    )}
                  </button>
                  <p className="text-[11px] text-zinc-500 text-center mt-1.5">Dev only — real confirmation comes from the payment webhook</p>
                </div>
              )}

              <div className="mt-6 text-center">
                <button onClick={() => navigate(-1)} className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Cancel and return
                </button>
              </div>
            </div>
          </div>

          {/* Right: Order summary */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#12131b] border border-white/[0.08] rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                <h2 className="text-base font-semibold text-white">Your order</h2>
                <span className="font-mono text-xs font-medium text-zinc-400">{booking?.id?.slice(0, 8) ?? '—'}</span>
              </div>
              <div className="mt-3">
                <h3 className="font-display text-lg font-bold text-white">{event?.title ?? 'Event'}</h3>
                <p className="text-xs text-zinc-400 mt-1">{event ? new Date(event.startsAt).toLocaleString() : ''}</p>
                <p className="text-xs text-zinc-400">{event?.venue ?? ''}</p>
              </div>
              <div className="mt-5 space-y-2.5 text-xs text-zinc-300 border-t border-zinc-800/80 pt-4">
                <div className="flex justify-between">
                  <span>{tier?.name ?? 'Ticket'} × {booking?.quantity ?? 1}</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service fee</span>
                  <span className="font-medium">${serviceFee.toFixed(2)}</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-zinc-800/80 flex items-baseline justify-between">
                <span className="text-xs text-zinc-300">Order total · USD</span>
                <span className="text-2xl font-black text-orange-500 font-sans tracking-tight">${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-[#12131b] border border-white/[0.08] rounded-2xl p-6 shadow-xl">
              <h3 className="text-base font-semibold text-white mb-4">How to pay</h3>
              <div className="space-y-3.5 text-xs text-zinc-300">
                {['Open your banking app and choose Scan QR.', 'Scan this code and confirm the USD total.', 'Approve payment. Your ticket appears here.'].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-md bg-[#251f47] border border-purple-800/60 text-purple-300 font-bold flex items-center justify-center shrink-0 text-[11px]">{i + 1}</span>
                    <p className="mt-0.5 leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
