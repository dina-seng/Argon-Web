import { BookingStatus, TicketStatus, Role } from '@argon/shared';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarInitials: string;
}

export interface TicketTier {
  id: string;
  eventId: string;
  name: string;
  price: number;
  currency: string;
  capacity: number;
  soldCount: number;
  reservedCount: number;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  venue: string;
  startsAt: string;
  formattedDate: string;
  formattedTime: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
  imageUrl: string;
  tiers: TicketTier[];
}

export interface BookingRecord {
  id: string;
  orderNumber: string;
  userId: string;
  eventId: string;
  tierId: string;
  tierName: string;
  quantity: number;
  status: BookingStatus;
  subtotal: number;
  serviceFee: number;
  total: number;
  currency: string;
  expiresAt: string; // ISO
  paymentReference: string;
  gatewayTransactionId?: string;
  createdAt: string;
  attendeeName: string;
  attendeeEmail: string;
}

export interface TicketRecord {
  id: string;
  bookingId: string;
  orderNumber: string;
  eventId: string;
  tierId: string;
  tierName: string;
  status: TicketStatus;
  qrToken: string;
  holderName: string;
  attendeeEmail: string;
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  eventImageUrl: string;
  totalPricePaid: number;
  checkedInAt: string | null;
  checkedInBy: string | null;
  createdAt: string;
  admitText: string;
}

export interface ScanResult {
  outcome: 'CHECKED_IN' | 'DUPLICATE' | 'REVOKED' | 'INVALID';
  statusCode: number;
  message: string;
  ticket?: TicketRecord;
  checkedInAt?: string;
  priorCheckedInAt?: string;
}

const STORAGE_KEY = 'argon_ticketing_data_v2';

export const INITIAL_USER: UserProfile = {
  id: 'usr-sokha-chan',
  name: 'Sokha Chan',
  email: 'sokha.chan@example.com',
  role: Role.CUSTOMER,
  avatarInitials: 'SC',
};

export const INITIAL_EVENTS: EventItem[] = [
  {
    id: 'evt-afterhours-rooftop',
    title: 'Afterhours on the rooftop',
    description: 'Under the stars and above the vibrant Phnom Penh skyline. Curated electronic beats, sunset views, and local energy.',
    venue: 'Riverside Rooftop · Phnom Penh',
    startsAt: '2026-11-14T18:00:00+07:00',
    formattedDate: 'Sat, 14 Nov 2026',
    formattedTime: '18:00 ICT',
    status: 'PUBLISHED',
    imageUrl: '/images/rooftop_party.jpg',
    tiers: [
      {
        id: 'tier-rooftop-ga',
        eventId: 'evt-afterhours-rooftop',
        name: 'General admission',
        price: 18.0,
        currency: 'USD',
        capacity: 250,
        soldCount: 184,
        reservedCount: 4,
      },
    ],
  },
  {
    id: 'evt-design-coffee',
    title: 'Design & coffee mornings',
    description: 'Creative exchange, portfolio critiques, and fresh pour-overs with Phnom Penh’s leading digital craftspeople.',
    venue: 'Workspace 1 · Phnom Penh',
    startsAt: '2026-10-24T09:00:00+07:00',
    formattedDate: 'Sat, 24 Oct 2026',
    formattedTime: '09:00 ICT',
    status: 'COMPLETED',
    imageUrl: '/images/coffee_morning.jpg',
    tiers: [
      {
        id: 'tier-coffee-ga',
        eventId: 'evt-design-coffee',
        name: 'General admission',
        price: 12.0,
        currency: 'USD',
        capacity: 35,
        soldCount: 35,
        reservedCount: 0,
      },
    ],
  },
  {
    id: 'evt-sunday-sounds',
    title: 'Sunday sounds by the river',
    description: 'Gentle acoustic rhythms by the Tonle Sap riverbank as the golden hour fades into twilight.',
    venue: 'Riverside Rooftop · Phnom Penh',
    startsAt: '2026-10-11T17:00:00+07:00',
    formattedDate: 'Sun, 11 Oct 2026',
    formattedTime: '17:00 ICT',
    status: 'COMPLETED',
    imageUrl: '/images/river_sounds.jpg',
    tiers: [
      {
        id: 'tier-river-ga',
        eventId: 'evt-sunday-sounds',
        name: 'General admission',
        price: 15.0,
        currency: 'USD',
        capacity: 120,
        soldCount: 120,
        reservedCount: 0,
      },
    ],
  },
];

