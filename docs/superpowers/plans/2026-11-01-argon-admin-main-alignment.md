# Argon Admin System & Main Branch Full Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconcile and integrate the Admin and Organizer backoffice subsystem in `.worktree` with the recently merged customer authentication, booking, and ticketing flows in `main`.

**Architecture:** Perform a 3-way git merge in `.worktree` and resolve the 7 conflicting files. Standardize on the production Axios auth client with Redis session verification while providing a one-click dev profile login switcher. Implement missing backend listing endpoints (`GET /api/v1/admin/bookings`, `GET /api/v1/organizer/events`, and HMAC QR signing), role-gate the check-in routes, wire `ScannerPage` to the real Fastify API, and consolidate customer and administrative portals under an upgraded role-gated routing hierarchy.

**Tech Stack:** Fastify, TypeScript, Prisma (PostgreSQL), Redis, React 18, React Router v6, Tailwind CSS, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-01-argon-admin-main-alignment-spec.md`

## Global Constraints

- Must execute entirely inside `.worktree` on branch `monirath/development`.
- All Fastify endpoints must enforce RFC-7807 problem details error format (`{ statusCode, error, message }`).
- Zero mock JWT signatures (`dev_mock_signature`) in production or dev code paths; all JWTs must be signed and verified by `@fastify/jwt`.
- 100% pass rate on all existing Vitest integration tests (75/75 in `.worktree` plus existing tests in `main`).
- Zero secrets or hardcoded passwords in committed source files.

## Review Focus

1. **Horizontal Multi-Tenant Isolation**: An organizer must not be able to list, inspect, or manage events belonging to another organizer via `GET /api/v1/organizer/events`.
2. **Scanner Permission Boundary**: An unauthenticated user or user with role `CUSTOMER` calling `POST /api/v1/checkin/scan` must receive HTTP 403 Forbidden.
3. **Admin Override Ticket Usability**: A ticket generated via `POST /api/v1/admin/bookings/:bookingId/force-confirm` must contain a valid HMAC-signed `qrToken` that passes verification in `POST /api/v1/checkin/scan`.
4. **Session Expiry & Token Refresh**: Expired access tokens during admin view navigation must trigger transparent refresh via `/api/v1/auth/refresh` without losing table filter or modal states.
5. **Route Guard Role Degradation**: An authenticated user with role `CUSTOMER` attempting to visit `/admin` or `/organizer` must see a structured 403 Forbidden Access Denied screen instead of a blank screen or unhandled error.

---

### Batch 1: Git Merge Reconciliation & Core Conflict Resolution

#### Task 1: Merge `main` into `monirath/development` and Resolve Core File Conflicts

**Files:**
- Modify: `.worktree/apps/api/src/plugins/jwt.ts`
- Modify: `.worktree/apps/web/src/lib/api.ts`
- Modify: `.worktree/apps/web/src/lib/auth.ts`
- Modify: `.worktree/apps/web/src/hooks/useAuth.ts`
- Modify: `.worktree/apps/web/src/App.tsx`
- Modify: `.worktree/.gitignore`

**Interfaces:**
- Consumes: `main` branch tree (`3a4f0e8`) and `monirath/development` tree (`dd27e8f`).
- Produces: Clean merge commit in `.worktree` with unified JWT typing, Redis revocation check, Axios client, and `useAuth` hook supporting both session management and role checking.

- [ ] **Step 1: Execute git merge command in worktree**

Run in `.worktree`:
```bash
git merge main
```
Expected: Merge conflict output on 7 files.

- [ ] **Step 2: Resolve `apps/api/src/plugins/jwt.ts`**

Combine the Redis-backed token revocation check from `main` with the FastifyInstance declaration augmentation (`app.authorize`) from `monirath/development`.
Run: `npm run typecheck --workspace=@argon/api` inside `.worktree`.
Expected: PASS.

- [ ] **Step 3: Resolve `apps/web/src/lib/api.ts` and `apps/web/src/lib/auth.ts`**

Adopt `main`'s Axios client with authorization interceptors and token refresh logic. Remove the fake `generateMockDevToken` and keep real token storage helpers (`getToken`, `getRefreshToken`, `setSessionTokens`, `clearToken`).

- [ ] **Step 4: Resolve `apps/web/src/hooks/useAuth.ts`**

Preserve `main`'s `login`, `register`, `logout`, and `refreshSession` methods. Add role-helper getters (`role`, `isAdmin`, `isOrganizer`, `isCustomer`) derived directly from `user?.role`.

- [ ] **Step 5: Resolve `apps/web/src/App.tsx` and `.gitignore`**

Ensure `SessionExpiryWatcher`, `AuthProvider`, and layout providers wrap the router outlet cleanly. Add `.worktree/` and `.worktrees/` to `.gitignore`.

- [ ] **Step 6: Verify workspace builds and commit merge**

Run: `npm run typecheck --workspace=@argon/api && npm run typecheck --workspace=@argon/web`
Commit: `git commit -m "chore: merge main into monirath/development and resolve core auth conflicts"`

---

### Parallel Batch 2: Backend Completeness & Role-Gated Check-in

#### Task 2: Implement Admin Booking Overview Endpoint (`GET /api/v1/admin/bookings`)

**Files:**
- Modify: `.worktree/apps/api/src/modules/admin/schema.ts`
- Modify: `.worktree/apps/api/src/modules/admin/service.ts`
- Modify: `.worktree/apps/api/src/modules/admin/controller.ts`
- Modify: `.worktree/apps/api/src/modules/admin/routes.ts`
- Test: `.worktree/apps/api/tests/integration/admin.test.ts`

**Interfaces:**
- Consumes: PrismaClient `prisma.booking.findMany`, `app.authorize([Role.ADMIN])`.
- Produces: `GET /api/v1/admin/bookings` returning `{ bookings: AdminBookingSummary[], total: number }`.

- [ ] **Step 1: Write the failing integration test**

Add test to `tests/integration/admin.test.ts`:
```typescript
it('GET /api/v1/admin/bookings returns paginated bookings with user and tier relations', async () => {
  const token = await generateAdminToken(app);
  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/admin/bookings?status=PENDING&limit=10',
    headers: { authorization: `Bearer ${token}` },
  });
  expect(res.statusCode).toBe(200);
  const body = res.json();
  expect(Array.isArray(body.bookings)).toBe(true);
  expect(typeof body.total).toBe('number');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd .worktree && npm test -- tests/integration/admin.test.ts`
Expected: FAIL with 404 Route Not Found.

- [ ] **Step 3: Implement route, schema, controller, and service**

In `schema.ts`, define `adminBookingsQuerySchema` accepting optional `status`, `search`, `limit` (default 20), `offset` (default 0).
In `service.ts`, implement `listAdminBookings(app, query)` querying `prisma.booking` with `include: { user: true, event: true, tier: true, tickets: true }`.
In `controller.ts` and `routes.ts`, register `GET /bookings` under `/api/v1/admin` with `[app.authenticate, app.authorize([Role.ADMIN])]`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd .worktree && npm test -- tests/integration/admin.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/admin/ apps/api/tests/integration/admin.test.ts
git commit -m "feat(admin): implement paginated booking listing endpoint with status filtering"
```

