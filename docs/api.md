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
- `GET /events` – List / search events
- `GET /events/:id` – Event detail
- `POST /events` – Create event _(ORGANIZER)_
- `PATCH /events/:id` – Update event _(ORGANIZER)_

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
- `GET /organizer/events` – List own events
- `GET /organizer/events/:id/metrics` – Sales metrics
- `POST /organizer/staff` – Issue staff credentials

### Health
- `GET /health` – Liveness probe

## TODO

- [ ] Swagger/OpenAPI spec generation
- [ ] Request/response schemas per endpoint
- [ ] Error code catalogue
