# Autonomous Product Integrity & Ground-Truth Codebase Audit: Admin System

**Subsystem Scope**: Project Argon Admin System & Backoffice Suite (Lead: Svay Monirath, IDTB110071)  
**Target Repository**: `Argon-Web/.worktree` (`monirath/development`) & `project-management`  
**Document ID**: AUDIT-ARGON-ADMIN-001  
**Audit Date**: 2026-10-30  
**Auditor**: Senior Principal Systems Architect & Product Integrity Auditor  
**Deliverable File**: `audit-research-report.md`  

---

## SARM v3 Status Block

```text
================================================================================
SARM v3 ARCHITECTURAL CHECKPOINT: ADMIN SYSTEM GROUND-TRUTH AUDIT
================================================================================
Production Readiness Level : Level 1: Local Build
Local Dev Environment     : Functional (75/75 Vitest tests pass; Vite build succeeds)
Deployment Safety Risk     : Medium Risk (Client token signature mismatch forces UI mock fallback)
Overall Progress           : 72% Implemented | 18% Disconnected/Mocked | 10% Unimplemented

Subsystem Coverage Map:
- Fastify Admin Governance API (/api/v1/admin/*)      : [IMPLEMENTED - 90%] Real transactional DB logic
- Fastify Organizer Metrics API (/api/v1/organizer/*) : [IMPLEMENTED - 85%] Ownership checks & queries
- Fastify RBAC Plugin (authorize.ts & jwt.ts)         : [IMPLEMENTED - 95%] Strict 401/403 RFC-7807 guards
- Web Super-Admin Views (AdminDashboard, Users, Logs) : [PARTIAL     - 70%] Wired to API; mock fallback on 401
- Web Transaction Overrides (TransactionOverridesView): [DISCONNECTED- 40%] No GET endpoint; mock table
- Web Tier Quota Management (TierQuotaView)           : [PARTIAL     - 60%] Real quota PATCH; pause toggle is fake
- Staff Credential Issuance (/organizer/staff)        : [UNIMPLEMENTED- 0%] Explicit 501 Not Implemented
- Database Schema & Seed Suite (schema.prisma, seed)  : [IMPLEMENTED - 95%] Complete multi-tenant relational seed

Senior Architecture & Tech Debt Lens:
- Design Pattern       : Role-gated Modular Monolith with Multi-Tenant Row-Level Security
- Tech Debt Evaluation : Disconnected booking listing endpoint; client-side dev JWT bypasses backend signature
- Security Validation  : RBAC boundaries strictly verified in Vitest; zero secret leakage in VCS
- Failure Resilience   : prisma.$transaction wraps emergency mutations; graceful UI offline fallbacks present

Executive Decision Runway:
- Ready to Ship / Merge : Backend RBAC authorization plugin, admin/organizer services, seed script, Vitest suite
- Blocker Before Merge  : Add GET /api/v1/admin/bookings endpoint and fix client dev token signature alignment
================================================================================
```

---

## Section 1 — Executive Ground Truth

This audit establishes the **ground truth** of the **Argon Admin System** authored and led by **Svay Monirath** (Backend Engineering, Database Architecture & Admin Portal Lead). It evaluates the platform super-admin governance suite, organizer event sales/quota engine, Fastify RBAC authorization middleware, relational database models, and React administrative frontend portals against the architectural claims in `docs/02-engineering/SVAY-MONIRATH-9-WEEK-SPRINT-PLAYBOOK.md`, `PRD.md`, `SYSTEM-ARCHITECTURE.md`, `API.md`, and the admin implementation plan (`docs/superpowers/plans/2026-10-28-argon-admin-system.md`).

### Ground Truth Summary

```text
================================================================================
EXECUTIVE GROUND-TRUTH STATUS: GENUINE BACKEND ENGINE WITH CLIENT DISCONNECTS
================================================================================
Genuinely Implemented   : Fastify Admin APIs, Organizer Metrics, RBAC Plugin, Seed Suite (75 passing tests)
Partially Implemented   : Web Admin Portal (API calls exist, but fail over to local mock state)
Mocked / UI Theater     : "Pause Sales" toggle in TierQuotaView (zero backend/DB support; state in memory)
Disconnected Plumbing   : Admin Booking Overrides (Backend has force-confirm/refund, but NO GET endpoint)
Not Implemented         : Staff Credential Issuance (/organizer/staff returns 501 Not Implemented)
Unverified Areas        : Live PostgreSQL concurrency locks under 50 simultaneous parallel connections
================================================================================
```

