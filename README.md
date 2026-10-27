# Argon 🎟️

**Cambodian event discovery and QR ticketing platform**

Argon is a monorepo containing four applications:

| App | Path | Runtime | Deploy |
|-----|------|---------|--------|
| **Web** (attendee + organizer portal) | `apps/web` | React + Vite | Vercel |
| **Scanner** (staff gate PWA) | `apps/scanner` | React + Vite PWA | Vercel |
| **API** (backend) | `apps/api` | Fastify + Node.js | Render |
| **Shared** (types, schemas, constants) | `packages/shared` | TypeScript | — |

---

## Prerequisites

- **Node.js** ≥ 20 and **npm** ≥ 10
- **Docker** and **Docker Compose** (for local Postgres + Redis)

---

## Quick Start

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd argon
npm install
```

### 2. Start local infrastructure

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL 16** on port `5432` (`argon_dev` database)
- **Redis 7** on port `6379`

### 3. Configure environment variables

Copy each `.env.example` to `.env` and fill in real values:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/scanner/.env.example apps/scanner/.env
```

> ⚠️ **Never commit `.env` files.** They are listed in `.gitignore`.

### 4. Run database migrations

```bash
cd apps/api
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed   # optional seed data
```

### 5. Start all apps in development

From the **monorepo root**:

```bash
npm run dev
```

Or start individually:

```bash
npm run dev --workspace=apps/web       # http://localhost:5173
npm run dev --workspace=apps/scanner   # http://localhost:5174
npm run dev --workspace=apps/api       # http://localhost:3000
```

---

## Folder Overview

```
argon/
├── apps/
│   ├── api/          # Fastify REST API
│   ├── scanner/      # Gate-scanner PWA
│   └── web/          # Attendee & organiser portal
├── packages/
│   └── shared/       # Shared Zod schemas, enums, constants
├── docs/             # Architecture, API, and decision docs
├── .github/
│   └── workflows/    # CI pipeline (lint, typecheck, test, build)
├── docker-compose.yml
└── package.json      # npm workspaces root
```

---

## Common Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all apps in watch mode |
| `npm run build` | Production build across all workspaces |
| `npm run lint` | ESLint across all workspaces |
| `npm run typecheck` | TypeScript type-check across all workspaces |
| `npm run test` | Run tests across all workspaces |
| `npm run format` | Prettier format entire repo |

### API-specific commands (run from `apps/api`)

| Command | Description |
|---------|-------------|
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run prisma:migrate` | Apply pending migrations |
| `npm run prisma:seed` | Seed the database with sample data |

---

## Architecture

See [`docs/architecture.md`](./docs/architecture.md) for system design.

---

## Contributing

- Branch naming: `feat/<topic>`, `fix/<topic>`, `chore/<topic>`
- Commit style: [Conventional Commits](https://www.conventionalcommits.org/)
- All PRs trigger the CI workflow (lint → typecheck → test → build)
