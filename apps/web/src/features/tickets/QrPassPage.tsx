import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTicketingStore } from '../../hooks/useTicketingStore';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { QrCodeImage } from '../../components/ui/QrCodeImage';
import { TicketStatus } from '@argon/shared';
import {
  ArrowLeft,
  Check,
  Calendar,
  MapPin,
  Download,
  CalendarPlus,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ExternalLink
} from 'lucide-react';

export default function QrPassPage() {
  const { id } = useParams<{ id?: string }>();
  const { tickets, bookings } = useTicketingStore();
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [calendarSuccess, setCalendarSuccess] = useState(false);

  // Match by ticket id, order number, or fallback to first ticket (ARG-2481)
  const ticket =
    tickets.find((t) => t.id === id || t.orderNumber === id) ||
    tickets.find((t) => t.orderNumber === 'ARG-2481') ||
    tickets[0];

  const booking = bookings.find((b) => b.orderNumber === ticket?.orderNumber || b.id === ticket?.bookingId);

  // Status badge details
  const getStatusBadge = () => {
    if (!ticket) return null;
    switch (ticket.status) {
      case TicketStatus.CHECKED_IN:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-purple-950/80 text-purple-300 border border-purple-800/60 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
            Checked In
          </span>
        );
      case TicketStatus.REVOKED:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700/60">
            <Lock className="w-3.5 h-3.5 text-zinc-500" />
            Expired / Revoked
          </span>
        );
      case TicketStatus.ACTIVE:
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/70 text-emerald-400 border border-emerald-800/60 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
            <Check className="w-3 h-3 text-emerald-400" />
            Confirmed / Active
          </span>
        );
    }
  };

  // Add to calendar (.ics download)
  const handleAddToCalendar = () => {
    if (!ticket) return;
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Argon Ticketing//EN',
      'BEGIN:VEVENT',
      `SUMMARY:${ticket.eventTitle}`,
      `DESCRIPTION:Argon Digital Ticket Pass - Order ${ticket.orderNumber} (${ticket.tierName}). Attendee: ${ticket.holderName}`,
      `LOCATION:${ticket.eventVenue}`,
      'DTSTART:20261114T110000Z',
      'DTEND:20261114T170000Z',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${ticket.orderNumber}-event.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setCalendarSuccess(true);
    setTimeout(() => setCalendarSuccess(false), 3000);
  };

  // Download ticket pass
  const handleDownloadTicket = () => {
    if (!ticket) return;
    window.print();
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  if (!ticket) {
    return (
      <div className="min-h-screen bg-[#090a10] text-zinc-100 flex flex-col font-sans">
        <Header />
        <div className="flex-1 max-w-5xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">Ticket not found</h1>
          <p className="text-zinc-400 mt-2">The requested ticket or booking does not exist.</p>
          <Link to="/tickets" className="mt-4 inline-block text-primary-400 underline">
            Return to My Tickets
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const isCheckedIn = ticket.status === TicketStatus.CHECKED_IN;
  const isRevoked = ticket.status === TicketStatus.REVOKED;

  return (
    <div className="min-h-screen bg-[#090a10] text-zinc-100 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Navigation Back Link */}
        <div className="mb-4">
          <Link
            to="/tickets"
            className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>My Tickets</span>
          </Link>
        </div>

        {/* Title Header with Payment Received Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                You’re on the list.
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                <Check className="w-3 h-3 text-emerald-400" />
                Payment received
              </span>
            </div>
            <p className="mt-2 text-zinc-400 text-sm sm:text-base">
              Your ticket is confirmed. See you above the city.
            </p>
          </div>

          {/* Quick link to test organizer scanning */}
          <Link
            to={`/organizer/scanner?token=${encodeURIComponent(ticket.qrToken)}`}
            className="self-start sm:self-auto text-xs px-3 py-1.5 rounded-lg bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/50 text-purple-300 transition flex items-center gap-1.5"
          >
            <span>Scan at Gate</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 2-Column Pass Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Digital Ticket Pass Card */}
          <div className="lg:col-span-7 bg-[#12131b] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">
            {/* Event Hero Image */}
            <div className="aspect-[16/9] w-full relative bg-zinc-900 overflow-hidden">
              <img
                src={ticket.eventImageUrl}
                alt={ticket.eventTitle}
                className="w-full h-full object-cover"
              />
              {/* General Admission Pill on bottom-left of image */}
              <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md text-white text-xs px-3 py-1 rounded-md font-medium border border-white/10">
                {ticket.tierName}
              </div>
            </div>

            {/* Ticket Card Content */}
            <div className="p-6 sm:p-7">
              {/* Order Number & Status Row */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                  ORDER {ticket.orderNumber}
                </span>
                {getStatusBadge()}
              </div>

              {/* Event Title */}
              <h2 className="font-display text-2xl font-bold text-white mt-2">
                {ticket.eventTitle}
              </h2>

              {/* Date and Location */}
              <div className="mt-3 space-y-1.5 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-zinc-500 shrink-0" />
                  <span>{ticket.eventDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-zinc-500 shrink-0" />
                  <span>{ticket.eventVenue}</span>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-zinc-800/80 my-6" />

              {/* QR Code Presentation */}
              <div className="flex flex-col items-center justify-center">
                <div className="relative bg-white p-5 sm:p-6 rounded-2xl shadow-xl inline-block border-4 border-white">
                  <QrCodeImage
                    value={ticket.qrToken}
                    size={220}
                    centerText={isCheckedIn ? 'CHECKED' : 'ARGON'}
                  />

                  {/* Checked-In or Revoked Overlay */}
                  {isCheckedIn && (
                    <div className="absolute inset-0 bg-purple-950/85 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center text-white p-4 text-center animate-in fade-in">
                      <div className="w-12 h-12 rounded-full bg-purple-500/20 border-2 border-purple-400 flex items-center justify-center mb-2">
                        <Check className="w-7 h-7 text-purple-300 stroke-[3]" />
                      </div>
                      <span className="font-display font-extrabold text-base tracking-widest uppercase text-white">
                        CHECKED IN
                      </span>
                      <span className="text-[11px] text-purple-200 mt-1 font-mono">
                        {ticket.checkedInAt
                          ? new Date(ticket.checkedInAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            }) + ' ICT'
                          : 'Recorded'}
                      </span>
                      <span className="text-[10px] text-zinc-300 mt-1 bg-black/40 px-2 py-0.5 rounded">
                        Cannot be reused
                      </span>
                    </div>
                  )}

                  {isRevoked && (
                    <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center text-white p-4 text-center">
                      <Lock className="w-8 h-8 text-zinc-400 mb-1" />
                      <span className="font-display font-extrabold text-base tracking-wider text-zinc-300 uppercase">
                        EXPIRED
                      </span>
                      <span className="text-[11px] text-zinc-400 mt-1">Not valid for entry</span>
                    </div>
                  )}
                </div>

                {/* Subtext info */}
                <p className="mt-3 text-xs font-mono font-medium text-zinc-400">
                  {ticket.orderNumber} · GA · 1 OF 1
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5 text-center">
                  {isCheckedIn
                    ? 'Entry recorded · One-time QR token spent'
                    : 'Illustrative QR · Not valid for entry'}
                </p>
              </div>
            </div>

            {/* Ticket Card Footer with Holder & Admits */}
            <div className="border-t border-zinc-800/80 bg-[#0e0f17] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                  TICKET HOLDER
                </span>
                <span className="text-sm font-semibold text-white mt-0.5 block">
                  {ticket.holderName}
                </span>
              </div>

              <div className="sm:text-right">
                <span className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                  ADMITS
                </span>
                <span className="text-sm font-semibold text-white mt-0.5 block">
                  {ticket.admitText}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Actions & Details */}
          <div className="lg:col-span-5 space-y-4">
            {/* Primary Action Button: Download ticket */}
            <button
              onClick={handleDownloadTicket}
              className="w-full py-3.5 px-4 rounded-xl bg-[#7857ff] hover:bg-[#6b47ff] text-white font-semibold text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-purple-950/40"
            >
              <Download className="w-4 h-4" />
              <span>{downloadSuccess ? 'Downloaded to device' : 'Download ticket'}</span>
            </button>

            {/* Secondary Action Button: Add to calendar */}
            <button
              onClick={handleAddToCalendar}
              className="w-full py-3 px-4 rounded-xl bg-[#161723] hover:bg-[#1e1f30] border border-white/[0.08] text-white font-semibold text-sm flex items-center justify-center gap-2 transition"
            >
              <CalendarPlus className="w-4 h-4 text-zinc-300" />
              <span>{calendarSuccess ? 'Added to calendar (.ics)' : 'Add to calendar'}</span>
            </button>

            {/* Ready at the Door Card */}
            <div className="bg-[#12131b] border border-white/[0.08] rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-2 text-zinc-300 mb-2">
                <ShieldCheck className="w-5 h-5 text-zinc-400" />
                <h3 className="font-semibold text-white text-base">Ready at the door</h3>
              </div>

              <div className="space-y-3 text-xs text-zinc-400 leading-relaxed mt-2">
                <p>
                  Keep your QR ticket handy and turn up your screen brightness. A photo ID may be requested.
                </p>
                <p>
                  One scan admits one guest. Tickets cannot be reused after check-in. Doors open at 18:00 ICT.
                </p>
                <p className="text-zinc-500 pt-1 text-[11px] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  Available offline after download
                </p>
              </div>
            </div>

            {/* Payment Receipt Card */}
            <div className="bg-[#12131b] border border-white/[0.08] rounded-2xl p-6 shadow-xl">
              <h3 className="font-semibold text-white text-base">Payment receipt</h3>
              <p className="text-xs text-zinc-400 mt-1 mb-4">
                Bank QR · Order {ticket.orderNumber}
              </p>

              <div className="space-y-2.5 text-xs text-zinc-300 border-t border-zinc-800/80 pt-3">
                <div className="flex justify-between">
                  <span>General admission × 1</span>
                  <span className="font-medium">${(booking?.subtotal ?? 18).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service fee</span>
                  <span className="font-medium">${(booking?.serviceFee ?? 1).toFixed(2)}</span>
                </div>
              </div>

              {/* Total Paid Row */}
              <div className="mt-4 pt-4 border-t border-zinc-800/80 flex items-baseline justify-between">
                <span className="text-xs text-zinc-300">Total paid · USD</span>
                <span className="text-2xl font-black text-orange-500 font-sans tracking-tight">
                  ${(ticket.totalPricePaid ?? 19).toFixed(2)}
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800/80">
                <p className="text-[11px] text-zinc-500">
                  Sent to {ticket.attendeeEmail}
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