export const INITIAL_BOOKINGS: BookingRecord[] = [
  {
    id: 'book-arg-2481',
    orderNumber: 'ARG-2481',
    userId: 'usr-sokha-chan',
    eventId: 'evt-afterhours-rooftop',
    tierId: 'tier-rooftop-ga',
    tierName: 'General admission',
    quantity: 1,
    status: BookingStatus.PAID,
    subtotal: 18.0,
    serviceFee: 1.0,
    total: 19.0,
    currency: 'USD',
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    paymentReference: 'ARG-2481',
    gatewayTransactionId: 'KHQR-TX-984210',
    createdAt: '2026-10-31T14:15:00+07:00',
    attendeeName: 'Sokha Chan',
    attendeeEmail: 'sokha.chan@example.com',
  },
  {
    id: 'book-arg-2306',
    orderNumber: 'ARG-2306',
    userId: 'usr-sokha-chan',
    eventId: 'evt-design-coffee',
    tierId: 'tier-coffee-ga',
    tierName: 'General admission',
    quantity: 1,
    status: BookingStatus.PAID,
    subtotal: 12.0,
    serviceFee: 1.0,
    total: 13.0,
    currency: 'USD',
    expiresAt: '2026-10-24T09:00:00+07:00',
    paymentReference: 'ARG-2306',
    gatewayTransactionId: 'KHQR-TX-883199',
    createdAt: '2026-10-20T10:00:00+07:00',
    attendeeName: 'Sokha Chan',
    attendeeEmail: 'sokha.chan@example.com',
  },
  {
    id: 'book-arg-2198',
    orderNumber: 'ARG-2198',
    userId: 'usr-sokha-chan',
    eventId: 'evt-sunday-sounds',
    tierId: 'tier-river-ga',
    tierName: 'General admission',
    quantity: 1,
    status: BookingStatus.PAID,
    subtotal: 15.0,
    serviceFee: 1.0,
    total: 16.0,
    currency: 'USD',
    expiresAt: '2026-10-11T17:00:00+07:00',
    paymentReference: 'ARG-2198',
    gatewayTransactionId: 'KHQR-TX-710283',
    createdAt: '2026-10-05T16:20:00+07:00',
    attendeeName: 'Sokha Chan',
    attendeeEmail: 'sokha.chan@example.com',
  },
];

