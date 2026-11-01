# Events – User Stories & Task Checklist

Branch: `ARGON-2-event-discovery`

## Stories

**US-1 – Organizer: create & manage event listings** _(build first)_
> As an organizer, I want to create and manage event listings so I can publish my offerings to customers.
>
> Acceptance criteria: form to input event title, date, location, description, and total ticket capacity.

**US-2 – Customer: browse & filter events**
> As a customer, I want to browse and filter local events on a central feed so I can find activities easily.
>
> Acceptance criteria: responsive React UI feed, category/date filters, event detail view.

US-1 comes first because the feed (US-2) can only display events that exist. Once Phase 1
(data contract) is merged, US-1 and US-2 can be built in parallel.

---

## Decisions to make with the team (before coding)

- [x] **Category** – the `Event` model has no category. Fixed enum (e.g. MUSIC, SPORTS, FOOD,
      ARTS, TECH, OTHER) or a `Category` table? _Suggested: enum._
- [x] **Total ticket capacity** – capacity lives on `TicketTier`, not `Event`. Create one default
      tier ("General Admission") from the form's capacity, or sum multiple tiers?
      _Suggested: one default tier for now._
- [x] **Location** – schema calls it `venue`. Keep `venue` in code, label it "Location" in the UI.
- [x] **"Manage" scope** – create + edit + publish (DRAFT → PUBLISHED) + cancel? Delete?
- [ ] **Feed visibility** – feed shows only `PUBLISHED` events with `startsAt` in the future?
- [ ] **Auth** – `auth` module is a stub. Who builds login/JWT? Until then, do organizer
      routes skip the guard temporarily?

---

## Phase 0 – Local environment

- [x] `npm install`
- [x] `.env` files created from `.env.example` (api, web, scanner)
- [ ] `docker compose up -d` (Postgres 16 + Redis 7)
- [ ] `cd apps/api && npm run prisma:generate && npm run prisma:migrate`
- [ ] `npm run dev` from root → web http://localhost:5173, API http://localhost:3000

> Note: npm 11 blocks install scripts by default. If Prisma complains about missing engines,
> run `npm install-scripts approve @prisma/client @prisma/engines prisma` (agree with the team
> first – it changes the shared `package.json`).

---

## Phase 1 – Data contract (merge this first; everyone builds on it)

- [x] `apps/api/prisma/schema.prisma` – add `category` to `Event` (+ `@@index([category])`)
- [x] New migration: `npm run prisma:migrate -- --name add_event_category`
- [x] `packages/shared/src/enums.ts` – add `EventCategory` enum
- [x] `packages/shared/src/schemas/event.ts`
  - [x] add `category` to `eventSchema`
  - [x] `createEventSchema` = title, description, venue, startsAt, category, **capacity**
  - [x] `updateEventSchema` (partial of create)
  - [x] `listEventsQuerySchema` – `category?`, `from?`, `to?`, `q?`, `page`, `pageSize`
- [x] `docs/api.md` – write request/response shapes for the endpoints below
- [x] `apps/api/prisma/seed.ts` – 1 organizer user + ~10 published events across categories/dates

## Phase 2 – API (`apps/api/src/modules/events/`, `modules/organizer/`)

- [ ] `GET /events` – published events, filter by category + date range, paginated
- [ ] `GET /events/:id` – detail incl. tiers (remaining = capacity − sold − reserved)
- [x] `POST /events` – ORGANIZER; create event + default tier in one `prisma.$transaction`
- [x] `PATCH /events/:id` – ORGANIZER; only the event's owner can edit
- [x] Publish / cancel status change (via service layer – see `docs/state-machines.md`)
- [x] `GET /organizer/events` – organizer's own events (all statuses)
- [x] Tests: validation + auth guard (`tests/unit/eventSchema.test.ts`, `tests/integration/organizerEvents.test.ts`)
- [x] Tests: feed query validation (`tests/integration/publicEvents.test.ts`)
- [ ] Tests: feed filter results, ownership check (need a test database)

## Phase 3 – US-1 Organizer UI ✅ (decisions: enum categories, one free default tier, cancel instead of delete) (`apps/web/src/features/organizer/`)

- [x] `lib/api.ts` – add `patch`, attach JWT when auth is ready
- [x] `EventFormPage.tsx` – title, date/time, location, description, category, total capacity
  - [x] validate with shared `createEventSchema`; show field errors
  - [x] same page handles create (`/organizer/events/new`) and edit (`/organizer/events/:id`)
  - [x] save as draft / publish buttons
- [x] `DashboardPage.tsx` – list of my events with status badge, edit link
- [x] Wire pages into `routes.tsx` (replace placeholders)

## Phase 4 – US-2 Customer UI (`apps/web/src/features/discovery/`) ✅ (date presets in a dropdown, Figma discovery design)

- [x] `EventCatalogPage.tsx` – responsive card grid (1 col mobile → 2 tablet → 3–4 desktop)
- [x] Filters: category chips/select + date range (keep in URL query string so it's shareable)
- [x] `SearchBar.tsx` – optional text search (`q`)
- [x] Loading, empty ("No events match"), and error states
- [x] `EventDetailPage.tsx` – title, date, location, description, category, tickets remaining
- [x] Wire `/` and `/events/:id` in `routes.tsx`

## Cover posters

- [x] `Event.coverImageUrl` (nullable) + migration `20261031140000_add_event_cover_image`
- [x] Category placeholder covers (`components/EventCover.tsx`) on feed, detail, dashboard, form
- [ ] Poster upload (needs file storage) + cover input on the event form

## Phase 5 – Done check

- [ ] Organizer creates event → publishes → it appears in feed → filter finds it → detail opens
- [ ] Feed checked on mobile and desktop widths
- [ ] Every acceptance criterion above ticked
- [ ] `npm run lint && npm run typecheck && npm run test` pass
- [ ] PR to `main`, reviewed by a teammate