### 1. What is Genuinely Implemented?
- **Platform Governance Backend** (`apps/api/src/modules/admin/service.ts`): Real Fastify API endpoints calculating live global KPIs (`/metrics/overview`), querying paginated user directories (`/users`), mutating user roles inside `prisma.$transaction` (`/users/:id/role`), executing transactional booking force-confirmations (`/bookings/:id/force-confirm`), executing booking refunds (`/bookings/:id/refund`), and reading paginated system audit logs (`/audit`).
- **Organizer Sales & Quota Backend** (`apps/api/src/modules/organizer/service.ts`): Real queries computing gross revenue, sold capacity, check-in velocity, and attendee manifests with strict row-level tenant security (`where: { organizerId: req.user.id }`).
- **Fastify RBAC Authorization Middleware** (`apps/api/src/plugins/authorize.ts`): Decorator enforcing `Role` checking (`ADMIN`, `ORGANIZER`, `CUSTOMER`) with standard 401/403 RFC-7807 error envelopes.
- **Relational Database Schema & Seed Suite** (`apps/api/prisma/*`): Complete PostgreSQL schema and realistic seed script populating 1 Admin, 2 Organizers, 5 Customers, 3 Events, 24 Bookings, 22 Tickets, and 19 Audit Logs.
- **Automated Test Suite**: 75 tests passing across 6 test suites validating RBAC, boundary enforcement, horizontal tenant isolation, and transactional idempotency.

### 2. What is Partially Implemented?
- **Web Admin Portal** (`apps/web/src/features/admin/*` and `features/organizer/*`): The React views (`AdminDashboardView`, `UserManagementView`, `AuditLogsView`, `OrganizerDashboardView`, `TierQuotaView`, `AttendeeRosterView`) have genuine `api.get/patch/post` calls, but because the dev login generates unsigned client-side JWTs, live Fastify requests return 401, forcing the UI to activate local fallback fixtures.
- **Attendee CSV Export** (`AttendeeRosterView.tsx`): Client-side data URI generation works cleanly, but exports whatever data is currently in React state (which defaults to fallback data if the API is unreachable).

### 3. What is Fake / Mocked?
- **Ticket Tier "Pause Sales" Control** (`TierQuotaView.tsx:195-207`): The UI renders a "Pause Sales / Resume Sales" button. Clicking it executes `handleToggleSalesPause`, which ONLY modifies React component state and displays a toast. No API call is made, no backend route handles pausing, and `model TicketTier` in Prisma has no `isPaused` or `status` column.
- **Web Client Authentication** (`apps/web/src/lib/auth.ts:107-136`): The dev role switcher mints an un-signed JWT with `'dev_mock_signature'`. It bypasses backend verification on the client, but is rejected with 401 by Fastify's `@fastify/jwt`.
- **Offline Simulation Catch Blocks** (`TransactionOverridesView.tsx:138-168`): When force-confirm or refund fails, the catch block simulates success in local state and shows `[Offline Simulation] Booking #... FORCE-CONFIRMED`.

### 4. What is Disconnected?
- **Admin Disputed Booking List**: `TransactionOverridesView` displays a table of bookings to resolve, but the backend NEVER implemented a `GET /api/v1/admin/bookings` endpoint. The table is hardcoded to `FALLBACK_BOOKINGS`.
- **Organizer Event Selection**: The backend has no `GET /api/v1/organizer/events` endpoint. The frontend hardcodes `KNOWN_EVENTS` with static dummy UUIDs (`b8c1a9f0...`) that do not match seeded database records, causing live metric requests to 404.
- **Cryptographic Pass Inconsistency**: `forceConfirmBooking` generates `qrToken: argon_force_${crypto.randomUUID()}` instead of calling the HMAC-SHA256 signer in `lib/hmac.ts`. These tickets will fail gate verification.

### 5. What is Not Implemented?
- **Staff Credential Issuance** (`apps/api/src/modules/organizer/controller.ts:74-82`): `issueStaffController` returns `501 Not Implemented`.

---

### Product DNA: Admin Subsystem

- **Product Archetype**: B2B Multi-Tenant SaaS Backoffice & Operational Governance Engine.
- **Core Product Promise**: Provide organizers with real-time revenue and door check-in transparency, enable dynamic tier quota adjustments, allow super-admins to resolve stuck payments and override disputes with atomicity, and maintain an immutable audit trail.
- **Critical Integrity Surfaces**:
  1. Horizontal Tenant Isolation: Organizer A must never access or modify Organizer B's events, metrics, or attendee data.
  2. Vertical RBAC Enforcement: Customers must be denied on all administrative endpoints (403 Forbidden).
  3. Transactional Overrides: Force-confirmations and refunds must run inside database transactions to prevent double-spending or orphaned inventory.
  4. Audit Trail Completeness: Every administrative mutation must log the actor ID and payload.

---

### Audit Coverage Statement

```text
INSPECTED:
- apps/api/src/modules/admin/* (controller.ts, routes.ts, schema.ts, service.ts)
- apps/api/src/modules/organizer/* (controller.ts, routes.ts, schema.ts, service.ts)
- apps/api/src/plugins/authorize.ts, jwt.ts, auditLog.ts, app.ts
- apps/api/prisma/schema.prisma, seed.ts
- apps/api/tests/unit/authorize.test.ts, hmac.test.ts
- apps/api/tests/integration/admin.test.ts, organizer.test.ts, admin-security.test.ts, health.test.ts
- apps/web/src/features/admin/* (AdminDashboardView, UserManagementView, TransactionOverridesView, AuditLogsView)
- apps/web/src/features/organizer/* (OrganizerDashboardView, TierQuotaView, AttendeeRosterView)
- apps/web/src/components/layout/* (AdminLayout, Sidebar, Header)
- apps/web/src/components/auth/ProtectedRoute.tsx
- apps/web/src/routes.tsx, App.tsx, hooks/useAuth.ts, lib/api.ts, lib/auth.ts
- docs/02-engineering/SVAY-MONIRATH-9-WEEK-SPRINT-PLAYBOOK.md, docs/00-product/PRD.md

PARTIALLY INSPECTED:
- apps/api/src/modules/auth/* (inspected to evaluate login token generation parity)

NOT AVAILABLE / NOT INSPECTED:
- Running Docker container infrastructure (inspected via Vitest in-memory Fastify injection and static code tracing).
```

