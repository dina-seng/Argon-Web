# Argon – System Architecture

> **Status:** Placeholder – to be filled in during Sprint 1 design review.

## Overview

Argon is a multi-tier event discovery and QR-ticketing platform for the Cambodian market. It is deployed as a monorepo with four distinct applications.

## Tier Breakdown

| Tier | App | Technology | Deployment |
|------|-----|-----------|------------|
| 1 & 2 | `apps/web` | React + Vite + Tailwind CSS | Vercel |
| 3 | `apps/scanner` | React + Vite PWA | Vercel |
| 4 | `apps/api` | Fastify + Node.js + PostgreSQL 16 + Redis 7 | Render / Neon / Upstash |

## Key Flows

- **Flow A – Reservation:** Capacity check → increment reservedCount → create PENDING Booking → Redis 10-minute hold
- **Flow B – Payment Webhook:** Verify signature → idempotency check → PENDING→PAID → mint HMAC QR tokens
- **Flow C – Gate Scan:** Verify HMAC → row-level lock → ACTIVE→CHECKED_IN (target < 1 s)

## Security

- JWT RBAC (CUSTOMER / ORGANIZER / ADMIN)
- HMAC-SHA256 signed QR tokens – secret never leaves the server
- Rate limiting on checkout and login via Redis
- Webhook signature verification before any DB access

## TODO

- [ ] C4 diagrams (Context, Container, Component)
- [ ] Data-flow diagram for payment webhook
- [ ] Sequence diagram for offline scan sync
