# Argon Backend Service Ground-Truth Audit Report

**Target Scope**: Backend REST API (`apps/api`), Shared Contracts (`packages/shared`), Prisma DDL & Multi-Tenant Infrastructure  
**Deliverable File**: `docs/backend-service-audit.md`  
**Execution Timestamp**: 2026-11-16  
**Repository Working Copy**: `Argon-Web` (Branch `main`)  
**Audit Standard**: Enterprise Security, Concurrency, and Ground-Truth Architecture Protocol  

---

## 1. Executive Summary & Readiness Scorecard

A ground-truth architectural, security, and performance audit of the **Argon Backend API** (`apps/api`) was conducted. The backend powers the Argon Event Discovery & QR Ticketing Platform, managing event publishing, transactional ticket reservations, payment webhook processing, gate scanning, and super-admin governance.

### Subsystem Health & Production Readiness Scorecard

| Category | Score | Status | Primary Ground-Truth Finding |
| :--- | :---: | :---: | :--- |
| **Monorepo & Build Health** | **98%** | **PASS** | Clean build across all 4 workspaces (`@argon/shared`, `@argon/api`, `@argon/scanner`, `@argon/web`). TypeScript compiles with 0 errors. |
| **Authentication & RBAC** | **78%** | **ACTION REQUIRED** | Robust JWT + Redis revocation architecture, but inconsistent authorization enforcement across modules, allowing token-revocation bypass on `/events`. |
| **Multi-Tenant Security** | **68%** | **CRITICAL** | Severe Broken Object-Level Authorization (BOLA) in `GET /checkin/roster/:eventId` allowing cross-organizer leakage of attendee lists and live QR tokens. |
| **Concurrency & Integrity** | **74%** | **HIGH RISK** | Atomic reservation Raw SQL exists, but ticket minting is detached outside the payment transaction, and hold reconciliation over-decrements on race conditions. |
| **Resilience & Scalability** | **65%** | **HIGH RISK** | Hard Single Point of Failure (SPOF) on Redis causes 100% of authenticated routes to fail with HTTP 500 when Redis is unavailable. In-memory OOM vulnerability in admin metrics. |
| **API Standards & Error Handling** | **80%** | **ACCEPTABLE** | Fastify Type Provider with Zod schemas is clean, but RFC-7807 problem details are stubbed and raw internal database error messages leak to clients. |

**Overall Production Readiness Rating**: **Level 2: Staging Candidate (Requires Critical Security & Concurrency Hardening Prior to Production Launch)**

---

## 2. Architecture & Runtime Topology

### 2.1 Technology Stack & Monorepo Configuration
- **Runtime**: Node.js 20+ ESM
- **Framework**: Fastify 4 with `fastify-type-provider-zod`
- **Data Persistence**: PostgreSQL 16 managed via Prisma ORM 5.22.0
- **Cache & Ephemeral Storage**: Redis 7.2 (`ioredis`) for JWT revocation, user suspension, and 10-minute ticket hold reservations
- **Shared Contracts**: `@argon/shared` providing shared Enums, TypeScript interfaces, and Zod schemas

### 2.2 Dual-Mode Hosting Evaluation

The service defines two runtime modes:
1. **Mode A: Serverless Functions (`apps/api/api/index.js` on Vercel)**:
   - Request lifecycle is ephemeral. Prisma and Redis instances are cached across warm function instances via `vercelApp ??= buildApp()`.
   - **Architectural Gap**: The background hold sweeper (`setInterval` in `server.ts`) **never runs** in serverless execution. Expired ticket reservations will remain locked unless an external cron or on-demand sweeper triggers `runHoldReconciliation`.
2. **Mode B: Persistent Container / Long-Running Process (`apps/api/src/server.ts` on Render/VPS)**:
   - Long-lived Node.js process listening on `0.0.0.0:${PORT}` with connection pooling.
   - Runs the 60-second background reconciliation sweeper.

### 2.3 Unmanaged Database Connection Leak Finding