export const INITIAL_TICKETS: TicketRecord[] = [
  {
    id: 'tkt-arg-2481',
    bookingId: 'book-arg-2481',
    orderNumber: 'ARG-2481',
    eventId: 'evt-afterhours-rooftop',
    tierId: 'tier-rooftop-ga',
    tierName: 'General admission',
    status: TicketStatus.ACTIVE,
    qrToken: 'ARG:PASS:ARG-2481:SEC-9081aef:ROOFTOP',
    holderName: 'Sokha Chan',
    attendeeEmail: 'sokha.chan@example.com',
    eventTitle: 'Afterhours on the rooftop',
    eventDate: 'Sat, 14 Nov 2026 · 18:00 ICT',
    eventVenue: 'Riverside Rooftop · Phnom Penh',
    eventImageUrl: '/images/rooftop_party.jpg',
    totalPricePaid: 19.0,
    checkedInAt: null,
    checkedInBy: null,
    createdAt: '2026-10-31T14:15:00+07:00',
    admitText: '1 guest · General admission',
  },
  {
    id: 'tkt-arg-2306',
    bookingId: 'book-arg-2306',
    orderNumber: 'ARG-2306',
    eventId: 'evt-design-coffee',
    tierId: 'tier-coffee-ga',
    tierName: 'General admission',
    status: TicketStatus.CHECKED_IN,
    qrToken: 'ARG:PASS:ARG-2306:SEC-3412bcd:DESIGN',
    holderName: 'Sokha Chan',
    attendeeEmail: 'sokha.chan@example.com',
    eventTitle: 'Design & coffee mornings',
    eventDate: 'Sat, 24 Oct 2026 · 09:00 ICT',
    eventVenue: 'Workspace 1 · Phnom Penh',
    eventImageUrl: '/images/coffee_morning.jpg',
    totalPricePaid: 13.0,
    checkedInAt: '2026-10-24T09:12:00+07:00',
    checkedInBy: 'Staff Gate A (Vireak)',
    createdAt: '2026-10-20T10:00:00+07:00',
    admitText: '1 guest · General admission',
  },
  {
    id: 'tkt-arg-2198',
    bookingId: 'book-arg-2198',
    orderNumber: 'ARG-2198',
    eventId: 'evt-sunday-sounds',
    tierId: 'tier-river-ga',
    tierName: 'General admission',
    status: TicketStatus.REVOKED,
    qrToken: 'ARG:PASS:ARG-2198:SEC-7761fca:RIVERSOUNDS',
    holderName: 'Sokha Chan',
    attendeeEmail: 'sokha.chan@example.com',
    eventTitle: 'Sunday sounds by the river',
    eventDate: 'Sun, 11 Oct 2026 · 17:00 ICT',
    eventVenue: 'Riverside Rooftop · Phnom Penh',
    eventImageUrl: '/images/river_sounds.jpg',
    totalPricePaid: 16.0,
    checkedInAt: null,
    checkedInBy: null,
    createdAt: '2026-10-05T16:20:00+07:00',
    admitText: '1 guest · General admission',
  },
];

interface TicketingStoreData {
  user: UserProfile;
  events: EventItem[];
  bookings: BookingRecord[];
  tickets: TicketRecord[];
  activeRole: Role;
  scanAuditLogs: Array<{
    id: string;
    timestamp: string;
    orderNumber: string;
    outcome: string;
    message: string;
    holderName?: string;
  }>;
}

function loadFromStorage(): TicketingStoreData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.tickets) && Array.isArray(parsed.bookings)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load ticketing storage:', err);
  }

  return {
    user: INITIAL_USER,
    events: INITIAL_EVENTS,
    bookings: INITIAL_BOOKINGS,
    tickets: INITIAL_TICKETS,
    activeRole: Role.CUSTOMER,
    scanAuditLogs: [
      {
        id: 'log-seed-1',
        timestamp: '2026-10-24T09:12:00+07:00',
        orderNumber: 'ARG-2306',
        outcome: 'CHECKED_IN',
        message: 'Checked in Sokha Chan (General admission)',
        holderName: 'Sokha Chan',
      },
    ],
  };
}

let storeState: TicketingStoreData = loadFromStorage();
const listeners = new Set<() => void>();

function notify() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storeState));
  } catch (err) {
    console.error('Failed to save state to localStorage:', err);
  }
  listeners.forEach((listener) => listener());
}

