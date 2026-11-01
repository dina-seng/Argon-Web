import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTicketingStore } from '../../hooks/useTicketingStore';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { TicketStatus } from '@argon/shared';
import {
  Calendar,
  MapPin,
  Ticket as TicketIcon
} from 'lucide-react';

type FilterTab = 'all' | 'upcoming' | 'past';

export default function MyTicketsPage() {
  const navigate = useNavigate();
  const { tickets } = useTicketingStore();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  // Filter logic
  const upcomingTickets = tickets.filter((t) => t.status === TicketStatus.ACTIVE);
  const pastTickets = tickets.filter(
    (t) => t.status === TicketStatus.CHECKED_IN || t.status === TicketStatus.REVOKED
  );

  const displayedTickets =
    activeTab === 'upcoming'
      ? upcomingTickets
      : activeTab === 'past'
      ? pastTickets
      : tickets;

  return (
    <div className="min-h-screen bg-[#090a10] text-zinc-100 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header Title */}
        <div className="mb-8">
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            My Tickets
          </h1>
          <p className="mt-2 text-zinc-400 text-sm sm:text-base">
            Good plans, all in one place. Your next night is ready when you are.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-8 border-b border-zinc-800/80 mb-8">
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-3 text-sm font-semibold transition-colors relative ${
              activeTab === 'all'
                ? 'text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>All tickets</span>
            <span className="ml-2 text-xs font-mono opacity-80">{tickets.length}</span>
            {activeTab === 'all' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('upcoming')}
            className={`pb-3 text-sm font-semibold transition-colors relative ${
              activeTab === 'upcoming'
                ? 'text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>Upcoming</span>
            <span className="ml-2 text-xs font-mono opacity-80">{upcomingTickets.length}</span>
            {activeTab === 'upcoming' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('past')}
            className={`pb-3 text-sm font-semibold transition-colors relative ${
              activeTab === 'past'
                ? 'text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>Past events</span>
            <span className="ml-2 text-xs font-mono opacity-80">{pastTickets.length}</span>
            {activeTab === 'past' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full" />
            )}
          </button>
        </div>

        {/* Tickets List */}
        <div className="space-y-4">
          {displayedTickets.length === 0 ? (
            <div className="text-center py-16 bg-[#12131b] border border-white/[0.06] rounded-2xl p-8">
              <TicketIcon className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white">No tickets in this tab</h3>
              <p className="text-zinc-400 text-xs mt-1">Check other tabs or discover upcoming events.</p>
              <button
                onClick={() => navigate('/checkout/tier-rooftop-ga')}
                className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium rounded-xl transition"
              >
                Book a Ticket Now
              </button>
            </div>
          ) : (
            displayedTickets.map((t) => {
              const isActive = t.status === TicketStatus.ACTIVE;
              const isCheckedIn = t.status === TicketStatus.CHECKED_IN;
              const isExpired = t.status === TicketStatus.REVOKED;

              return (
                <div
                  key={t.id}
                  className="bg-[#12131b] border border-white/[0.08] hover:border-white/[0.15] rounded-2xl p-4 sm:p-5 transition shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
                >
                  {/* Left: Thumbnail & Event Info */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 w-full md:w-auto">
                    {/* Event Image */}
                    <div className="w-full sm:w-36 h-28 sm:h-24 rounded-xl overflow-hidden shrink-0 bg-zinc-900 border border-white/10 relative">
                      <img
                        src={t.eventImageUrl}
                        alt={t.eventTitle}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Event Meta */}
                    <div className="space-y-1.5 flex-1">
                      {/* Status Badge & Order Number */}
                      <div className="flex items-center gap-2.5">
                        {isActive && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                            Active
                          </span>
                        )}
                        {isCheckedIn && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-950/80 text-purple-300 border border-purple-800/60">
                            Checked In
                          </span>
                        )}
                        {isExpired && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                            Expired
                          </span>
                        )}

                        <span className="font-mono text-xs text-zinc-500 font-medium">
                          {t.orderNumber}
                        </span>
                      </div>

                      {/* Event Title */}
                      <h2 className="font-display text-lg sm:text-xl font-bold text-white hover:text-primary-300 transition-colors">
                        <Link to={`/tickets/${t.orderNumber}`}>{t.eventTitle}</Link>
                      </h2>

                      {/* Date & Location */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-zinc-400">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                          {t.eventDate}
                        </span>
                        <span className="hidden sm:inline text-zinc-600">·</span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                          {t.eventVenue}
                        </span>
                      </div>

                      {/* Ticket Details Subtext */}
                      <p className="text-xs text-zinc-400 pt-0.5">
                        {t.tierName} · 1 ticket ·{' '}
                        {isActive && `$${t.totalPricePaid.toFixed(2)} paid`}
                        {isCheckedIn &&
                          `Checked in at ${
                            t.checkedInAt
                              ? new Date(t.checkedInAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }) + ' ICT'
                              : '09:12 ICT'
                          }`}
                        {isExpired && 'Event ended'}
                      </p>
                    </div>
                  </div>

                  {/* Right: Action Button & Subtitle */}
                  <div className="flex flex-col items-stretch sm:items-end w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-800/60">
                    {isActive ? (
                      <Link
                        to={`/tickets/${t.orderNumber}`}
                        className="px-6 py-2.5 rounded-xl bg-[#7857ff] hover:bg-[#6b47ff] text-white font-medium text-sm text-center transition shadow-md shadow-purple-950/30"
                      >
                        View ticket
                      </Link>
                    ) : (
                      <Link
                        to={`/tickets/${t.orderNumber}`}
                        className="px-6 py-2.5 rounded-xl bg-transparent hover:bg-zinc-800/60 border border-zinc-700/80 text-zinc-200 font-medium text-sm text-center transition"
                      >
                        View booking
                      </Link>
                    )}

                    <span className="text-[11px] text-zinc-500 mt-1.5 text-center sm:text-right block">
                      {isActive && 'Your QR is ready'}
                      {isCheckedIn && 'Entry recorded'}
                      {isExpired && 'No longer valid for entry'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Promo Banner Card at Bottom */}
        <div className="mt-8 bg-gradient-to-r from-[#17152b] via-[#141424] to-[#11121d] border border-purple-900/30 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div>
            <h3 className="font-semibold text-white text-base">Make room for your next good night.</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Discover more music, workshops and local gatherings.
            </p>
          </div>

          <Link
            to="/"
            className="px-5 py-2.5 rounded-xl bg-[#181926] hover:bg-[#222438] border border-zinc-700/80 text-white text-xs font-semibold transition shrink-0"
          >
            Explore events
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
