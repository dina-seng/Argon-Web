import { Link } from 'react-router-dom';
import { useTicketingStore } from '../../hooks/useTicketingStore';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import {
  Calendar,
  MapPin,
  Ticket,
  Sparkles,
  ArrowRight,
  QrCode
} from 'lucide-react';

export default function EventCatalogPage() {
  const { events } = useTicketingStore();

  return (
    <div className="min-h-screen bg-[#090a10] text-zinc-100 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Hero Section */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#191533] via-[#131422] to-[#0c0d16] border border-white/[0.08] p-8 sm:p-12 mb-12 shadow-2xl">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-950/60 text-primary-300 border border-primary-800/50 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5 text-primary-400" />
              <span>Cambodia’s Digital Event Pass Platform</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Quiet interface. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-primary-400 to-fuchsia-400">
                Loud nights.
              </span>
            </h1>
            <p className="mt-4 text-zinc-300 text-sm sm:text-base leading-relaxed">
              Instant KHQR bank checkout, fraud-proof digital ticket passes, and sub-second gate check-in for Phnom Penh’s most coveted rooftop gatherings, music, and creative sessions.
            </p>

            <div className="mt-8 flex flex-wrap gap-4 items-center">
              <Link
                to="/checkout/tier-rooftop-ga"
                className="px-6 py-3 rounded-xl bg-[#7857ff] hover:bg-[#6b47ff] text-white font-semibold text-sm transition shadow-lg shadow-purple-950/40 flex items-center gap-2"
              >
                <span>Book Rooftop Session</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                to="/tickets"
                className="px-6 py-3 rounded-xl bg-[#181926] hover:bg-[#222438] border border-zinc-700/80 text-white font-semibold text-sm transition flex items-center gap-2"
              >
                <Ticket className="w-4 h-4 text-zinc-400" />
                <span>My Tickets</span>
              </Link>

              <Link
                to="/organizer/scanner"
                className="px-6 py-3 rounded-xl bg-purple-950/30 hover:bg-purple-900/40 border border-purple-800/50 text-purple-300 font-semibold text-sm transition flex items-center gap-2"
              >
                <QrCode className="w-4 h-4 text-purple-400" />
                <span>Gate Scanner</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Featured Events Grid */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">Upcoming Gatherings</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Explore curated local events in Phnom Penh</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {events.map((evt) => {
            const gaTier = evt.tiers[0];
            const isCompleted = evt.status === 'COMPLETED';

            return (
              <div
                key={evt.id}
                className="bg-[#12131b] border border-white/[0.08] hover:border-white/[0.18] rounded-2xl overflow-hidden shadow-xl flex flex-col transition group"
              >
                {/* Image */}
                <div className="aspect-[16/9] w-full bg-zinc-900 relative overflow-hidden">
                  <img
                    src={evt.imageUrl}
                    alt={evt.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3">
                    {isCompleted ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-900/90 text-zinc-400 border border-zinc-700">
                        Past Event
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-950/90 text-emerald-400 border border-emerald-800">
                        Selling Fast
                      </span>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-display text-lg font-bold text-white group-hover:text-primary-300 transition-colors">
                      {evt.title}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                      {evt.description}
                    </p>

                    <div className="mt-4 space-y-1.5 text-xs text-zinc-400">
                      <p className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{evt.formattedDate} · {evt.formattedTime}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{evt.venue}</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-zinc-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block">From</span>
                      <span className="font-bold text-white text-base">
                        ${gaTier ? gaTier.price.toFixed(2) : '18.00'} <span className="text-xs text-zinc-400 font-normal">USD</span>
                      </span>
                    </div>

                    {isCompleted ? (
                      <Link
                        to="/tickets"
                        className="px-4 py-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl transition"
                      >
                        View in Passes
                      </Link>
                    ) : (
                      <Link
                        to={`/checkout/${gaTier ? gaTier.id : 'tier-rooftop-ga'}`}
                        className="px-4 py-2 bg-[#7857ff] hover:bg-[#6b47ff] text-white text-xs font-semibold rounded-xl transition shadow-md shadow-purple-950/30 flex items-center gap-1.5"
                      >
                        <span>Get Tickets</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}