In `apps/api/src/modules/organizer/service.ts` (lines 30–36):
```typescript
let defaultPrisma: PrismaClient | null = null;
function getPrismaClient(): PrismaClient {
  if (!defaultPrisma) {
    defaultPrisma = new PrismaClient();
  }
  return defaultPrisma;
}
```
**Architecture Defect**: `modules/organizer/service.ts` instantiates an independent, unmanaged `PrismaClient` outside Fastify's decorator (`app.prisma`). This bypasses the centralized connection pool, creates duplicate database connection pools, and is not hooked into graceful shutdown (`app.addHook('onClose')`), causing database connection exhaustion on hosted PostgreSQL platforms like Neon or Supabase.

---

## 3. Vulnerability & Security Findings (Detailed Analysis)

### 3.1 [CRITICAL] SEC-01: Broken Object-Level Authorization (BOLA) & QR Token Leakage in Roster Export

- **Location**: `apps/api/src/modules/checkin/controller.ts` (lines 24–31) and `service.ts` (lines 119–137)
- **Endpoint**: `GET /checkin/roster/:eventId` (and `/api/v1/checkin/roster/:eventId`)
- **Severity**: **Critical (CVSS 8.6)**
- **Mechanics**:
  ```typescript
  // controller.ts
  export async function rosterController(req: FastifyRequest<{ Params: { eventId: string } }>, reply: FastifyReply) {
    const { eventId } = req.params;
    const roster = await exportRoster(req.server, eventId);
    return reply.send(roster);
  }

  // service.ts
  export async function exportRoster(app: FastifyInstance, eventId: string): Promise<unknown[]> {
    const tickets = await app.prisma.ticket.findMany({
      where: { eventId },
      include: { booking: { include: { user: true } } },
    });
    return tickets.map((t) => ({
      ticketId: t.id,
      qrToken: t.qrToken, // <--- EXPOSES RAW LIVE HMAC PASS
      status: t.status,
      holderName: t.booking?.user?.name ?? 'Attendee',
    }));
  }
  ```
- **Impact**:
  1. **Zero Tenant Isolation**: Any user holding the `ORGANIZER` role can submit any other organizer's `eventId` and download the entire attendee roster of competitor events.
  2. **Active Gate Pass Theft**: The endpoint returns the live, unscanned `qrToken` of every ticket. An unauthorized organizer or compromised account can harvest valid QR passes, forge tickets, and bypass physical gate entry.
- **Required Remediation**:
  1. Enforce ownership verification: `event.organizerId === req.user.sub` or `req.user.role === 'ADMIN'`.
  2. Redact `qrToken` from roster export payloads. Only return ticket status, tier name, holder name, and check-in timestamp.

---

### 3.2 [HIGH] SEC-02: Overly Permissive Wildcard CORS with Credentials

- **Location**: `apps/api/src/plugins/cors.ts` (line 24)
- **Severity**: **High (CVSS 7.5)**
- **Mechanics**:
  ```typescript
  if (
    configuredOrigins.includes(origin) ||
    origin.endsWith('.vercel.app') || // <--- PERMISSIVE WILDCARD
    origin.startsWith('http://localhost:')
  ) {
    return cb(null, true);
  }
  ```
  Combined with `credentials: true`.
- **Impact**:
  `origin.endsWith('.vercel.app')` matches **any** website hosted on Vercel. A malicious third party can deploy a phishing or malicious script at `https://evil-attacker.vercel.app`, induce an authenticated Argon user (admin or organizer) to visit it, and make authenticated cross-origin API requests with full session credentials.
- **Required Remediation**:
  Replace dynamic subdomain matching with an explicit whitelist of owned domains (`ARGON_WEB_URL`, `ARGON_SCANNER_URL`) loaded from environment variables, or strictly validate that the origin belongs to your specific Vercel team/project prefix.

---

### 3.3 [MEDIUM] SEC-03: Inconsistent RBAC Architecture & Token Revocation Bypass

- **Location**: `apps/api/src/lib/requireRole.ts` vs `apps/api/src/plugins/authorize.ts` & `jwt.ts`
- **Severity**: **Medium (CVSS 6.5)**
- **Mechanics**:
  The codebase uses two conflicting authorization implementations:
  1. `apps/api/src/plugins/jwt.ts` (`app.authenticate`) verifies the JWT **and** queries Redis for blacklisted access tokens and suspended user accounts (`isUserRevoked`).
  2. `apps/api/src/lib/requireRole.ts` (`requireRole(Role.ORGANIZER)`) directly calls `request.jwtVerify()` and checks `roles.includes(...)`, completely skipping the Redis revocation and suspension check!