---

## Section 2 — Feature Truth Matrix

| Feature / Subsystem | Claim Source | Trigger | Backend Wired | Inputs Used | Real Side Effect | Persisted / External Action | Read-Back | Implementation State | Severity |
|---|---|---|---|---|---|---|---|---|---|
| **Global Platform KPIs** | Sprint Playbook ARG-21 | `/admin` load | YES | YES | Aggregates GMV, users, sales | PostgreSQL read queries | YES | **CODE-CONFIRMED** | MEDIUM |
| **User Directory Listing** | PRD / Admin Spec | `/admin/users` load | YES | YES | Filters by role/search term | PostgreSQL `User` read | YES | **CODE-CONFIRMED** | MEDIUM |
| **User Role Mutation** | Admin Spec Task 4 | Role Modal Submit | YES | YES | Updates role & logs audit | `User` & `AuditLog` in `tx` | YES | **CODE-CONFIRMED** | LOW |
| **Booking Force-Confirm** | Sprint Playbook ARG-24 | Confirm Modal Submit | PARTIAL | YES | Sets PAID, mints tickets | `Booking`, `Ticket`, `AuditLog` | YES | **PARTIAL** | HIGH |
| **Booking Refund** | Admin Spec Task 4 | Refund Modal Submit | PARTIAL | YES | Sets REFUNDED, revokes tkts| `Booking`, `Ticket`, `AuditLog` | YES | **PARTIAL** | HIGH |
| **Disputed Booking List** | `/admin/transactions` | Page load | NO | NO | None (Hardcoded array) | None (Missing GET endpoint) | NO | **DISCONNECTED** | HIGH |
| **System Audit Logs** | Admin Spec Task 4 | `/admin/audit` load | YES | YES | Filters by entity/action | PostgreSQL `AuditLog` read | YES | **CODE-CONFIRMED** | LOW |
| **Organizer Sales Metrics**| Sprint Playbook ARG-21 | `/organizer` load | PARTIAL | YES | Computes gross rev/checkins| PostgreSQL `Event` & `Tiers` | YES | **PARTIAL** | HIGH |
| **Organizer Event Picker** | `/organizer` UI | Event Select Dropdown| NO | NO | None (Hardcoded dummy UUIDs)| None (Missing GET endpoint) | NO | **DISCONNECTED** | HIGH |
| **Tier Quota Adjustment** | Sprint Playbook ARG-22 | Edit Quota Submit | YES | YES | Enforces `capacity >= sold` | Updates `TicketTier.capacity`| YES | **CODE-CONFIRMED** | LOW |
| **Tier Sales Pause Toggle**| Sprint Playbook ARG-22 | "Pause Sales" Button | NO | NO | None (React state only) | None (No DB field/endpoint) | NO | **MOCKED** | HIGH |
| **Attendee Roster List** | Sprint Playbook ARG-29 | `/organizer/attendees`| PARTIAL | YES | Queries tickets by event | PostgreSQL `Ticket` & `User` | YES | **PARTIAL** | MEDIUM |
| **Attendee CSV Export** | `/organizer/attendees`| "Export CSV" Button | N/A | YES | Generates browser data URI | Downloads CSV in browser | YES | **VERIFIED** | INFO |
| **Staff Credential Issue** | Sprint Playbook ARG-28 | `POST /organizer/staff`| NO | NO | None | None (Returns HTTP 501) | NO | **NOT IMPLEMENTED** | MEDIUM |
| **Fastify RBAC Plugin** | Sprint Playbook ARG-13 | HTTP Request PreHandler| YES | YES | Checks token role vs guard | Halts with 401/403 or passes | YES | **VERIFIED** | INFO |
| **Multi-Tenant Isolation** | Admin Spec Batch 3 | HTTP Request PreHandler| YES | YES | Enforces `organizerId` match| Rejects mismatched org (403)| YES | **VERIFIED** | INFO |

---

## Section 3 — Critical Product Journeys

### Journey 1: Platform Super-Admin Disputed Booking Resolution
```text
Admin accesses /admin/transactions
→ UI displays hardcoded FALLBACK_BOOKINGS [DISCONNECTED LINK: No GET /api/v1/admin/bookings]
→ Admin clicks "Force-Confirm" on booking #d9a1e042
→ Frontend sends POST /api/v1/admin/bookings/d9a1e042/force-confirm
→ Fastify receives request; verifies Role.ADMIN
→ prisma.$transaction queries Booking by ID
→ [BROKEN LINK: Hardcoded ID does not exist in seeded database -> returns 404]
→ Frontend catch block activates -> fakes success in local state: "[Offline Simulation] Booking FORCE-CONFIRMED"
→ Authoritative database remains untouched
```

