/** modules/events/service.ts – customer event feed and organizer event management */
import type { FastifyInstance } from 'fastify';
import type { Prisma } from '@prisma/client';
import { EventStatus } from '@argon/shared';
import type {
  CreateEventInput,
  EventCategory,
  ListEventsQuery,
  OrganizerEvent,
  PaginatedResponse,
  PublicEvent,
  PublicEventDetail,
  UpdateEventInput,
  UpdateEventStatusInput,
} from '@argon/shared';
import { conflict, notFound } from '../../lib/httpError';

/** Tier created from the form's "total ticket capacity". Free until pricing is added to the form. */
const DEFAULT_TIER_NAME = 'General Admission';
const DEFAULT_TIER_PRICE = 0;

/** Allowed organizer status changes: target status → statuses it may come from. */
const STATUS_TRANSITIONS: Record<UpdateEventStatusInput['status'], EventStatus[]> = {
  [EventStatus.PUBLISHED]: [EventStatus.DRAFT],
  [EventStatus.CANCELLED]: [EventStatus.DRAFT, EventStatus.PUBLISHED],
};

const EDITABLE_STATUSES: string[] = [EventStatus.DRAFT, EventStatus.PUBLISHED];

type EventWithTiers = Prisma.EventGetPayload<{ include: { tiers: true } }>;

function toOrganizerEvent({ tiers, ...event }: EventWithTiers): OrganizerEvent {
  return {
    ...event,
    category: event.category as EventCategory,
    status: event.status as EventStatus,
    startsAt: event.startsAt.toISOString(),
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
    capacity: tiers.reduce((sum, t) => sum + t.capacity, 0),
    soldCount: tiers.reduce((sum, t) => sum + t.soldCount, 0),
  };
}

/** Loads an event owned by the organizer. Other organizers' events look like they don't exist. */
async function findOwnedEvent(app: FastifyInstance, organizerId: string, eventId: string) {
  const event = await app.prisma.event.findUnique({ where: { id: eventId }, include: { tiers: true } });
  if (!event || event.organizerId !== organizerId) throw notFound('Event not found');
  return event;
}

// ── Customer feed ─────────────────────────────────────────────────────────────

const publicEventInclude = { tiers: true, organizer: { select: { name: true } } } satisfies Prisma.EventInclude;
type PublicEventRow = Prisma.EventGetPayload<{ include: typeof publicEventInclude }>;

type TierRow = PublicEventRow['tiers'][number];
const tierRemaining = (t: TierRow) => Math.max(0, t.capacity - t.soldCount - t.reservedCount);

function toPublicEvent({ tiers, organizer, ...event }: PublicEventRow): PublicEvent {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    venue: event.venue,
    startsAt: event.startsAt.toISOString(),
    category: event.category as EventCategory,
    coverImageUrl: event.coverImageUrl,
    organizerName: organizer.name,
    capacity: tiers.reduce((sum, t) => sum + t.capacity, 0),
    ticketsRemaining: tiers.reduce((sum, t) => sum + tierRemaining(t), 0),
    minPrice: tiers.length ? Math.min(...tiers.map((t) => Number(t.price))) : 0,
  };
}