- **Impact**:
  Routes in `apps/api/src/modules/events/routes.ts` use `requireRole(Role.ORGANIZER)`. If an admin suspends a malicious organizer or an organizer logs out, their existing JWT token remains 100% active and authorized to create, update, or cancel events until the 15-minute JWT expiration expires.
  Furthermore, `requireRole(Role.ORGANIZER)` rejects `Role.ADMIN` with a `403 Forbidden`, preventing super-admins from editing events through standard event routes.
- **Required Remediation**:
  Deprecate `lib/requireRole.ts` and standardize all routes on `preHandler: [app.authenticate, app.authorize([...])]`.

---

### 3.4 [MEDIUM] SEC-04: Missing PreHandler RBAC Guard on Audit Route

- **Location**: `apps/api/src/modules/audit/routes.ts` (line 5)
- **Severity**: **Medium**
- **Mechanics**:
  ```typescript
  export async function auditRoutes(app: FastifyInstance) {
    app.get('/', { preHandler: [app.authenticate], handler: listAuditLogsController });
  }
  ```
  The route definition only attaches `app.authenticate`, not `app.authorize([Role.ADMIN])`. While `listAuditLogsController` contains an internal check (`if (req.user.role !== Role.ADMIN)`), this violates defensive-in-depth principles and creates an architectural inconsistency with `modules/admin/routes.ts`.

---

### 3.5 [MEDIUM] SEC-05: HMAC Gate Signature Verification Swallowed

- **Location**: `apps/api/src/modules/checkin/service.ts` (lines 30–35)
- **Severity**: **Medium**
- **Mechanics**:
  ```typescript
  // 1. Verify HMAC token signature if secret signing is active
  try {
    verifyQrToken(qrToken, env.QR_SIGNING_SECRET);
  } catch {
    // If token verification fails, also check if it's stored directly
  }
  ```
- **Impact**:
  The cryptographic verification is completely bypassed. If an attacker submits a malformed or forged HMAC signature, the exception is caught and silently discarded. The system immediately executes database lookups against `Ticket.qrToken`. This negates the cryptographic protection of offline-verifiable HMAC QR codes.
- **Required Remediation**:
  If a token carries an HMAC signature structure, validation failure must immediately return `outcome: 'INVALID'` without hitting the database.

---

### 3.6 [LOW] SEC-06: Unvetted Self-Registration of Organizer Role

- **Location**: `apps/api/src/modules/auth/schema.ts` (line 16)
- **Severity**: **Low**
- **Mechanics**:
  `registerSchema` permits `role: z.enum(['CUSTOMER', 'ORGANIZER']).default('CUSTOMER')`.
- **Impact**:
  Any unauthenticated public caller can register directly as an `ORGANIZER` and immediately publish events on the discovery feed without administrative verification, payment setup, or identity validation.

---

## 4. Concurrency, Data Integrity & State Machine Audit

### 4.1 [HIGH] DATA-01: Non-Transactional Ticket Minting in Payment Webhook

- **Location**: `apps/api/src/modules/payments/service.ts` (lines 61–95)
- **Severity**: **High**
- **Mechanics**:
  ```typescript
  // Step 3: Transaction updates booking and tier capacity
  await app.prisma.$transaction(async (tx) => {
    await tx.booking.updateMany({
      where: { id: booking.id, status: BookingStatus.PENDING },
      data: { status: BookingStatus.PAID, gatewayTransactionId: payload.gatewayTransactionId },
    });
    await tx.ticketTier.update({
      where: { id: booking.tierId },
      data: {
        soldCount: { increment: booking.quantity },
        reservedCount: { decrement: booking.quantity },
      },
    });
  });

  // Step 4: Mint tickets OUTSIDE the transaction
  await mintTickets(app, bookingId!, bookingQuantity!);
  ```
- **Failure Mode**:
  If the process crashes, network times out, or database connection drops between Step 3 and Step 4:
  - The booking is permanently marked `PAID`.
  - Quotas are updated (`soldCount` incremented).
  - **Zero tickets are created in the database.**
  - The attendee has paid their money but receives no tickets, order details display empty ticket lists, and webhooks cannot be safely retried because the idempotency check sees `PAID` and exits early (`if (existingBooking?.status === BookingStatus.PAID) return;`).