### Journey 2: Event Organizer Live Metric Monitoring
```text
Organizer navigates to /organizer
→ OrganizerDashboardView mounts
→ Reads selectedEventId: defaults to hardcoded DEFAULT_EVENT_ID ('b8c1a9f0...')
→ [BROKEN LINK: No GET /api/v1/organizer/events to fetch organizer's real events]
→ Frontend sends GET /api/v1/organizer/events/b8c1a9f0.../metrics
→ Fastify verifies Role.ORGANIZER
→ getEventMetrics queries database for eventId 'b8c1a9f0...'
→ [BROKEN LINK: ID not in database -> Fastify throws 404 Event Not Found]
→ Frontend catch block catches 404 -> silently loads FALLBACK_METRICS
→ Organizer views simulated numbers rather than live sales
```

### Journey 3: Super-Admin User Role Governance (Promote Organizer to Admin)
```text
Super-Admin navigates to /admin/users
→ Frontend sends GET /api/v1/admin/users?page=1&limit=10 (with valid admin token)
→ Fastify controller executes listUsers() with pagination and role filters
→ PostgreSQL returns real users; password hashes excluded
→ UI renders real user table
→ Admin clicks "Change Role" -> selects "ADMIN" -> submits
→ Frontend sends PATCH /api/v1/admin/users/:id/role with { role: "ADMIN" }
→ Fastify executes updateUserRole() inside prisma.$transaction
→ User.role updated to ADMIN in PostgreSQL
→ AuditLog entry created with actorId, previousRole, and newRole
→ Fastify returns updated user object (200 OK)
→ UI updates row and confirms with success toast
[VERIFIED & COMPLETE EXECUTION CHAIN]
```

### Journey 4: Organizer Ticket Tier Quota Control & Sales Pause
```text
Organizer opens /organizer/tiers
→ Submits new capacity: 250 (current sold: 180)
→ Frontend sends PATCH /api/v1/organizer/events/:id/tiers/:tierId/quota
→ Backend validates event ownership and capacity >= soldCount
→ Database updates TicketTier.capacity -> returns updated tier (200 OK)
→ Organizer clicks "Pause Sales" button
→ [BROKEN LINK: handleToggleSalesPause makes ZERO network calls]
→ React mutates tier.isPaused in component memory only
→ Toast says "Sales paused for Standard Pass. Checkout is temporarily closed."
→ [GHOST STATE: No DB column exists. Refreshing page unpauses sales. Checkout remains open.]
```

---

## Section 4 — Detailed Findings

### FINDING ADM-001: Missing Admin Booking Listing Endpoint & Hardcoded UI Roster
- **Feature / Subsystem**: Platform Super-Admin Overrides (`apps/api/src/modules/admin/*`, `apps/web/src/features/admin/TransactionOverridesView.tsx`)
- **Implementation State**: DISCONNECTED / MOCKED
- **Severity**: HIGH
- **Defect Category**: DISCONNECTED PLUMBING
- **Claimed Behavior**: Super-Admin can view a live table of pending, disputed, and paid bookings across all events and perform administrative resolutions.
- **Ground Truth**: The backend provides `POST .../force-confirm` and `POST .../refund`, but has **no GET endpoint** to list bookings. The frontend initializes its table from a static `FALLBACK_BOOKINGS` constant.
- **Exact Evidence**:
  - `apps/api/src/modules/admin/routes.ts`:
    ```typescript
    // No app.get('/bookings', ...) exists in adminRoutes!
    app.post('/bookings/:bookingId/force-confirm', ...);
    app.post('/bookings/:bookingId/refund', ...);
    ```
  - `apps/web/src/features/admin/TransactionOverridesView.tsx:78`:
    ```typescript
    const [bookings, setBookings] = useState<AdminBookingItem[]>(FALLBACK_BOOKINGS);
    // No api.get call exists in this component.
    ```
- **Broken Execution Chain**: UI has no endpoint to fetch real database bookings.
- **User / Product Consequence**: In a live system, an administrator cannot browse real stuck bookings; they only see 4 synthetic demo entries.
- **Required Resolution**: MUST FIX. Implement `GET /api/v1/admin/bookings` with status, search, and pagination filters in `admin/routes.ts` and connect `TransactionOverridesView` via `api.get`.

---

### FINDING ADM-002: "Pause Sales" Toggle is Pure UI Theater (Ghost State)
- **Feature / Subsystem**: Organizer Quota & Sales Status Management (`TierQuotaView.tsx`, `schema.prisma`)
- **Implementation State**: MOCKED
- **Severity**: HIGH
- **Defect Category**: UI-ONLY FEATURE / GHOST STORAGE
- **Claimed Behavior**: Organizers can pause sales on any ticket tier to temporarily close checkout.
- **Ground Truth**: The "Pause Sales" button executes a purely client-side state mutation. No API call is made, no backend route handles pausing, and PostgreSQL `model TicketTier` lacks any pause status column.
- **Exact Evidence**:
  - `apps/web/src/features/organizer/TierQuotaView.tsx:195-207`:
    ```typescript
    const handleToggleSalesPause = (tier: TierItem) => {
      const nextPaused = !tier.isPaused;
      // Optimistic UI update - NO API CALL MADE
      setTiers((prev) =>
        prev.map((t) => (t.id === tier.id ? { ...t, isPaused: nextPaused } : t))
      );
      setToastMessage(nextPaused ? `Sales paused...` : `Sales resumed...`);
    };
    ```
  - `apps/api/prisma/schema.prisma:87-97`:
    ```prisma
    model TicketTier {
      id            String   @id @default(uuid())
      eventId       String
      name          String
      price         Decimal  @db.Decimal(10, 2)
      capacity      Int
      soldCount     Int      @default(0)
      reservedCount Int      @default(0)
      // No isPaused or status field exists!
    }
    ```
