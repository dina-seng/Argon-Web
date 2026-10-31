/**
 * features/discovery/EventCard.tsx – one event in the customer feed grid.
 */
import { Link } from 'react-router-dom';
import type { PublicEvent } from '@argon/shared';
import { CATEGORY_LABELS, formatEventDateShort, formatPrice } from '@/lib/eventLabels';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { EventCover } from '@/components/EventCover';

/** "Sold out" / "Few left" when tickets are scarce, otherwise null. */
export function availabilityLabel(event: Pick<PublicEvent, 'ticketsRemaining' | 'capacity'>): string | null {
  if (event.ticketsRemaining === 0) return 'Sold out';
  if (event.ticketsRemaining <= Math.max(5, event.capacity * 0.1)) return 'Few left';
  return null;
}

export function priceLabel(event: Pick<PublicEvent, 'minPrice'>): string {
  return event.minPrice === 0 ? 'Free' : `From ${formatPrice(event.minPrice)}`;
}

export function EventCard({ event }: { event: PublicEvent }) {
  const availability = availabilityLabel(event);
  const soldOut = event.ticketsRemaining === 0;

  return (
    <Link
      to={`/events/${event.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface-card transition-colors hover:border-line-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <EventCover category={event.category} coverImageUrl={event.coverImageUrl} className="h-[184px] shrink-0">
        <div className="absolute bottom-4 left-4">
          <Badge label={CATEGORY_LABELS[event.category]} />
        </div>
        {availability && (
          <div className="absolute right-4 top-4">
            <Badge label={availability} />
          </div>
        )}
      </EventCover>

      <div className="flex flex-1 flex-col gap-4 p-6">
        <h2 className="line-clamp-2 text-xl font-bold leading-[1.25] text-fg">{event.title}</h2>

        <div className="flex flex-col gap-2 text-sm leading-[1.5] text-fg-muted">
          <p className="flex items-center gap-3">
            <Icon name="calendar" />
            <span className="truncate">{formatEventDateShort(event.startsAt)}</span>
          </p>
          <p className="flex items-center gap-3">
            <Icon name="mapPin" />
            <span className="truncate">{event.venue}</span>
          </p>
        </div>

        <div className="mt-auto h-px bg-line" />

        <div className="flex items-center justify-between">
          <Badge label={priceLabel(event)} variant="price" />
          <span
            className={`inline-flex items-center gap-1 text-sm font-semibold leading-[17px] ${
              soldOut ? 'text-fg-muted' : 'text-accent group-hover:underline'
            }`}
          >
            View details
            <Icon name="arrowRight" size={16} />
          </span>
        </div>
      </div>
    </Link>
  );
}