---

#### Task 3: Implement Organizer Events Endpoint, HMAC Overrides & Check-in Authorization

**Files:**
- Modify: `.worktree/apps/api/src/modules/organizer/routes.ts`
- Modify: `.worktree/apps/api/src/modules/organizer/service.ts`
- Modify: `.worktree/apps/api/src/modules/organizer/controller.ts`
- Modify: `.worktree/apps/api/src/modules/admin/service.ts`
- Modify: `.worktree/apps/api/src/modules/checkin/routes.ts`
- Test: `.worktree/apps/api/tests/integration/organizer.test.ts`
- Test: `.worktree/apps/api/tests/integration/admin-security.test.ts`

**Interfaces:**
- Consumes: `generateHmacSignature` from `apps/api/src/lib/hmac.ts`, `app.authorize([Role.ORGANIZER, Role.ADMIN])`.
- Produces: `GET /organizer/events` endpoint, HMAC-signed override tickets, and role-guarded `/api/v1/checkin/scan` & `/roster`.

- [ ] **Step 1: Write failing tests**

1. Test `GET /organizer/events` only returns events owned by the authenticated organizer.
2. Test `POST /api/v1/checkin/scan` returns 403 Forbidden when called by a `CUSTOMER` role.
3. Test `POST /api/v1/admin/bookings/:bookingId/force-confirm` produces a ticket whose `qrToken` passes `verifyHmacSignature`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd .worktree && npm test -- tests/integration/organizer.test.ts tests/integration/admin-security.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement endpoints and security guards**