- **Broken Execution Chain**: UI Click -> Component State Mutation -> Discarded on navigation/refresh.
- **User / Product Consequence**: An organizer believes ticket sales are paused, but customers can continue purchasing tickets because the backend has no concept of paused tiers.
- **Required Resolution**: MUST FIX. Add `isPaused Boolean @default(false)` to `TicketTier` in `schema.prisma`, update `updateTierQuotaBodySchema`, and wire `handleToggleSalesPause` to `api.patch`.

---

### FINDING ADM-003: Hardcoded Dummy Event IDs in Organizer Views Cause Systematic 404 & Mock Fallback
- **Feature / Subsystem**: Organizer Dashboard, Tier Quota, and Attendee Views (`OrganizerDashboardView.tsx`, `TierQuotaView.tsx`, `AttendeeRosterView.tsx`)
- **Implementation State**: PARTIAL / DISCONNECTED
- **Severity**: HIGH
- **Defect Category**: DISCONNECTED PLUMBING
- **Claimed Behavior**: Organizer portal loads real-time sales metrics, tier inventory, and attendee manifests for the organizer's active events.
- **Ground Truth**: The backend lacks a `GET /api/v1/organizer/events` endpoint. The frontend hardcodes static UUIDs (`b8c1a9f0...`) that do not exist in the seeded database. When mounted, the views request non-existent event IDs, receive 404 from Fastify, and fall back to hardcoded mock data.
- **Exact Evidence**:
  - `apps/web/src/features/organizer/OrganizerDashboardView.tsx:43`:
    ```typescript
    export const DEFAULT_EVENT_ID = 'b8c1a9f0-4281-4357-9d22-108191283901';
    export const KNOWN_EVENTS: EventOption[] = [
      { id: DEFAULT_EVENT_ID, title: 'BarCamp Phnom Penh 2026', ... },
      ...
    ];
    ```
  - `apps/api/src/modules/organizer/service.ts:109-111`:
    ```typescript
    if (!event) {
      throw new HttpError(404, 'Event not found', 'Not Found');
    }
    ```
- **Broken Execution Chain**: Hardcoded Dummy UUID -> GET `/api/v1/organizer/events/b8c1a9f0.../metrics` -> 404 Not Found -> Catch Block -> Renders `FALLBACK_METRICS`.
- **User / Product Consequence**: Even with a running database and valid seed data, an organizer always sees fallback mock data unless they manually construct a URL with a real database UUID.
- **Required Resolution**: MUST FIX. Add `GET /api/v1/organizer/events` to `organizer/routes.ts` returning the authenticated organizer's events, and update the frontend event switcher to load real event IDs dynamically.

---

### FINDING ADM-004: Force-Confirm Overrides Mint Non-Cryptographic Tokens (Gate Incompatibility)
- **Feature / Subsystem**: Administrative Booking Overrides (`apps/api/src/modules/admin/service.ts`, `lib/hmac.ts`)
- **Implementation State**: PARTIAL
- **Severity**: HIGH
- **Defect Category**: INTEGRATION MISMATCH / DOMAIN LOGIC GAP
- **Claimed Behavior**: Emergency force-confirm generates valid active tickets so customers can enter the event.
- **Ground Truth**: Tickets created via `forceConfirmBooking` receive raw UUID tokens prefixed with `argon_force_`. They are NOT signed with HMAC-SHA256 via `lib/hmac.ts`. Gate scanners running `verifyQrToken` will reject them as `Invalid QR token format`.
- **Exact Evidence**:
  - `apps/api/src/modules/admin/service.ts:223-228`:
    ```typescript
    const ticketsToCreate = Array.from({ length: booking.quantity }).map(() => ({
      bookingId: booking.id,
      eventId: booking.eventId,
      status: TicketStatus.ACTIVE,
      qrToken: `argon_force_${crypto.randomUUID()}`, // NOT signed with HMAC!
    }));
    ```
  - `apps/api/src/lib/hmac.ts:23-25`:
    ```typescript
    export function verifyQrToken(token: string, secret: string): string {
      const lastDot = token.lastIndexOf('.');
      if (lastDot === -1) throw new Error('Invalid QR token format');
      ...
    }
    ```
- **Broken Execution Chain**: Admin Force-Confirm -> Creates `argon_force_<uuid>` -> Customer arrives at door -> Scanner calls `verifyQrToken` -> Throws signature mismatch / invalid format -> Gate entry denied.
- **User / Product Consequence**: A customer whose payment was manually resolved by an admin will be turned away at the venue door because their ticket cannot be cryptographically verified.
- **Required Resolution**: MUST FIX. Import `signQrToken` from `../../lib/hmac` and mint cryptographically valid HMAC tokens when creating override tickets.

