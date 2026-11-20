/**
 * features/discovery/EventCard.tsx
 * Event card: what's on, when, where, how much, and a clear way to book.
 * Shows the event's own photo, or a plain date panel when it has none.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PublicEvent } from '@argon/shared';
import { CATEGORY_LABELS } from '@/lib/eventLabels';
import { clockTime, dayMonth, mediumDate, shortMoney, weekdayShort } from '@/lib/publicFormat';
import { Arrow } from '../../components/public/Brand';
import { EMBER } from '../../components/public/PosterArt';

export function EventCard({ event }: { event: PublicEvent }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  useEffect(() => setPhotoFailed(false), [event.coverImageUrl]);

  const soldOut = event.ticketsRemaining === 0;
  const sellingFast = !soldOut && event.ticketsRemaining <= Math.max(5, event.capacity * 0.1);
  const photo = photoFailed ? null : event.coverImageUrl;
  const { day, month } = dayMonth(event.startsAt);
  const price = event.minPrice === 0 ? 'Free' : `From ${shortMoney(event.minPrice)}`;

  return (
    <Link
      to={`/events/${event.id}`}
      className="group flex h-full flex-col overflow-hidden bg-white text-ink transition-transform duration-150 hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <div className="relative h-[210px] shrink-0 overflow-hidden" style={photo ? undefined : { background: EMBER }}>
        {photo ? (
          <img
            src={photo}
            alt={event.title}
            loading="lazy"
            onError={() => setPhotoFailed(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full flex-col justify-end p-[20px] text-cream">
            <p className="text-[14px] font-extrabold leading-[18px] tracking-[0.08em]">{weekdayShort(event.startsAt)}</p>
            <p className="ag-display text-[72px] leading-[64px]">{day}</p>
            <p className="ag-display text-[36px] leading-[34px]">{month}</p>
          </div>
        )}
        {(soldOut || sellingFast) && (
          <span className="absolute right-[12px] top-[12px] bg-white px-[10px] py-[5px] text-[12px] font-extrabold uppercase leading-[16px] tracking-[0.06em] text-blood">
            {soldOut ? 'Sold out' : 'Selling fast'}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-[20px]">
        <p className="text-[12px] font-extrabold uppercase leading-[16px] tracking-[0.08em] text-blood">{CATEGORY_LABELS[event.category]}</p>
        <h3 className="ag-display mt-[6px] line-clamp-2 text-[28px] leading-[30px]">{event.title}</h3>
        <p className="mt-[12px] text-[15px] font-bold leading-[22px]">{mediumDate(event.startsAt)} · {clockTime(event.startsAt)}</p>
        <p className="text-[15px] leading-[22px] text-peach-muted">{event.venue}</p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-[18px]">
          <span className="text-[17px] font-extrabold leading-[22px] tracking-[-0.02em]">{soldOut ? 'Sold out' : price}</span>
          {!soldOut && (
            <span className="inline-flex h-[44px] items-center gap-[6px] bg-flame px-[18px] text-[14px] font-black uppercase tracking-[0.04em] text-white transition-colors group-hover:bg-blood">
              Book <Arrow />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