- **Required Remediation**:
  Move ticket creation **inside** the Prisma `$transaction` client (`tx.ticket.createMany(...)`), ensuring atomicity.

---

### 4.2 [HIGH] DATA-02: Over-Decrement Inventory Race Condition in Hold Sweeper

- **Location**: `apps/api/src/jobs/holdReconciliation.ts` (lines 19–28)
- **Severity**: **High**
- **Mechanics**:
  ```typescript
  await app.prisma.$transaction(async (tx) => {
    await tx.booking.updateMany({
      where: { id: booking.id, status: BookingStatus.PENDING },
      data: { status: BookingStatus.EXPIRED },
    });
    await tx.ticketTier.update({
      where: { id: booking.tierId },
      data: { reservedCount: { decrement: booking.quantity } },
    });
  });
  ```
- **Failure Mode**:
  `updateMany` returns `{ count: number }`. If two sweeper instances execute concurrently (or if a payment webhook confirms the booking at the exact millisecond the sweeper runs), `updateMany` updates 0 rows (`count === 0`). However, line 24 **unconditionally decrements** `ticketTier.reservedCount`!
  This leads to negative reserved counts and permanent inventory corruption over time.
- **Required Remediation**:
  ```typescript
  const { count } = await tx.booking.updateMany({
    where: { id: booking.id, status: BookingStatus.PENDING },
    data: { status: BookingStatus.EXPIRED },
  });
  if (count > 0) {
    await tx.ticketTier.update({
      where: { id: booking.tierId },
      data: { reservedCount: { decrement: booking.quantity } },
    });
  }
  ```

---

### 4.3 [MEDIUM] DATA-03: Race Condition on Gate Check-In (`scanTicket`)

- **Location**: `apps/api/src/modules/checkin/service.ts` (lines 40–91)
- **Severity**: **Medium**
- **Mechanics**:
  `scanTicket` reads the ticket with `tx.ticket.findUnique`, evaluates `ticket.status === TicketStatus.ACTIVE`, and subsequently executes `tx.ticket.update`. Under PostgreSQL default Read Committed isolation, if an attendee presents the same QR code simultaneously at two adjacent gate turnstiles, both transactions read `ACTIVE` concurrently and both write `CHECKED_IN`, successfully admitting the holder twice.
- **Required Remediation**:
  Use an atomic conditional update:
  ```typescript
  const { count } = await tx.ticket.updateMany({
    where: { id: ticket.id, status: TicketStatus.ACTIVE },
    data: { status: TicketStatus.CHECKED_IN, checkedInAt: now, checkedInBy: scannedBy },
  });
  if (count === 0) {
    // Fetch and return DUPLICATE outcome
  }
  ```

---

### 4.4 [MEDIUM] DATA-04: Missing Capacity Guard & Quota Asymmetry in `forceConfirmBooking`

- **Location**: `apps/api/src/modules/admin/service.ts` (lines 551–556)
- **Severity**: **Medium**
- **Mechanics**:
  When an admin force-confirms a booking:
  1. If the booking was `PENDING`, `forceConfirmBooking` increments `soldCount`, but **fails to decrement** `reservedCount`, permanently inflating total committed quota.
  2. If the booking was `EXPIRED` or `CANCELLED`, it does not check whether `soldCount + quantity <= capacity`, allowing admins to inadvertently oversell ticket tiers.

---

### 4.5 [MEDIUM] DATA-05: Inconsistent QR Token Minting Schemes

- **Location**: `apps/api/src/modules/tickets/service.ts` vs `apps/api/src/modules/admin/service.ts`
- **Discrepancy**:
  - `tickets/service.ts` (`mintTickets`) generates:
    `ARG:${booking.id}:${i + 1}:${Date.now()}.${hmacHex}`
  - `admin/service.ts` (`forceConfirmBooking`) generates:
    `${ticketId}:${hmacHex}`
  - `checkin/service.ts` expects tokens that conform to `verifyQrToken(qrToken, ...)`. When tickets minted via administrative override are scanned, token parsing algorithms that rely on the `ARG:...` delimiter will fail.

---

## 5. Performance, Resilience & Scalability Audit