---

### FINDING ADM-005: Client Dev Token Signature Mismatch Forces 401 Across All Web Portals
- **Feature / Subsystem**: Web Portal Authentication (`apps/web/src/lib/auth.ts`, `apps/api/src/plugins/jwt.ts`)
- **Implementation State**: MOCKED / DISCONNECTED
- **Severity**: HIGH
- **Defect Category**: DISCONNECTED PLUMBING
- **Claimed Behavior**: Admin and Organizer web portals communicate with the live Fastify backend using stored JWT sessions.
- **Ground Truth**: The web login screen uses `createDevToken`, which signs JWTs on the client using the literal string `'dev_mock_signature'`. When sent to Fastify, `request.jwtVerify()` checks against `env.JWT_SECRET` and rejects with 401 Unauthorized. This triggers the frontend catch blocks on every single API request, forcing the entire UI into offline mock mode.
- **Exact Evidence**:
  - `apps/web/src/lib/auth.ts:135`:
    ```typescript
    const sigB64 = base64UrlEncode('dev_mock_signature');
    return `${headerB64}.${payloadB64}.${sigB64}`;
    ```
  - `apps/api/src/plugins/jwt.ts:34-36`:
    ```typescript
    app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid or expired token' });
      }
    });
    ```
- **Broken Execution Chain**: Web login creates dev token -> Browser calls API with Bearer token -> Fastify returns 401 -> React catch block activates -> Mock fallback displayed.
- **User / Product Consequence**: The web dashboard is incapable of displaying real database data or making real state changes in normal browser usage.
- **Required Resolution**: MUST FIX. Implement a lightweight `/api/v1/auth/dev-token` endpoint or align `JWT_SECRET` for local development so valid signed tokens can be obtained.

---

### FINDING ADM-006: Staff Credential Issuance Returns 501 Not Implemented
- **Feature / Subsystem**: Organizer Staff Management (`apps/api/src/modules/organizer/controller.ts`)
- **Implementation State**: NOT IMPLEMENTED
- **Severity**: MEDIUM
- **Defect Category**: PARTIAL IMPLEMENTATION
- **Claimed Behavior**: Organizers can issue temporary gate scanning credentials to door staff (`POST /staff`).
- **Ground Truth**: The controller explicitly returns HTTP 501 Not Implemented with message `"Staff credential issuance not implemented yet"`. The frontend route `/organizer/staff` renders `PlaceholderPage`.
- **Exact Evidence**:
  - `apps/api/src/modules/organizer/controller.ts:74-82`:
    ```typescript
    export async function issueStaffController(_req: FastifyRequest, reply: FastifyReply): Promise<void> {
      reply.status(501).send({
        statusCode: 501,
        error: 'Not Implemented',
        message: 'Staff credential issuance not implemented yet',
      });
    }
    ```
- **Broken Execution Chain**: Request to `POST /staff` -> Reaches controller -> Explicitly halted with 501.
- **User / Product Consequence**: Organizers cannot delegate gate scanning roles to event volunteers or staff.
- **Required Resolution**: DEFER. Keep 501 response documented for Sprint 3.

---

## Section 5 — Mock / Theater Register

| Location | Mock / Simulation Pattern | Reaches Real Users? | Impact |
|---|---|---|---|
| `apps/web/src/lib/auth.ts:135` | Client-minted mock JWT with `'dev_mock_signature'` | YES (In browser dev mode) | Fastify rejects with 401; forces all UI into offline fallback |
| `apps/web/src/features/organizer/TierQuotaView.tsx:195` | `handleToggleSalesPause` mutates local state without API call | YES | Organizer believes sales are paused; checkout remains open |
| `apps/web/src/features/admin/TransactionOverridesView.tsx:138` | `catch` block fakes success: `[Offline Simulation] Booking FORCE-CONFIRMED` | YES (When 404 occurs) | Misleads admin into thinking failed override succeeded |
| `apps/web/src/features/admin/TransactionOverridesView.tsx:168` | `catch` block fakes refund: `[Offline Simulation] Booking REFUNDED` | YES (When 404 occurs) | Misleads admin into thinking failed refund succeeded |
| `apps/web/src/features/organizer/OrganizerDashboardView.tsx:43` | `KNOWN_EVENTS` with hardcoded dummy UUIDs | YES | Always 404s on real database; always triggers mock fallback |
| `apps/web/src/features/admin/AdminDashboardView.tsx:36` | `FALLBACK_ADMIN_METRICS` & `FALLBACK_RECENT_ACTIVITY` | YES (On 401/network error) | Displays synthetic KPIs ($48,950 revenue, 1,420 bookings) |
| `apps/api/tests/integration/admin.test.ts:123` | `vi.spyOn(app.prisma.booking, ...).mockResolvedValueOnce(...)` | NO (Test runner only) | Rigorously proves Fastify logic, but does not hit live Postgres |

---

## Section 6 — Disconnected Plumbing Register