1. In `apps/api/src/modules/organizer/service.ts`, implement `listOrganizerEvents(app, organizerId, isAdmin)` returning events with tier capacities and ticket counts.
2. In `apps/api/src/modules/admin/service.ts`, update `forceConfirmBooking` to import `generateHmacSignature` and compute `qrToken: `${ticket.id}:${generateHmacSignature(ticket.id, env.QR_HMAC_SECRET)}``.
3. In `apps/api/src/modules/checkin/routes.ts`, add `app.authorize([Role.ORGANIZER, Role.ADMIN])` to `/scan` and `/roster/:eventId`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd .worktree && npm test -- tests/integration/organizer.test.ts tests/integration/admin-security.test.ts`
Expected: PASS (all tests pass).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/organizer/ apps/api/src/modules/admin/service.ts apps/api/src/modules/checkin/routes.ts apps/api/tests/
git commit -m "feat(api): add organizer events list, hmac qr overrides, and checkin role guards"
```

---

### Parallel Batch 3: Frontend Client Integration & Scanner Real Wiring

#### Task 4: Connect Admin Views to Axios API & Add One-Click Dev Role Switcher to `/login`

**Files:**
- Modify: `.worktree/apps/web/src/features/auth/LoginPage.tsx`
- Modify: `.worktree/apps/web/src/features/admin/AdminDashboardView.tsx`
- Modify: `.worktree/apps/web/src/features/admin/UserManagementView.tsx`
- Modify: `.worktree/apps/web/src/features/admin/TransactionOverridesView.tsx`
- Modify: `.worktree/apps/web/src/features/admin/AuditLogsView.tsx`

**Interfaces:**
- Consumes: `api` from `apps/web/src/lib/api.ts`, `useAuth` hook.
- Produces: Live admin views loading from `/api/v1/admin/*` and `LoginPage` with one-click real auth profile buttons.

- [ ] **Step 1: Enhance `LoginPage.tsx` with Dev Quick-Login Profile Selector**

Add a collapsible or dev section containing quick buttons for:
- Platform Admin (`admin@argon.kh` / `password123`)
- BarCamp Organizer (`barcamp@argon.kh` / `password123`)
- TEDx Organizer (`tedx@argon.kh` / `password123`)
- Customer (`sokha@cadt.edu.kh` / `password123`)
Clicking any button calls `login(email, password)` and redirects to the intended destination or respective dashboard.

- [ ] **Step 2: Update `TransactionOverridesView.tsx` to load from `GET /api/v1/admin/bookings`**

Replace the static mock rows with a live `useEffect` calling `api.get('/admin/bookings?status=PENDING')`. Remove the synthetic catch simulation block.

- [ ] **Step 3: Update `AdminDashboardView.tsx`, `UserManagementView.tsx`, and `AuditLogsView.tsx`**

Ensure all API calls use the unified Axios client `api.get` / `api.patch`. Render clean error alerts instead of falling back to fake metrics on 401/500 errors.

- [ ] **Step 4: Verify typecheck passes**