/** Published events that haven't started yet, soonest first. */
export async function listEvents(app: FastifyInstance, query: ListEventsQuery): Promise<PaginatedResponse<PublicEvent>> {
  const now = new Date();
  const from = query.from && new Date(query.from) > now ? new Date(query.from) : now;

  const where: Prisma.EventWhereInput = {
    status: EventStatus.PUBLISHED,
    startsAt: { gte: from, ...(query.to && { lte: new Date(query.to) }) },
    ...(query.category && { category: query.category }),
    ...(query.q && {
      OR: [
        { title: { contains: query.q, mode: 'insensitive' } },
        { venue: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ],
    }),
  };

  const [total, events] = await app.prisma.$transaction([
    app.prisma.event.count({ where }),
    app.prisma.event.findMany({
      where,
      include: publicEventInclude,
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return { data: events.map(toPublicEvent), total, page: query.page, pageSize: query.pageSize };
}

/** A published event's detail. Drafts, cancelled and unknown events are all 404 for customers. */
export async function getEvent(app: FastifyInstance, id: string): Promise<PublicEventDetail> {
  const event = await app.prisma.event.findFirst({
    where: { id, status: EventStatus.PUBLISHED },
    include: publicEventInclude,
  });
  if (!event) throw notFound('Event not found');

  return {
    ...toPublicEvent(event),
    tiers: [...event.tiers]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((t) => ({ id: t.id, name: t.name, price: Number(t.price), remaining: tierRemaining(t) })),
  };
}

// ── Organizer event management ────────────────────────────────────────────────

export async function listOrganizerEvents(app: FastifyInstance, organizerId: string): Promise<OrganizerEvent[]> {
  const events = await app.prisma.event.findMany({
    where: { organizerId },
    include: { tiers: true },
    orderBy: { startsAt: 'asc' },
  });
  return events.map(toOrganizerEvent);
}

export async function getOrganizerEvent(app: FastifyInstance, organizerId: string, eventId: string): Promise<OrganizerEvent> {
  return toOrganizerEvent(await findOwnedEvent(app, organizerId, eventId));
}

export async function createEvent(app: FastifyInstance, organizerId: string, input: CreateEventInput): Promise<OrganizerEvent> {
  const event = await app.prisma.event.create({
    data: {
      organizerId,
      title: input.title,
      description: input.description,
      venue: input.venue,
      startsAt: new Date(input.startsAt),
      category: input.category,
      tiers: { create: { name: DEFAULT_TIER_NAME, price: DEFAULT_TIER_PRICE, capacity: input.capacity } },
    },
    include: { tiers: true },
  });
  return toOrganizerEvent(event);
}

export async function updateEvent(
  app: FastifyInstance,
  organizerId: string,
  eventId: string,
  input: UpdateEventInput,
): Promise<OrganizerEvent> {
  const event = await findOwnedEvent(app, organizerId, eventId);
  if (!EDITABLE_STATUSES.includes(event.status)) {
    throw conflict(`A ${event.status.toLowerCase()} event can't be edited`);
  }

  const data: Prisma.EventUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.venue !== undefined) data.venue = input.venue;
  if (input.startsAt !== undefined) data.startsAt = new Date(input.startsAt);
  if (input.category !== undefined) data.category = input.category;

  const { capacity } = input;
  const tier = event.tiers[0];
  if (capacity !== undefined && event.tiers.length !== 1) {
    throw conflict('Capacity can only be edited on events with a single ticket tier');
  }

  await app.prisma.$transaction(async (tx) => {
    if (capacity !== undefined && tier && capacity !== tier.capacity) {
      // Conditional update so a booking made after we read the tier can't push it over capacity.
      const updated = await tx.$executeRaw`
        UPDATE "TicketTier"
        SET "capacity" = ${capacity}, "updatedAt" = NOW()
        WHERE "id" = ${tier.id} AND "soldCount" + "reservedCount" <= ${capacity}`;
      if (updated === 0) {
        throw conflict('Capacity is lower than the number of tickets already sold or reserved');
      }
    }
    await tx.event.update({ where: { id: eventId }, data });
  });

  return getOrganizerEvent(app, organizerId, eventId);
}

export async function updateEventStatus(
  app: FastifyInstance,
  organizerId: string,
  eventId: string,
  { status }: UpdateEventStatusInput,
): Promise<OrganizerEvent> {
  const event = await findOwnedEvent(app, organizerId, eventId);
  const allowedFrom = STATUS_TRANSITIONS[status];

  if (!allowedFrom.includes(event.status as EventStatus)) {
    throw conflict(`Can't change a ${event.status.toLowerCase()} event to ${status.toLowerCase()}`);
  }
  if (status === EventStatus.PUBLISHED && event.startsAt.getTime() <= Date.now()) {
    throw conflict("Can't publish an event that has already started");
  }

  // Guard on the current status so two concurrent requests can't both apply.
  const { count } = await app.prisma.event.updateMany({
    where: { id: eventId, status: { in: allowedFrom } },
    data: { status },
  });
  if (count === 0) throw conflict('Event status changed in the meantime – reload and try again');

  return getOrganizerEvent(app, organizerId, eventId);
}