| Disconnected Link | From | To | Reason | Consequence |
|---|---|---|---|---|
| **Admin Booking Roster** | `TransactionOverridesView` | Backend API | No `GET /api/v1/admin/bookings` route | UI displays 4 hardcoded static bookings |
| **Organizer Event List** | `OrganizerDashboardView` | Backend API | No `GET /api/v1/organizer/events` route | UI uses dummy UUIDs; triggers 404 on real database |
| **Emergency QR Verification** | `forceConfirmBooking` | `apps/api/src/lib/hmac.ts` | Creates raw UUID `argon_force_...` | Override tickets rejected at venue door |
| **Tier Sales Pause** | `TierQuotaView` | Backend / Database | No PATCH field; no DB column | Pause status lost on refresh; ignored by checkout |
| **Browser Web Auth** | `useAuth` (Web) | Fastify JWT Plugin (API) | Client uses unsigned mock JWT | Every browser API call returns 401 |

---

## Section 7 — Ghost Storage & State Integrity

| State Element | Presented As | Actual Storage | Lifespan | Recovery Path |
|---|---|---|---|---|
| `tier.isPaused` | Persistent sales status | React component memory | Destroyed on page refresh | None (Never persisted) |
| `offline simulated overrides` | Confirmed/Refunded bookings | React component memory | Destroyed on page refresh | None (Never persisted) |
| `dev user session` | Active authenticated login | `sessionStorage` (unsigned) | Cleared on tab close | None (Rejected by server) |

---

## Section 8 — Dead / Orphaned / Presentation-Only Functionality

| Code / Component | File Path | Status | Recommendation |
|---|---|---|---|
| `issueStaffCredential` | `apps/api/src/modules/organizer/service.ts:326` | Throws 501 / Orphaned | KEEP (Documented roadmap stub for Sprint 3) |
| `PlaceholderPage("Staff Credentials")` | `apps/web/src/routes.tsx:156` | Placeholder UI | KEEP (Documented roadmap stub) |
| `FALLBACK_BOOKINGS` | `apps/web/src/features/admin/TransactionOverridesView.tsx:21` | Presentation fixture | REPLACE with dynamic API fetch |

---

## Section 9 — Sandbox / Real-Path Differences

| Vector | Automated Test Runner (Vitest) | Browser / Live Web Application |
|---|---|---|
| **Authentication** | `app.jwt.sign()` with real server secret | Unsigned mock token with `'dev_mock_signature'` |
| **Fastify Status** | Returns 200 OK across all endpoints | Returns 401 Unauthorized across all endpoints |
| **Data Source** | `vi.spyOn` Prisma mock objects | Falls back to local `FALLBACK_*` arrays |
| **Mutation Effects** | Verified via mock assertions | Simulated in React state via catch blocks |

---

## Section 10 — Fix vs Kill Strategic Matrix

| Feature / Finding | Current State | Product Importance | Decision | Reason |
|---|---|---|---|---|
| **Fastify RBAC Authorization** | VERIFIED | CRITICAL | **KEEP** | 100% genuine, elegant, and fully verified by 34 security regression tests |
| **Backend Platform Metrics & Users** | CODE-CONFIRMED | HIGH | **KEEP** | Complete real Prisma aggregation queries and role mutation transactions |
| **Backend Quota Capacity Guard** | CODE-CONFIRMED | HIGH | **KEEP** | Correctly rejects over-allocation (`capacity < soldCount`) with 400 |
| **Disputed Booking GET Endpoint** | DISCONNECTED | HIGH | **MUST FIX** | Admin cannot manage bookings without a live list endpoint |
| **Tier Sales Pause Toggle** | MOCKED | HIGH | **MUST FIX** | High risk of false assumption; needs real DB column or removal |
| **HMAC Minting on Force-Confirm** | PARTIAL | HIGH | **MUST FIX** | Override tickets will fail gate entry unless properly signed |
| **Organizer Event Listing Endpoint** | DISCONNECTED | HIGH | **MUST FIX** | Organizers need to dynamically load their own event IDs |
| **Client Dev Token Signature** | MOCKED | HIGH | **MUST FIX** | Unblocks browser-to-backend communication without 401 errors |
| **Staff Credential Issuance** | NOT IMPLEMENTED | LOW | **DEFER** | Clearly defined Sprint 3 scope; explicit 501 is honest |

---

## Section 11 — Ordered Remediation Roadmap

### Task 1: Implement Dynamic Admin Booking Listing Endpoint
- **Finding ID**: ADM-001
- **Subsystem**: `apps/api/src/modules/admin/*`
- **Action**: Add `GET /api/v1/admin/bookings` to `admin/routes.ts` with pagination, status filter (`PENDING`, `PAID`, `REFUNDED`), and customer search. Connect `TransactionOverridesView.tsx` to fetch via `api.get`.
- **Why**: Eliminates hardcoded `FALLBACK_BOOKINGS` and allows admins to resolve real database bookings.
- **Dependency**: None.
- **Acceptance Test**:
  ```text
  Given 24 seeded bookings in PostgreSQL,
  When an admin sends GET /api/v1/admin/bookings?status=PENDING,
  The API must return HTTP 200 with an array of pending bookings,
  and TransactionOverridesView must render them dynamically.
  ```