### 5.1 [HIGH] PERF-01: In-Memory OOM Hazard in Platform Overview Metrics

- **Location**: `apps/api/src/modules/admin/service.ts` (lines 72–99)
- **Severity**: **High**
- **Mechanics**:
  ```typescript
  const paidBookings = await prisma.booking.findMany({
    where: { status: 'PAID' },
    select: {
      quantity: true,
      tier: { select: { price: true } },
    },
  });

  const grossRevenue = (paidBookings || []).reduce((sum, b) => {
    return sum + Number(b?.tier?.price ?? 0) * (b?.quantity ?? 0);
  }, 0);
  ```
- **Impact**:
  Every time an admin loads `/admin` or refreshes the platform dashboard, the backend performs a full table scan and loads **all historical paid bookings** into the Node.js V8 heap memory. On an active platform with 50,000+ bookings, this query will cause severe event-loop blockage, heap exhaustion (JavaScript heap out of memory), and process crashes.
- **Required Remediation**:
  Compute revenue in the database via PostgreSQL aggregation:
  ```typescript
  const result = await prisma.$queryRaw<[{ grossRevenue: number }]>`
    SELECT COALESCE(SUM(b.quantity * t.price), 0)::float AS "grossRevenue"
    FROM "Booking" b
    JOIN "TicketTier" t ON b."tierId" = t.id
    WHERE b.status = 'PAID'
  `;
  ```

---

### 5.2 [HIGH] PERF-02: Hard Single Point of Failure (SPOF) on Redis in Authentication Hook

- **Location**: `apps/api/src/plugins/jwt.ts` (lines 44–53) & `apps/api/src/modules/auth/service.ts` (lines 149–171)
- **Severity**: **High**
- **Mechanics**:
  ```typescript
  // jwt.ts
  if (accessToken && await isAccessTokenRevoked(app, accessToken)) { ... }
  if (userId && await isUserRevoked(app, userId)) { ... }

  // auth/service.ts
  export async function isAccessTokenRevoked(app: FastifyInstance, accessToken: string): Promise<boolean> {
    return (await app.redis.exists(accessTokenKey(accessToken))) === 1;
  }
  ```
  `app.redis.exists()` is executed synchronously on every single authenticated request. If Redis restarts, experiences a network blip, or reaches connection limits, `ioredis` throws `Error: Connection is closed.`
  Because there is no graceful fallback or circuit breaker, the unhandled promise rejection is caught by Fastify and returned as **HTTP 500 Internal Server Error**.
- **Impact**:
  A transient cache outage instantly takes down 100% of the authenticated platform, rendering attendee logins, admin views, and gate scanning non-functional despite PostgreSQL and Node.js being completely healthy.
- **Required Remediation**:
  Wrap Redis revocation lookups in a try-catch block with graceful degradation or a fail-open/circuit-breaker policy.

---

### 5.3 [MEDIUM] PERF-03: In-Memory Distributed Rate Limiting Bypass

- **Location**: `apps/api/src/plugins/rateLimit.ts` (lines 13–14)
- **Severity**: **Medium**
- **Mechanics**:
  ```typescript
  export const rateLimitPlugin = fp(async (app) => {
    await app.register(fastifyRateLimit, {
      max: 100,
      timeWindow: '1 minute',
      // TODO: wire up Redis store for distributed rate limiting
      // redis: app.redis,
    });
  });
  ```
- **Impact**:
  Rate limiting counters are stored in the local Node.js process memory. In serverless functions or multi-instance containers behind a load balancer, each instance maintains an independent counter. An attacker can distribute requests across IP addresses or container instances and bypass login brute-force limits (10/min) and checkout reservation spam guards (5/min).

---

### 5.4 [LOW] PERF-04: Missing UUID Type Casting in Raw SQL Update

- **Location**: `apps/api/src/modules/events/service.ts` (lines 182–186)
- **Severity**: **Low**
- **Mechanics**:
  ```sql
  UPDATE "TicketTier"
  SET "capacity" = ${capacity}, "updatedAt" = NOW()
  WHERE "id" = ${tier.id} AND "soldCount" + "reservedCount" <= ${capacity}
  ```
  In PostgreSQL with Prisma `$executeRaw`, string variables bound to UUID columns can trigger `operator does not exist: uuid = text`. Contrast with `bookings/service.ts` line 37 where `${input.tierId}::uuid` is explicitly cast.

