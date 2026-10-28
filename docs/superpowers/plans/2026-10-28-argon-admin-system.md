# Argon Admin System: Comprehensive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a production-grade Full-Stack Hybrid Admin System for Argon, providing real-time event analytics, tier inventory quota controls, emergency booking resolution, user role governance, and immutable audit logs across Fastify backend APIs and a role-gated React dashboard.

**Architecture:** Role-Gated Modular Monolith with Multi-Tenant Row-Level Security in Fastify (`@argon/api`), PostgreSQL 16 via Prisma ORM, and a unified administrative shell with dynamic role navigation in React 18 / Tailwind CSS (`@argon/web`).

**Tech Stack:** TypeScript 5.5, Fastify 4, Prisma 5, Vitest 2, React 18, React Router 6, Tailwind CSS 3.4.

**Spec:** `/Users/sorpheatepy/.gemini/antigravity-cli/brain/9ccc7ee8-eaab-434a-9486-d68988e13608/admin-system-spec.md`

---

## Global Constraints

- Monorepo Isolation: All execution occurs strictly inside `Argon-Web/.worktree` on branch `monirath/development`.
- RBAC Rules: `ADMIN` can access everything; `ORGANIZER` can only access their own events (`organizerId: req.user.id`); `CUSTOMER` is denied on all backoffice routes.
- Error Format: All Fastify error responses must conform to the standard error envelope `{ statusCode: number, error: string, message: string }`.
- Concurrency & Atomicity: All administrative overrides (`force-confirm`, `refund`) must run inside `prisma.$transaction`.
- Zero Secrets in VCS: No credentials hardcoded; rely on environment variables.

---

## Review Focus

1. Horizontal Privilege Escalation: Organizer A attempts to query or pause tiers of Organizer B's event. (Must return 403 Forbidden).
2. Unauthorized Backoffice Access: Customer attempts to call `/api/v1/admin/*` or `/api/v1/organizer/*`. (Must return 403 Forbidden).
3. Over-Allocation Race Condition: Tier quota reduction below already sold count. (Must reject with 400 Bad Request: `Capacity cannot be lower than soldCount`).
4. Force-Confirm Idempotency: Calling `force-confirm` on an already `PAID` booking must not generate duplicate tickets.
5. Incomplete Audit Trail: Administrative actions failing to record actor ID and action payload in `AuditLog`.

---

## Execution Batches & Tasks

### Parallel Batch 1: Security Authorization Middleware & Realistic Seed Data

#### Task 1: Backend RBAC Authorization Plugin
- **Files:**
  - Create: `apps/api/src/plugins/authorize.ts`
  - Modify: `apps/api/src/plugins/jwt.ts`
  - Modify: `apps/api/src/app.ts`
  - Test: `apps/api/tests/unit/authorize.test.ts`
- **Consumes:** Existing `apps/api/src/plugins/jwt.ts` and `Role` enum from Prisma.
- **Produces:** `app.authorize(allowedRoles: Role[])` preHandler decorator enforcing role checks with 403 responses.
- [ ] Write failing unit test in `apps/api/tests/unit/authorize.test.ts` verifying role matching and 403 rejection.
- [ ] Implement `authorizePlugin` in `apps/api/src/plugins/authorize.ts`.
- [ ] Register `authorizePlugin` in `apps/api/src/app.ts`.
- [ ] Verify test suite passes (`npm run test --workspace=@argon/api`).
- [ ] Commit: `feat(api): implement role-based authorization plugin and tests`.

#### Task 2: Realistic Multi-Event Prisma Seed Suite
- **Files:**
  - Modify: `apps/api/prisma/seed.ts`