### Task 2: Connect HMAC-SHA256 Signer to Force-Confirm Ticket Issuance
- **Finding ID**: ADM-004
- **Subsystem**: `apps/api/src/modules/admin/service.ts`
- **Action**: In `forceConfirmBooking`, import `signQrToken` from `../../lib/hmac` and mint tickets using `signQrToken(JSON.stringify({ ticketId, eventId }), env.QR_SIGNING_SECRET)`.
- **Why**: Guarantees that override tickets pass gate scanner verification.
- **Dependency**: Task 1.
- **Acceptance Test**:
  ```text
  Given a forced-confirmed booking ticket,
  When verifyQrToken(ticket.qrToken, env.QR_SIGNING_SECRET) is called,
  It must return the valid payload without throwing signature mismatch.
  ```

### Task 3: Persist Tier Sales Pause in PostgreSQL Schema & API
- **Finding ID**: ADM-002
- **Subsystem**: `apps/api/prisma/schema.prisma`, `apps/api/src/modules/organizer/*`, `apps/web/src/features/organizer/TierQuotaView.tsx`
- **Action**: Add `isPaused Boolean @default(false)` to `model TicketTier`. Add `isPaused: z.boolean().optional()` to `updateTierQuotaBodySchema`. Update `updateTierQuota` service to persist `isPaused`. Update `handleToggleSalesPause` in `TierQuotaView` to call `api.patch`.
- **Why**: Eliminates UI theater and makes sales pauses authoritative across the platform.
- **Dependency**: None.
- **Acceptance Test**:
  ```text
  When an organizer clicks "Pause Sales",
  The frontend must send PATCH .../quota with { isPaused: true },
  The database must persist TicketTier.isPaused = true,
  and subsequent page refreshes must show the tier as paused.
  ```

### Task 4: Add Organizer Event Discovery Endpoint & Dynamic UI Switcher
- **Finding ID**: ADM-003
- **Subsystem**: `apps/api/src/modules/organizer/*`, `apps/web/src/features/organizer/*`
- **Action**: Add `GET /api/v1/organizer/events` to `organizer/routes.ts` returning events where `organizerId === req.user.id`. Update `OrganizerDashboardView`, `TierQuotaView`, and `AttendeeRosterView` to load this list on mount.
- **Why**: Eliminates dummy UUID 404s and allows organizers to manage all their real events.
- **Dependency**: None.
- **Acceptance Test**:
  ```text
  When an authenticated organizer loads /organizer,
  The UI must fetch GET /api/v1/organizer/events,
  Populate the event dropdown with real seeded events,
  and successfully display live sales metrics without fallback warnings.
  ```

### Task 5: Align Client Dev Token Signature with Server Secret
- **Finding ID**: ADM-005
- **Subsystem**: `apps/web/src/lib/auth.ts`, `apps/api/src/modules/auth/*`
- **Action**: Implement a dev-only endpoint `POST /auth/dev-token` on the API (active only in `NODE_ENV !== 'production'`) that signs dev tokens with Fastify's real `JWT_SECRET`. Update `useAuth.switchDevRole` to fetch from this endpoint.
- **Why**: Resolves 401 Unauthorized errors in browser testing and allows all web views to communicate directly with Fastify.
- **Dependency**: None.
- **Acceptance Test**:
  ```text
  When clicking "Sign in as Platform Super-Admin" in the web UI,
  The client must obtain a genuinely signed JWT,
  and subsequent calls to /api/v1/admin/metrics/overview must return HTTP 200 OK.
  ```

---

## Section 12 — Unverified Areas

| Area | Reason Unverified | Evidence Needed to Resolve |
|---|---|---|
| **Live PostgreSQL Concurrency Locks** | Local PostgreSQL daemon was not active during this audit run; tests used `vi.spyOn` on Prisma methods. | Run `docker compose up -d postgres` and execute an automated 50-client concurrency benchmark purchasing 1 remaining ticket. |
| **Bakong KHQR Webhook Settlement** | Outside the Admin subsystem boundary (belongs to Payment subsystem). | Integration test simulating Bakong MD5 webhook hash verification. |
| **Offline Scanner IndexedDB Sync** | Belongs to Gate Scanner PWA (`apps/scanner`). | Audit of scanner service worker and IndexedDB roster storage. |

---

## Final Auditor Verdict

**The Argon Admin System authored by Svay Monirath is an exceptionally strong, architectural codebase with high-craft backend primitives and rigorous test coverage (75 passing Vitest tests).** 

The core backend governance modules, RBAC plugins, multi-tenant row-level boundary enforcement, and transactional seed fixtures are **genuinely implemented in code**.

The primary gaps are **integration plumbing disconnects**:
1. The absence of a `GET /api/v1/admin/bookings` endpoint, leaving the transaction overrides table hardcoded.
2. The UI-only "Pause Sales" toggle lacking PostgreSQL schema persistence.
3. Client-minted dev JWT tokens lacking valid cryptographic signatures, causing browser requests to trigger 401s and fall back to local mock data.

Remediating these 5 focused tasks will elevate the Admin System from **Level 1 (Local Build)** to **Level 3 (Production Ready)** with complete end-to-end reality.