---

## 6. Error Handling & RFC-7807 Compliance Audit

- **Location**: `apps/api/src/plugins/errorHandler.ts`
- **Ground Truth**:
  ```typescript
  export const errorHandlerPlugin = fp(async (app) => {
    app.setErrorHandler(async (error, _request, reply) => {
      // TODO: Map ZodError, Prisma known errors, custom AppError
      const statusCode = error.statusCode ?? 500;
      reply.status(statusCode).send({
        statusCode,
        error: error.name ?? 'Error',
        message: error.message,
      });
    });
  });
  ```
- **Deficiencies**:
  1. **Raw Database Message Leakage**: Unhandled Prisma exceptions (such as `PrismaClientKnownRequestError`) default to `statusCode: 500` with the internal database error message returned in the payload, revealing internal table names, constraint identifiers, and SQL structure.
  2. **Non-Standard RFC-7807 Format**: The payload uses `{ statusCode, error, message }` instead of the RFC-7807 specification (`type`, `title`, `status`, `detail`, `instance`).
  3. **Double Send Crash Risk in `preHandler` Hooks**: In Fastify preHandler hooks (`authorize.ts`), if `reply.send()` is executed without `return reply`, Fastify proceeds to subsequent handlers, triggering `FST_ERR_REP_ALREADY_SENT` which collapses into a 500 error.

---

## 7. Actionable Remediation Roadmap

```mermaid
flowchart TD
    subgraph Phase 1: Critical Security & Integrity (Immediate)
        P1_1["Fix BOLA in /checkin/roster/:eventId (SEC-01)"]
        P1_2["Restrict CORS Wildcard (SEC-02)"]
        P1_3["Wrap mintTickets in Prisma $transaction (DATA-01)"]
        P1_4["Check count in Hold Sweeper Decrement (DATA-02)"]
    end

    subgraph Phase 2: Resilience & Concurrency (Pre-Launch)
        P2_1["Add Try/Catch & Fallback for Redis Revocation (PERF-02)"]
        P2_2["Atomic Check-In Update (DATA-03)"]
        P2_3["Standardize on app.authenticate + app.authorize (SEC-03)"]
        P2_4["Fix Gross Revenue SQL Aggregation (PERF-01)"]
    end

    subgraph Phase 3: Hardening & Compliance (Optimization)
        P3_1["Connect Redis to fastify-rate-limit (PERF-03)"]
        P3_2["Unify QR Token Minting Formats (DATA-05)"]
        P3_3["Implement Centralized RFC-7807 Error Mapper"]
        P3_4["Remove duplicate new PrismaClient() in organizer/service"]
    end

    Phase 1 --> Phase 2 --> Phase 3
```

### Prioritized Action Checklist

- [ ] **1. Remediate SEC-01 (Checkin Roster BOLA)**:
  - Add `if (event.organizerId !== req.user.sub && req.user.role !== 'ADMIN') throw new HttpError(403, 'Forbidden');`
  - Strip `qrToken` from attendee roster exports.
- [ ] **2. Remediate SEC-02 (CORS Wildcard)**:
  - Remove `origin.endsWith('.vercel.app')`. Configure explicit environment origins in `apps/api/.env`.
- [ ] **3. Remediate DATA-01 (Payment Atomicity)**:
  - Embed `mintTickets` inside the `app.prisma.$transaction` block in `payments/service.ts`.
- [ ] **4. Remediate DATA-02 (Hold Reconciliation Race Condition)**:
  - Gate the `reservedCount` decrement behind `if (count > 0)`.
- [ ] **5. Remediate PERF-02 (Redis Single Point of Failure)**:
  - Wrap `isAccessTokenRevoked` and `isUserRevoked` calls in `try/catch` with fail-open or log-and-continue logic when Redis is down.
- [ ] **6. Remediate PERF-01 (OOM in Metrics)**:
  - Replace `booking.findMany` in `getPlatformOverview` with raw SQL aggregation `SUM(b.quantity * t.price)`.
- [ ] **7. Remove Duplicate Prisma Client**:
  - Remove `getPrismaClient()` from `modules/organizer/service.ts` and pass `req.server.prisma` consistently.