- **Consumes:** `apps/api/prisma/schema.prisma`.
- **Produces:** Rich database state with 1 Admin, 2 Organizers, 3 Multi-Tier Events (BarCamp PP, CADT Tech Expo, AI Summit), 50+ bookings, check-in records, and audit logs.
- [ ] Update `apps/api/prisma/seed.ts` with hashed passwords (bcrypt), structured event dates, and tier allocations.
- [ ] Include ticket records with deterministic HMAC hashes and check-in timestamps.
- [ ] Add 20+ historical `AuditLog` rows.
- [ ] Verify TypeScript compiles (`npm run typecheck --workspace=@argon/api`).
- [ ] Commit: `chore(api): expand seed script with realistic admin, organizer, and audit fixtures`.

---

### Parallel Batch 2: Backend Organizer & Admin API Modules

#### Task 3: Organizer Event Sales & Tier Quota Module
- **Files:**
  - Modify: `apps/api/src/modules/organizer/schema.ts`
  - Modify: `apps/api/src/modules/organizer/service.ts`
  - Modify: `apps/api/src/modules/organizer/controller.ts`
  - Modify: `apps/api/src/modules/organizer/routes.ts`
  - Test: `apps/api/tests/integration/organizer.test.ts`
- **Consumes:** `apps/api/src/plugins/authorize.ts`, Prisma Client.
- **Produces:**
  - `GET /api/v1/organizer/events/:eventId/metrics` (Capacity, sold count, revenue, check-in percentage).
  - `PATCH /api/v1/organizer/events/:eventId/tiers/:tierId/quota` (Update capacity, pause/resume sales).
  - `GET /api/v1/organizer/events/:eventId/attendees` (Paginated attendee roster).
- [ ] Write failing integration test in `apps/api/tests/integration/organizer.test.ts`.
- [ ] Implement Zod schemas in `schema.ts`.
- [ ] Implement aggregation service methods with tenant isolation in `service.ts`.
- [ ] Implement controllers in `controller.ts` and attach routes in `routes.ts`.
- [ ] Verify tests pass.
- [ ] Commit: `feat(organizer): implement sales metrics, tier quota management, and attendee endpoints`.

#### Task 4: Platform Super-Admin Governance & Incident Overrides Module
- **Files:**
  - Create: `apps/api/src/modules/admin/schema.ts`
  - Create: `apps/api/src/modules/admin/service.ts`
  - Create: `apps/api/src/modules/admin/controller.ts`
  - Create: `apps/api/src/modules/admin/routes.ts`
  - Modify: `apps/api/src/app.ts`
  - Test: `apps/api/tests/integration/admin.test.ts`
- **Consumes:** `apps/api/src/plugins/authorize.ts`, Prisma Client, AuditLog plugin.
- **Produces:**
  - `GET /api/v1/admin/metrics/overview` (Platform-wide GMV, tickets sold, active events).
  - `GET /api/v1/admin/users` (List users with role filter).
  - `PATCH /api/v1/admin/users/:id/role` (Promote/demote user role with audit log).
  - `POST /api/v1/admin/bookings/:id/force-confirm` (Atomic incident override).
  - `POST /api/v1/admin/bookings/:id/refund` (Booking cancellation & ticket revocation).
  - `GET /api/v1/admin/audit` (Paginated system audit logs).
- [ ] Write failing integration test in `apps/api/tests/integration/admin.test.ts`.
- [ ] Implement schemas, service, controller, and routes.
- [ ] Register `adminRoutes` in `apps/api/src/app.ts`.
- [ ] Verify tests pass.
- [ ] Commit: `feat(admin): implement platform governance, booking overrides, and audit log endpoints`.

---

### Parallel Batch 3: Security & Multi-Tenant Integration Suite

#### Task 5: Security Boundary & Concurrency Tests
- **Files:**
  - Create: `apps/api/tests/integration/admin-security.test.ts`
