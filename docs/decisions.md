# Argon – Architecture Decision Records (ADR)

> **Status:** Placeholder – decisions to be recorded here as they are made.

## Template

```markdown
## ADR-XXX: Title

**Date:** YYYY-MM-DD  
**Status:** Proposed | Accepted | Deprecated | Superseded  
**Deciders:** [names]

### Context
Why is this decision needed?

### Decision
What was decided?

### Consequences
What are the trade-offs?
```

---

## ADR-001: Monorepo with npm Workspaces

**Date:** 2026-10-27
**Status:** Accepted

### Context
The project has multiple deployable applications (web portal, scanner PWA, REST API) sharing types and Zod schemas. A monorepo simplifies cross-app type sharing, CI, and versioning without the overhead of a separate package registry.

### Decision
Use npm workspaces (`packages/shared`, `apps/web`, `apps/scanner`, `apps/api`). No Turborepo or Nx at MVP stage.

### Consequences
- Shared types/schemas are always in sync.
- Single `npm install` at root installs all workspaces.
- Build caching is manual at MVP; may add Turborepo later.

---

## ADR-002: HMAC-SHA256 for QR Token Signing

**Date:** 2026-10-27
**Status:** Accepted

### Context
QR codes must be unforgeable and verifiable offline (against a local roster) without exposing a database connection.

### Decision
Sign QR token payloads with HMAC-SHA256 using a server-side secret (`QR_SIGNING_SECRET`). The secret never leaves the API server.

### Consequences
- Gate scanner validates signatures against the local roster; no network needed.
- Compromised secret requires rotating all active tickets.

---

## ADR-003: No Direct Bakong / NBC Integration at MVP

**Date:** 2026-10-27
**Status:** Accepted

### Context
Direct Bakong API integration requires NBC licensing and a lengthy approval process.

### Decision
Use a standard digital payment gateway with local bank QR support for MVP. Revisit Bakong direct integration post-launch.

### Consequences
- Faster time-to-market.
- Payment gateway fees apply.
- Bakong integration deferred to a later milestone.
