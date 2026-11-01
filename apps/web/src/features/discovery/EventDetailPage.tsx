/**
 * features/discovery/EventDetailPage.tsx
 * Public event detail: date, location, description and ticket availability.
 */
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { PublicEventDetail } from '@argon/shared';
import { api, ApiRequestError } from '@/lib/api';
import { CATEGORY_LABELS, formatEventDate, formatPrice } from '@/lib/eventLabels';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { EventCover } from '@/components/EventCover';
import { availabilityLabel } from './EventCard';

type DetailState =
  | { kind: 'loading' }
  | { kind: 'notFound' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; event: PublicEventDetail };

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState<DetailState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });
    api
      .get<PublicEventDetail>(`/events/${id}`)
      .then((event) => !cancelled && setState({ kind: 'ready', event }))
      .catch((error: Error) => {
        if (cancelled) return;
        // 400 = malformed id in the URL; treat it like a missing event.
        const missing = error instanceof ApiRequestError && (error.status === 404 || error.status === 400);
        setState(missing ? { kind: 'notFound' } : { kind: 'error', message: error.message });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Going back keeps the feed's filters; opening a shared link has no history, so go to the feed.
  const goBack = () => (location.key === 'default' ? navigate('/') : navigate(-1));

  const backButton = (
    <button
      type="button"
      onClick={goBack}
      className="inline-flex items-center gap-2 self-start text-sm font-semibold text-fg-muted hover:text-fg"
    >
      <Icon name="arrowLeft" size={16} />
      Back to events
    </button>
  );

  if (state.kind === 'loading') {
    return (
      <div className="flex flex-col gap-6" aria-label="Loading event">
        <div className="h-5 w-32 animate-pulse rounded bg-surface-card" />
        <div className="h-64 animate-pulse rounded-lg bg-surface-card sm:h-80" />
        <div className="h-10 w-2/3 animate-pulse rounded bg-surface-card" />
      </div>
    );
  }

  if (state.kind === 'notFound' || state.kind === 'error') {
    return (
      <div className="flex flex-col gap-6">
        {backButton}
        <div className="flex flex-col items-center gap-2 rounded-lg border border-line bg-surface-card px-6 py-12 text-center">
          <h1 className="text-xl font-bold text-fg">
            {state.kind === 'notFound' ? 'Event not found' : "Couldn't load this event"}
          </h1>
          <p className="text-sm text-fg-muted">
            {state.kind === 'notFound' ? 'It may have been cancelled or is no longer available.' : state.message}
          </p>
          <Link to="/" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">
            Browse events
            <Icon name="arrowRight" size={16} />
          </Link>
        </div>
      </div>
    );
  }

  const { event } = state;
  const hasStarted = new Date(event.startsAt).getTime() <= Date.now();
  const availableTier = event.tiers.find((t) => t.remaining > 0);

  const availability = availabilityLabel(event);

  return (
    <article className="flex flex-col gap-8">
      {backButton}

      <EventCover category={event.category} coverImageUrl={event.coverImageUrl} className="h-56 rounded-lg border border-line sm:h-80">
        <div className="absolute bottom-4 left-4">
          <Badge label={CATEGORY_LABELS[event.category]} />
        </div>
        {availability && (
          <div className="absolute right-4 top-4">
            <Badge label={availability} />
          </div>
        )}
      </EventCover>

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="flex flex-col gap-8">
          <header className="flex flex-col gap-3">
            <p className="text-xs font-semibold leading-[1.5] text-accent">Hosted by {event.organizerName}</p>
            <h1 className="text-[32px] font-bold leading-[1.25] text-fg sm:text-[40px]">{event.title}</h1>
          </header>

          <div className="flex flex-col gap-2 text-base leading-[1.5] text-fg-muted">
            <p className="flex items-center gap-3">
              <Icon name="calendar" />
              {formatEventDate(event.startsAt)}
            </p>
            <p className="flex items-center gap-3">
              <Icon name="mapPin" />
              {event.venue}
            </p>
          </div>

          <div className="h-px bg-line" />

          <section className="flex flex-col gap-3">
            <h2 className="text-2xl font-bold leading-[1.25] text-fg">About this event</h2>
            <p className="whitespace-pre-line text-base leading-[1.5] text-fg-muted">
              {event.description || 'The organizer hasn’t added a description yet.'}
            </p>
          </section>
        </div>

        <aside className="flex flex-col gap-4 rounded-lg border border-line bg-surface-card p-6 lg:sticky lg:top-24">
          <h2 className="text-xl font-bold leading-[1.25] text-fg">Tickets</h2>
          <ul className="flex flex-col gap-3">
            {event.tiers.map((tier) => (
              <li key={tier.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-3 text-fg-muted">
                  <Icon name="ticket" />
                  {tier.name}
                </span>
                <Badge label={formatPrice(tier.price)} variant="price" />
              </li>
            ))}
          </ul>
          <div className="h-px bg-line" />
          <p className="text-sm text-fg-muted">
            {event.ticketsRemaining.toLocaleString()} of {event.capacity.toLocaleString()} tickets left
          </p>

          {hasStarted ? (
            <p className="rounded-lg border border-line px-4 py-3 text-center text-sm text-fg-muted">This event has started</p>
          ) : availableTier ? (
            // TODO: replace with a tier/quantity picker when booking is built.
            <Link
              to={`/checkout/${availableTier.id}`}
              className="flex h-12 items-center justify-center rounded-lg bg-accent px-5 font-semibold text-surface transition-colors hover:bg-accent/90"
            >
              Get tickets
            </Link>
          ) : (
            <p className="rounded-lg border border-line px-4 py-3 text-center text-sm text-fg-muted">Sold out</p>
          )}
        </aside>
      </div>
    </article>
  );
}