Run: `npm run typecheck --workspace=@argon/web` inside `.worktree`.
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/auth/LoginPage.tsx apps/web/src/features/admin/
git commit -m "feat(web): wire admin views to live api and add one-click dev login profiles"
```

---

#### Task 5: Connect Organizer Views to Live Events API & Wire ScannerPage to Fastify `/scan`

**Files:**
- Modify: `.worktree/apps/web/src/features/organizer/OrganizerDashboardView.tsx`
- Modify: `.worktree/apps/web/src/features/organizer/TierQuotaView.tsx`
- Modify: `.worktree/apps/web/src/features/organizer/AttendeeRosterView.tsx`
- Modify: `.worktree/apps/web/src/features/organizer/ScannerPage.tsx`

**Interfaces:**
- Consumes: `api` from `apps/web/src/lib/api.ts`, `/api/v1/organizer/*`, `/api/v1/checkin/scan`.
- Produces: Live Organizer Views listing the organizer's actual events and a real-time `ScannerPage` posting scans to the backend.

- [ ] **Step 1: Wire `OrganizerDashboardView.tsx` to `GET /organizer/events`**

Fetch the organizer's actual events dynamically instead of using `KNOWN_EVENTS` with dummy UUIDs. Populate the event selector dropdown from the database.

- [ ] **Step 2: Wire `TierQuotaView.tsx` and `AttendeeRosterView.tsx`**

Allow selecting from the loaded events list so tier adjustments (`PATCH /organizer/events/:id/tiers/:tierId/quota`) and attendee queries execute against valid database IDs.

- [ ] **Step 3: Connect `ScannerPage.tsx` to backend `POST /api/v1/checkin/scan`**

Replace `useTicketingStore().scanTicket` with `api.post<{ success: boolean; message: string; ticket: any }>('/checkin/scan', { qrToken })`.
Display genuine check-in responses, timestamped audit log items, and audio feedback.

- [ ] **Step 4: Verify typecheck passes**

Run: `npm run typecheck --workspace=@argon/web` inside `.worktree`.
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/organizer/
git commit -m "feat(web): wire organizer views and scanner page to live fastify checkin api"
```

---

### Batch 4: Unified Route Tree, Dual Layouts & End-to-End Verification

#### Task 6: Consolidate `routes.tsx`, Upgrade `ProtectedRoute`, and Verify Entire Monorepo

**Files:**
- Modify: `.worktree/apps/web/src/features/auth/ProtectedRoute.tsx`
- Delete: `.worktree/apps/web/src/components/auth/ProtectedRoute.tsx` (consolidated)
- Modify: `.worktree/apps/web/src/components/layout/Header.tsx`
- Modify: `.worktree/apps/web/src/routes.tsx`

**Interfaces:**
- Consumes: All public, customer, organizer, and admin page components.
- Produces: Single unified role-gated route tree with 403 Forbidden view and full test pass.

- [ ] **Step 1: Consolidate `ProtectedRoute.tsx`**

In `apps/web/src/features/auth/ProtectedRoute.tsx`, implement:
- Support for `allowedRoles?: Role[]`.
- If `!user`: redirect to `/login` with `state: { from: location }`.
- If `allowedRoles` does not include `user.role`: render standard 403 Forbidden screen with role indicator and "Return to Home" button.
Delete redundant `apps/web/src/components/auth/ProtectedRoute.tsx`.

- [ ] **Step 2: Add Portal Access Links in Customer `Header.tsx`**

When `user?.role === 'ADMIN'`, display an "Admin Console" badge/link in the navigation bar.
When `user?.role === 'ORGANIZER'`, display an "Organizer Portal" badge/link.

- [ ] **Step 3: Consolidate `apps/web/src/routes.tsx`**

Mount:
1. Public: `/`, `/events`, `/events/:id`, `/login`, `/register`.
2. Customer (requires user): `/checkout/:tierId`, `/checkout/:tierId/payment`, `/tickets`, `/tickets/:id`.
3. Organizer (requires `ORGANIZER` or `ADMIN` under `AdminLayout`): `/organizer`, `/organizer/metrics`, `/organizer/tiers`, `/organizer/attendees`, `/organizer/scanner`.
4. Super-Admin (requires `ADMIN` under `AdminLayout`): `/admin`, `/admin/users`, `/admin/transactions`, `/admin/audit`.
5. Standalone Scanner route: `/scanner` (guarded by `[ORGANIZER, ADMIN]`).

- [ ] **Step 4: Run full monorepo typecheck and test suites**

Run in `.worktree`:
```bash
npm run typecheck
npm test
```
Expected:
- 0 typecheck errors across `@argon/shared`, `@argon/api`, `@argon/scanner`, and `@argon/web`.
- 100% test pass rate across all Vitest suites.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/routes.tsx apps/web/src/features/auth/ apps/web/src/components/
git commit -m "feat(web): finalize unified role-gated routes, dual layout shells, and portal links"
```
