# Specification: Argon Admin System & Main Branch Full Alignment

**Document ID**: SPEC-ARGON-ALIGN-001  
**Target Branches**: `main` (upstream `3a4f0e8`) & `monirath/development` (`dd27e8f`)  
**Worktree**: `.worktree`  
**Date**: 2026-11-01  
**Status**: APPROVED  

---

## 1. Problem Statement & Context

The Argon monorepo recently merged PR #4 (`feat/booking-qr-ticketing`) and PR #5 (`Authentication`) into `main`, introducing:
1. Real user registration and login (`/api/v1/auth/*`) with bcrypt password hashing, JWT signing, and Redis-backed revocation.
2. Complete customer flows (Event Catalog, Checkout, Mock Payment, My Tickets, and QR Pass).
3. A mobile QR scanner (`ScannerPage.tsx`) running against a client-side localStorage simulation (`ticketingStore.ts`).
4. Basic Fastify check-in endpoints (`/api/v1/checkin/scan`, `/roster/:eventId`) with authentication but **without role-based authorization**.

Concurrently, the `monirath/development` branch in `.worktree` completed the Admin & Organizer subsystem:
1. Fastify RBAC authorization plugin (`authorize.ts`) and realistic multi-tenant Prisma seed.
2. Multi-tenant Organizer metrics, tier quotas, and attendee endpoints with 75 passing Vitest tests.
3. Super-Admin platform governance (user role elevation, transaction force-confirm/refund, audit log inspection).
4. Responsive React admin backoffice suite with `AdminLayout`, `Sidebar`, and feature views.

**The Gap**:
1. Merging `main` into `monirath/development` generates 7 merge conflicts (`jwt.ts`, `App.tsx`, `Header.tsx`, `useAuth.ts`, `api.ts`, `auth.ts`, `routes.tsx`).
2. The admin web views currently use an unsigned dev mock JWT (`dev_mock_signature`), triggering 401 Unauthorized against the Fastify backend and falling back to synthetic mock data.
3. Two backend listing endpoints are missing: `GET /api/v1/admin/bookings` (causing `TransactionOverridesView` to show 4 static mock rows) and `GET /api/v1/organizer/events` (causing `OrganizerDashboardView` to use dummy UUIDs).
4. Admin force-confirm overrides generate raw UUID tokens instead of HMAC-signed QR passes.
5. Fastify check-in endpoints in `main` permit any authenticated customer to scan tickets.

---

## 2. Architectural Decisions & Consensus Contracts

### 2.1 Branch & Worktree Reconciliation
- **Decision**: Perform a 3-way git merge of `main` into `monirath/development` inside `.worktree`.
- **Target**: Maintain all 10 prior commit histories and test fixtures; resolve all 7 conflicts in place; isolate feature work within `.worktree`.

### 2.2 Authentication & Dev Ergonomics
- **Backend**: Strict JWT authentication with Redis session checking.
- **Frontend**: Standardize on `main`'s real Axios client (`apps/web/src/lib/api.ts`) and `useAuth` hook.
- **Dev Speed**: On `LoginPage.tsx`, render quick-login identity buttons (`Platform Admin`, `BarCamp Organizer`, `TEDx Organizer`, `Customer`) that execute real POST requests to `/api/v1/auth/login` using seeded fixtures (`password123`).

### 2.3 Backend Endpoints & Integrity
- **Endpoint 1**: `GET /api/v1/admin/bookings`
  - Query params: `status?: BookingStatus`, `search?: string`, `limit?: number`, `offset?: number`.
  - Guard: `[app.authenticate, app.authorize([Role.ADMIN])]`.
- **Endpoint 2**: `GET /api/v1/organizer/events`
  - Returns: Array of events where `organizerId === request.user.sub` (or all events if caller is `ADMIN`).
  - Guard: `[app.authenticate, app.authorize([Role.ORGANIZER, Role.ADMIN])]`.
- **HMAC QR Signing**:
  - `forceConfirmBooking` service must invoke `generateHmacSignature(ticket.id, secret)` and set `qrToken: `${ticket.id}:${signature}``.

### 2.4 Check-in & Scanner Security
- Protect `/api/v1/checkin/scan` and `/api/v1/checkin/roster/:eventId` with `[app.authenticate, app.authorize([Role.ORGANIZER, Role.ADMIN])]`.
- Rewire `ScannerPage.tsx` to call `POST /api/v1/checkin/scan` via the real API client.

### 2.5 Route Hierarchy & Dual Layouts
- **Route Guard**: Upgrade `apps/web/src/features/auth/ProtectedRoute.tsx` to support `allowedRoles?: Role[]` with a 403 Access Denied screen.
- **Public / Customer**: Use customer `Header` and `Footer`. Add an "Admin / Organizer Console" link in `Header.tsx` when user has elevated privileges.
- **Admin / Organizer**: Wrap `/admin/*` and `/organizer/*` in `AdminLayout` (Header + dynamic Sidebar).
