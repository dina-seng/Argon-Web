# Argon Admin System Remediation & Ground-Truth Alignment Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve all ground-truth audit defects (AUDIT-001 through AUDIT-005) across Backend, Database, Frontend, and Verification Suites, ensuring end-to-end connectivity, schema persistence, authentication enforcement, real sales aggregation, pagination, and real database integration tests.

**Architecture:** Fastify Modular Monolith backed by PostgreSQL via Prisma ORM and Redis. All administrative operations execute through authenticated prehandlers enforcing `Role.ADMIN`, wrapped in ACID transactions (`prisma.$transaction`) with tamper-evident audit logs.

**Tech Stack:** TypeScript 5.5, Fastify 4.28, Prisma 5.22, PostgreSQL 16, Vitest 2.1, React 18, Vite 5.4, Tailwind CSS.

**Spec:** `audit-research-report.md` (Findings AUDIT-001 to AUDIT-005)

## Global Constraints

- Zero emojis in terminal output, logs, or commit messages.
- Evidence before assertion: every fix must have an automated test proving it before completion.
- Do not bypass or mock security checks: RBAC and suspension enforcement must execute against real state.
- Conventional Commits: `fix(api):`, `feat(admin):`, `test(api):`.

---

## Review Focus

1. User suspension must reject `/auth/login` with 403 Forbidden and clear error message.
2. Reactivating a user must immediately re-enable login without orphaned state.
3. Sales velocity in `getPlatformOverview` must aggregate real paid bookings grouped by date string (`YYYY-MM-DD`).
4. `getPlatformOverview` catch block must return `dbStatus: 'DOWN'` when database queries fail.
5. `TransactionOverridesView` must handle page changes, status filtering, and search queries coherently without reset bugs.

---

### Parallel Batch 1: Database Schema & Authentication-Layer Suspension Enforcement (AUDIT-001)

#### Task 1: Schema Migration & Suspension Enforcement in Auth & Admin Services

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `apps/api/src/modules/admin/service.ts`
- Modify: `apps/api/src/modules/auth/service.ts`
- Modify: `apps/api/src/plugins/authorize.ts`
- Test: `apps/api/tests/integration/user-suspension.test.ts`

- [ ] **Step 1: Write failing test for user suspension and login blocking**
  Create `apps/api/tests/integration/user-suspension.test.ts` testing:
  1. POST `/api/v1/admin/users/:userId/suspend` sets `isSuspended: true`.
  2. POST `/auth/login` for that user returns 403 Forbidden with `{ message: 'Account has been suspended' }`.
  3. POST `/api/v1/admin/users/:userId/suspend` with `suspend: false` reactivates account.
  4. POST `/auth/login` now succeeds with 200 OK and valid JWT token.

- [ ] **Step 2: Add `isSuspended` column to `schema.prisma`**
  Add `isSuspended Boolean @default(false)` and `@@index([isSuspended])` to `model User`.
  Run `prisma db push` and `prisma generate`.

- [ ] **Step 3: Update `apps/api/src/modules/admin/service.ts`**
  In `toggleUserSuspension`: update `user.isSuspended` in the transaction alongside the `AuditLog`.
  In `getUserDetails`: include `isSuspended` directly from `user.isSuspended`.

- [ ] **Step 4: Update `apps/api/src/modules/auth/service.ts`**
  In `login(email, password)`: check `if (user.isSuspended) throw new HttpError(403, 'Account has been suspended. Please contact support.')`.

- [ ] **Step 5: Run tests and verify**
  Run `npx vitest run tests/integration/user-suspension.test.ts`. Verify 4/4 tests pass.

- [ ] **Step 6: Commit**
  Commit with `fix(api): enforce user suspension in database schema and auth login`.

---

### Parallel Batch 2: Real Database Sales Velocity Aggregation & Telemetry Fallback (AUDIT-002, AUDIT-003)

#### Task 2: Implement Real Sales Velocity & Fix DB Fallback

**Files:**
- Modify: `apps/api/src/modules/admin/service.ts`
- Modify: `apps/api/tests/integration/admin.test.ts`
- Test: `apps/api/tests/integration/admin.test.ts`

