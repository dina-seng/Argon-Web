# Argon – API Reference

> **Status:** Placeholder – generated from Zod schemas via Fastify Swagger during Sprint 2.

## Base URL

| Environment | URL |
|-------------|-----|
| Local | `http://localhost:3000` |
| Production | `https://api.argon.app` (TBD) |

## Authentication

All protected endpoints require a JWT Bearer token in the `Authorization` header.

## Endpoints (summary)

### Auth
- `POST /auth/register` – Register a new user
- `POST /auth/login` – Login, receive JWT
- `POST /auth/refresh` – Refresh JWT

### Events
- `GET /events` – Customer feed: published upcoming events, filterable _(public)_
- `GET /events/:id` – Published event detail _(public)_
- `POST /events` – Create event _(ORGANIZER)_
- `PATCH /events/:id` – Update event _(ORGANIZER, own events)_
- `PATCH /events/:id/status` – Publish or cancel _(ORGANIZER, own events)_

### Bookings
- `POST /bookings` – Create booking / reserve seats _(CUSTOMER)_
- `GET /bookings/:id` – Booking detail

### Payments
- `POST /payments/webhook` – Payment gateway callback _(signed)_

### Tickets
- `GET /tickets/my` – My tickets _(CUSTOMER)_

### Check-in
- `POST /checkin/scan` – Validate QR and mark CHECKED_IN _(ORGANIZER / staff)_
- `GET /checkin/roster/:eventId` – Download offline roster

### Organizer
- `GET /organizer/events` – List own events (all statuses)
- `GET /organizer/events/:eventId` – One of own events (for the edit form)
- `GET /organizer/events/:id/metrics` – Sales metrics
- `POST /organizer/staff` – Issue staff credentials

### Health
- `GET /health` – Liveness probe

## Organizer event management

Schemas live in `packages/shared/src/schemas/event.ts`. Errors use the standard
`{ statusCode, error, message }` shape. Another organizer's event returns `404`.

**`POST /events`** – body `CreateEventInput`, returns `201` + `OrganizerEvent`.
Creates the event as `DRAFT` with one "General Admission" tier (price 0) holding `capacity`.

```json
{
  "title": "Phnom Penh Jazz Night",
  "description": "Live jazz by the river.",
  "venue": "Riverside Hall, Phnom Penh",
  "startsAt": "2026-11-07T12:00:00.000Z",
  "category": "MUSIC",
  "capacity": 200
}
```

`category` is one of `MUSIC`, `SPORTS`, `FOOD`, `ARTS`, `TECH`, `OTHER`. `startsAt` must be in the future.

**`PATCH /events/:id`** – any subset of the create body, returns `OrganizerEvent`.
`409` if the event is `CANCELLED`/`COMPLETED`, if it has more than one tier and `capacity` is sent,
or if `capacity` is below tickets already sold + reserved.

**`PATCH /events/:id/status`** – `{ "status": "PUBLISHED" | "CANCELLED" }`, returns `OrganizerEvent`.
`409` for transitions not allowed by the Event state machine (`docs/state-machines.md`).

**`OrganizerEvent`** (returned by all of the above and `GET /organizer/events[/:eventId]`):

```json
{
  "id": "uuid", "organizerId": "uuid",
  "title": "…", "description": "…", "venue": "…",
  "startsAt": "ISO-8601", "category": "MUSIC", "coverImageUrl": null, "status": "DRAFT",
  "createdAt": "ISO-8601", "updatedAt": "ISO-8601",
  "capacity": 200, "soldCount": 0
}
```

`capacity` and `soldCount` are totals across the event's ticket tiers. `coverImageUrl` is the
event's cover poster; it is `null` until poster uploads exist, and the UI shows a category placeholder.

## Customer event feed

No authentication. Only `PUBLISHED` events are returned; drafts, cancelled and unknown ids are `404`.

**`GET /events`** – query `ListEventsQuery`, returns `PaginatedResponse<PublicEvent>`.

| Param | Type | Notes |
|-------|------|-------|
| `q` | string ≤ 100 | Case-insensitive match on title, venue, description |
| `category` | `EventCategory` | |
| `from` / `to` | ISO-8601 | Date range on `startsAt`. `from` is never earlier than now |
| `page` | int ≥ 1 | Default `1` |
| `pageSize` | 1–50 | Default `12` |

Events that have already started are never listed. Results are sorted soonest first.

```json
{
  "data": [
    {
      "id": "uuid", "title": "Phnom Penh Jazz Night", "description": "…",
      "venue": "Riverside Hall, Phnom Penh", "startsAt": "ISO-8601",
      "category": "MUSIC", "coverImageUrl": null, "organizerName": "Dev Organizer",
      "capacity": 200, "ticketsRemaining": 200, "minPrice": 0
    }
  ],
  "total": 7, "page": 1, "pageSize": 12
}
```

`ticketsRemaining` = capacity − sold − reserved across tiers. `minPrice` is the cheapest tier (`0` = free).

**`GET /events/:id`** – returns `PublicEventDetail`: a `PublicEvent` plus
`tiers: [{ "id", "name", "price", "remaining" }]` (oldest tier first).

## TODO

- [ ] Swagger/OpenAPI spec generation
- [ ] Request/response schemas per endpoint
- [ ] Error code catalogue