- **Consumes:** All endpoints from Tasks 1, 3, and 4.
- **Produces:** Automated verification proving horizontal isolation and role protection.
- [ ] Write test verifying 401 Unauthorized for unauthenticated callers.
- [ ] Write test verifying 403 Forbidden when `CUSTOMER` or `ORGANIZER` hits `/api/v1/admin/*`.
- [ ] Write test verifying Organizer B receives 403 Forbidden when requesting Organizer A's event metrics.
- [ ] Write test verifying `ADMIN` can access both `/api/v1/admin/*` and any `/api/v1/organizer/*` resource.
- [ ] Run full test suite and confirm 100% pass rate.
- [ ] Commit: `test(api): add multi-tenant rbac and boundary verification suite`.

---

### Parallel Batch 4: Frontend Unified Admin & Organizer Portal

#### Task 6: Administrative Shell, Header & Dynamic Navigation
- **Files:**
  - Modify: `apps/web/src/components/layout/Header.tsx`
  - Modify: `apps/web/src/components/layout/Sidebar.tsx`
  - Create: `apps/web/src/components/layout/AdminLayout.tsx`
  - Create: `apps/web/src/components/auth/ProtectedRoute.tsx`
  - Create: `apps/web/src/lib/api.ts`
- **Consumes:** `@argon/shared`, Tailwind configuration.
- **Produces:** Responsive admin shell with dynamic role sidebar and route guards.
- [ ] Implement typed API fetch client with JWT Bearer token support in `apps/web/src/lib/api.ts`.
- [ ] Build `Header.tsx` with user badge, breadcrumbs, and logout.
- [ ] Build `Sidebar.tsx` with role-aware navigation links.
- [ ] Build `AdminLayout.tsx` wrapping Header, Sidebar, and `<Outlet />`.
- [ ] Build `ProtectedRoute.tsx` redirecting unauthorized roles.
- [ ] Verify typecheck passes (`npm run typecheck --workspace=@argon/web`).
- [ ] Commit: `feat(web): build unified admin layout, dynamic sidebar, and route guards`.

#### Task 7: Organizer Dashboard, Tier Controls & Attendee Views
- **Files:**
  - Create: `apps/web/src/features/organizer/OrganizerDashboardView.tsx`
  - Create: `apps/web/src/features/organizer/TierQuotaView.tsx`
  - Create: `apps/web/src/features/organizer/AttendeeRosterView.tsx`
- **Consumes:** API endpoints from Task 3, `Badge.tsx`, `Button.tsx`, `Card.tsx`.
- **Produces:** Fully functional Organizer portal screens with live metric polling.
- [ ] Implement `OrganizerDashboardView.tsx` with sales cards and check-in gauge.
- [ ] Implement `TierQuotaView.tsx` with capacity editing and pause/resume switches.
- [ ] Implement `AttendeeRosterView.tsx` with search and check-in status filters.
- [ ] Verify typecheck passes.
- [ ] Commit: `feat(web): implement organizer metrics dashboard, tier quota manager, and attendee roster`.

#### Task 8: Platform Super-Admin Governance Views
- **Files:**
  - Create: `apps/web/src/features/admin/AdminDashboardView.tsx`
  - Create: `apps/web/src/features/admin/UserManagementView.tsx`
  - Create: `apps/web/src/features/admin/TransactionOverridesView.tsx`
  - Create: `apps/web/src/features/admin/AuditLogsView.tsx`
  - Modify: `apps/web/src/routes.tsx`
- **Consumes:** API endpoints from Task 4, `Modal.tsx`, `Badge.tsx`, `Button.tsx`.
- **Produces:** Production-grade Super-Admin backoffice views wired to React Router.
- [ ] Implement `AdminDashboardView.tsx` (Global GMV, total events, total organizers).
- [ ] Implement `UserManagementView.tsx` (User list, role elevation modal).
- [ ] Implement `TransactionOverridesView.tsx` (Pending bookings list with force-confirm and refund actions).
- [ ] Implement `AuditLogsView.tsx` (Paginated audit table with expandable metadata).
- [ ] Wire all routes into `apps/web/src/routes.tsx`.
- [ ] Verify full monorepo build and typecheck (`npm run typecheck`, `npm run build`).
- [ ] Commit: `feat(web): implement super-admin views and wire role-gated routes`.