- [ ] **Step 1: Write test for dailyVelocity aggregation & DB down fallback**
  Update `apps/api/tests/integration/admin.test.ts` to assert that:
  1. Paid bookings from past 7 days populate `dailyVelocity` with accurate sums.
  2. Database query failure in `getPlatformOverview` reports `dbStatus = 'DOWN'`.

- [ ] **Step 2: Fix database catch block in `getPlatformOverview`**
  In `apps/api/src/modules/admin/service.ts:122`, change `dbStatus = 'HEALTHY'` to `dbStatus = 'DOWN'`.

- [ ] **Step 3: Aggregate real bookings in `getPlatformOverview`**
  Query `prisma.booking.findMany` where `status = 'PAID'` and `createdAt >= 7 days ago`.
  Group into the 7-day date slots, summing `quantity * tier.price` and order counts.

- [ ] **Step 4: Run tests and verify**
  Run `npx vitest run tests/integration/admin.test.ts`. Verify 23/23 tests pass.

- [ ] **Step 5: Commit**
  Commit with `fix(api): aggregate real 7-day sales velocity and fix db telemetry fallback`.

---

### Parallel Batch 3: Transaction Overrides Pagination & Table Polish (AUDIT-005)

#### Task 3: Add Full Pagination Controls to TransactionOverridesView

**Files:**
- Modify: `apps/web/src/features/admin/TransactionOverridesView.tsx`

- [ ] **Step 1: Add pagination state and parameters**
  Add `currentPage`, `totalPages`, `pageSize` state (default 10).
  In `fetchBookings`, pass `page: String(currentPage)` and `limit: String(pageSize)` in `queryParams`.
  Read `res.total` and calculate `totalPages = Math.ceil(res.total / pageSize)`.

- [ ] **Step 2: Render pagination controls in table footer**
  Add pagination footer matching `UserManagementView.tsx` with:
  - "Showing X to Y of Z bookings"
  - Page buttons and Prev/Next navigation with disabled states.
  - Reset `currentPage` to 1 when search or status filter changes.

- [ ] **Step 3: Verify web build**
  Run `npm --prefix apps/web run build` and verify 0 type or lint errors.

- [ ] **Step 4: Commit**
  Commit with `feat(web): add server pagination controls to transaction overrides view`.

---

### Parallel Batch 4: Authoritative Real-Database Integration Test Suite (AUDIT-004)

#### Task 4: Real PostgreSQL End-to-End Test Suite

**Files:**
- Create: `apps/api/tests/integration/admin-real-db.test.ts`

- [ ] **Step 1: Build real database integration test suite**
  Create test suite connecting directly to `app.prisma` without `vi.spyOn`:
  - Seeds test user, organizer, and event.
  - Tests `GET /api/v1/admin/metrics/overview` computing actual DB values.
  - Tests `PATCH /api/v1/admin/users/:id/role` mutating role in PostgreSQL.
  - Tests `POST /api/v1/admin/users/:id/suspend` mutating `isSuspended` in PostgreSQL.
  - Tests `POST /api/v1/admin/bookings/:id/force-confirm` generating HMAC tickets and updating quota.
  - Tests `POST /api/v1/admin/bookings/:id/refund` revoking tickets and reverting quota.
  - Tests `POST /api/v1/admin/tickets/:id/check-in-override` setting `CHECKED_IN` status.

- [ ] **Step 2: Run real database integration test suite**
  Run `npx vitest run tests/integration/admin-real-db.test.ts`. Verify all tests pass.

- [ ] **Step 3: Commit**
  Commit with `test(api): add authoritative real-database integration tests for admin governance`.

---

### Parallel Batch 5: End-to-End Verification & Audit Report Synchronization

#### Task 5: Monorepo Verification & Report Update

**Files:**
- Modify: `audit-research-report.md`

- [ ] **Step 1: Run full test suite across monorepo**
  Run `npm test` across workspaces. Verify all tests pass.

- [ ] **Step 2: Run full build across monorepo**
  Run `npm run build --workspaces`. Verify `@argon/shared`, `@argon/api`, `@argon/scanner`, `@argon/web` build cleanly.

- [ ] **Step 3: Update `audit-research-report.md`**
  Update implementation states from PARTIAL to VERIFIED for all resolved findings.
  Update SARM status checkpoint block to 100% Verified.

- [ ] **Step 4: Commit**
  Commit with `docs: synchronize ground-truth audit report with verified remediation`.