export const ticketingStore = {
  getState(): TicketingStoreData {
    return storeState;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  setActiveRole(role: Role) {
    storeState.activeRole = role;
    notify();
  },

  resetDefaults() {
    localStorage.removeItem(STORAGE_KEY);
    storeState = {
      user: INITIAL_USER,
      events: INITIAL_EVENTS,
      bookings: INITIAL_BOOKINGS,
      tickets: INITIAL_TICKETS,
      activeRole: Role.CUSTOMER,
      scanAuditLogs: [
        {
          id: 'log-seed-1',
          timestamp: '2026-10-24T09:12:00+07:00',
          orderNumber: 'ARG-2306',
          outcome: 'CHECKED_IN',
          message: 'Checked in Sokha Chan (General admission)',
          holderName: 'Sokha Chan',
        },
      ],
    };
    notify();
  },

  // 1. Booking creation (Flow A)
  createPendingBooking(input: {
    eventId: string;
    tierId: string;
    quantity: number;
    customOrderNumber?: string;
  }): BookingRecord {
    const defaultEvt = INITIAL_EVENTS[0]!;
    const defaultTier = defaultEvt.tiers[0]!;
    const event: EventItem = storeState.events.find((e) => e.id === input.eventId) ?? defaultEvt;
    const tier: TicketTier = event.tiers.find((t) => t.id === input.tierId) ?? defaultTier;
    const qty = Math.max(1, input.quantity);
    const subtotal = tier.price * qty;
    const serviceFee = 1.0;
    const total = subtotal + serviceFee;
    const orderNum = input.customOrderNumber ?? `ARG-${Math.floor(2480 + Math.random() * 50)}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    const newBooking: BookingRecord = {
      id: `book-${orderNum.toLowerCase()}`,
      orderNumber: orderNum,
      userId: storeState.user.id,
      eventId: event.id,
      tierId: tier.id,
      tierName: tier.name,
      quantity: qty,
      status: BookingStatus.PENDING,
      subtotal,
      serviceFee,
      total,
      currency: 'USD',
      expiresAt,
      paymentReference: orderNum,
      createdAt: new Date().toISOString(),
      attendeeName: storeState.user.name,
      attendeeEmail: storeState.user.email,
    };

    // Update tier reserved count
    tier.reservedCount += qty;

    // Filter out if existing with same orderNumber
    storeState.bookings = [newBooking, ...storeState.bookings.filter((b) => b.orderNumber !== orderNum)];
    notify();
    return newBooking;
  },

  // 2. Payment confirmation & ticket minting (Flow B)
  confirmPayment(bookingIdOrOrderNumber: string): { booking: BookingRecord; ticket: TicketRecord } {
    const booking = storeState.bookings.find(
      (b) => b.id === bookingIdOrOrderNumber || b.orderNumber === bookingIdOrOrderNumber
    );

    if (!booking) {
      throw new Error(`Booking ${bookingIdOrOrderNumber} not found.`);
    }

    const defaultEvt = INITIAL_EVENTS[0]!;
    const defaultTier = defaultEvt.tiers[0]!;
    const event: EventItem = storeState.events.find((e) => e.id === booking.eventId) ?? defaultEvt;
    const tier: TicketTier = event.tiers.find((t) => t.id === booking.tierId) ?? defaultTier;

    // Transition booking state to PAID
    booking.status = BookingStatus.PAID;
    booking.gatewayTransactionId = `KHQR-TX-${Math.floor(100000 + Math.random() * 900000)}`;
    tier.reservedCount = Math.max(0, tier.reservedCount - booking.quantity);
    tier.soldCount += booking.quantity;

    // Mint active ticket with unique QR token
    const tokenHash = Math.random().toString(36).substring(2, 9);
    const qrToken = `ARG:PASS:${booking.orderNumber}:SEC-${tokenHash}:${event.id.slice(0, 8).toUpperCase()}`;

    // Check if ticket already exists
    let ticket = storeState.tickets.find((t) => t.bookingId === booking.id || t.orderNumber === booking.orderNumber);

    if (ticket) {
      ticket.status = TicketStatus.ACTIVE;
      ticket.qrToken = qrToken;
    } else {
      ticket = {
        id: `tkt-${booking.orderNumber.toLowerCase()}`,
        bookingId: booking.id,
        orderNumber: booking.orderNumber,
        eventId: event.id,
        tierId: tier.id,
        tierName: tier.name,
        status: TicketStatus.ACTIVE,
        qrToken,
        holderName: booking.attendeeName,
        attendeeEmail: booking.attendeeEmail,
        eventTitle: event.title,
        eventDate: `${event.formattedDate} · ${event.formattedTime}`,
        eventVenue: event.venue,
        eventImageUrl: event.imageUrl,
        totalPricePaid: booking.total,
        checkedInAt: null,
        checkedInBy: null,
        createdAt: new Date().toISOString(),
        admitText: `${booking.quantity} guest${booking.quantity > 1 ? 's' : ''} · ${tier.name}`,
      };
      storeState.tickets = [ticket, ...storeState.tickets];
    }

    notify();
    return { booking, ticket };
  },

  // Cancel booking
  cancelBooking(bookingIdOrOrderNumber: string) {
    const booking = storeState.bookings.find(
      (b) => b.id === bookingIdOrOrderNumber || b.orderNumber === bookingIdOrOrderNumber
    );
    if (booking && booking.status === BookingStatus.PENDING) {
      booking.status = BookingStatus.CANCELLED;
      const event = storeState.events.find((e) => e.id === booking.eventId);
      const tier = event?.tiers.find((t) => t.id === booking.tierId);
      if (tier) {
        tier.reservedCount = Math.max(0, tier.reservedCount - booking.quantity);
      }
      notify();
    }
  },

  // 3. Organizer Gate Scan (Flow C)
  scanTicket(rawScanValue: string, scannedBy = 'Organizer Main Gate'): ScanResult {
    const trimmed = rawScanValue.trim();
    if (!trimmed) {
      return {
        outcome: 'INVALID',
        statusCode: 400,
        message: 'No barcode/QR data provided.',
      };
    }

    // Try finding by exact qrToken, or by orderNumber (e.g. ARG-2481), or partial token
    const ticket = storeState.tickets.find((t) => {
      if (t.qrToken === trimmed) return true;
      if (t.orderNumber.toLowerCase() === trimmed.toLowerCase()) return true;
      if (t.id.toLowerCase() === trimmed.toLowerCase()) return true;
      if (trimmed.includes(t.orderNumber)) return true;
      return false;
    });

    if (!ticket) {
      const log = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        orderNumber: trimmed.slice(0, 15),
        outcome: 'INVALID',
        message: `Unknown ticket token "${trimmed.slice(0, 24)}"`,
      };
      storeState.scanAuditLogs = [log, ...storeState.scanAuditLogs];
      notify();

      return {
        outcome: 'INVALID',
        statusCode: 404,
        message: 'Invalid ticket token. No matching active booking found in event database.',
      };
    }

    // Duplicate check-in detection (HTTP 409 Conflict according to specs)
    if (ticket.status === TicketStatus.CHECKED_IN) {
      const log = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        orderNumber: ticket.orderNumber,
        outcome: 'DUPLICATE',
        message: `DUPLICATE ATTEMPT: Already checked in at ${new Date(ticket.checkedInAt ?? Date.now()).toLocaleTimeString()}`,
        holderName: ticket.holderName,
      };
      storeState.scanAuditLogs = [log, ...storeState.scanAuditLogs];
      notify();

      return {
        outcome: 'DUPLICATE',
        statusCode: 409,
        message: `DUPLICATE SCAN DETECTED: This ticket was already checked in at ${
          ticket.checkedInAt
            ? new Date(ticket.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'prior time'
        }. Entry refused.`,
        ticket,
        checkedInAt: ticket.checkedInAt ?? undefined,
        priorCheckedInAt: ticket.checkedInAt ?? undefined,
      };
    }

    // Revoked / Expired check
    if (ticket.status === TicketStatus.REVOKED) {
      const log = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        orderNumber: ticket.orderNumber,
        outcome: 'REVOKED',
        message: 'Ticket is expired or revoked. Entry denied.',
        holderName: ticket.holderName,
      };
      storeState.scanAuditLogs = [log, ...storeState.scanAuditLogs];
      notify();

      return {
        outcome: 'REVOKED',
        statusCode: 403,
        message: 'This ticket has been REVOKED or the event has ended. Not valid for entry.',
        ticket,
      };
    }

    // Valid ACTIVE ticket -> Transition to CHECKED_IN
    const checkinTime = new Date().toISOString();
    ticket.status = TicketStatus.CHECKED_IN;
    ticket.checkedInAt = checkinTime;
    ticket.checkedInBy = scannedBy;

    const log = {
      id: `log-${Date.now()}`,
      timestamp: checkinTime,
      orderNumber: ticket.orderNumber,
      outcome: 'CHECKED_IN',
      message: `Verified: ${ticket.holderName} (${ticket.tierName})`,
      holderName: ticket.holderName,
    };
    storeState.scanAuditLogs = [log, ...storeState.scanAuditLogs];

    notify();

    return {
      outcome: 'CHECKED_IN',
      statusCode: 200,
      message: `Ticket Verified! Welcome ${ticket.holderName}.`,
      ticket,
      checkedInAt: checkinTime,
    };
  },
};
