# Argon Production Deployment Guide

Comprehensive guide for deploying the **Argon Event Discovery & QR Ticketing Platform** across **Vercel (Serverless)** or **Render / Containers (Persistent)**, backed by **Neon / Supabase PostgreSQL** and **Upstash Redis**.

---

## 1. System Architecture & Topology

Argon is structured as an npm workspaces monorepo:

```
Argon-Web/
├── apps/
│   ├── api/          # Fastify REST API (Node.js 20+ ESM, Prisma 5, Redis)
│   ├── web/          # Attendee / Organizer Web Portal (Vite + React SPA, Tailwind)
│   └── scanner/      # Gate Attendant PWA (Vite + React PWA, BarcodeDetector / ZXing)
├── packages/
│   └── shared/       # Shared TypeScript types, Zod validation schemas & enums
└── docker-compose.yml # Local development database & cache infrastructure
```

### Component Deployment Matrix

| Component | Directory | Artifact / Output | Deployment Target | Runtime Role |
| :--- | :--- | :--- | :--- | :--- |
| **Backend REST API** | `apps/api` | Fastify App / Serverless Handler | **Vercel** *(Serverless)* OR **Render/VPS** *(Container)* | Node.js 20+ ESM |
| **Public & Admin Web** | `apps/web` | Static Single Page Application (`dist`) | **Vercel** / Static CDN | Static Hosting + SPA Rewrites |
| **Gate Scanner PWA** | `apps/scanner` | Progressive Web App (`dist`) | **Vercel** / Static CDN | Static Hosting + SPA Rewrites |
| **Relational Database** | External | PostgreSQL 16 with Connection Pooling | **Neon.tech** or **Supabase** | Managed PostgreSQL |
| **Cache & Revocation** | External | Redis 7 (In-memory KV with TLS) | **Upstash** or Managed Redis | TLS-enabled Redis (`rediss://`) |

---

## 2. Server Runtime Architecture & Hosting Modes

The backend supports two distinct runtime environments:

### Mode A: Serverless Functions (Vercel)
- **Entry point**: `apps/api/api/index.js` importing `apps/api/dist/app.js`.
- **Execution model**: Ephemeral, on-demand AWS Lambda / Vercel execution. Request lifecycle terminates or freezes upon reply.
- **Connection handling**: Prisma and Redis connections are cached in-memory across warm function invocations (`vercelApp ??= buildApp()`).
- **Hold sweeper limitation**: The `setInterval` background reconciliation sweeper in `server.ts` **does not run** in serverless functions. Expired holds must be cleared via scheduled Vercel Cron jobs or on-demand sweeps.

### Mode B: Persistent Container / Long-Running Process (Render / Railway / Fly.io / VPS)
- **Entry point**: `apps/api/dist/server.ts` (`npm run start:prod`).
- **Execution model**: Persistent Node.js 20 process listening on `0.0.0.0:${PORT}`.
- **Background jobs**: Runs native 60-second background sweeper (`runHoldReconciliation`) to release expired ticket holds.
- **Connection handling**: Long-lived connection pooling to PostgreSQL and Redis.

---

## 3. Comprehensive Environment Variables Reference

Configure these variables in your hosting provider's dashboard for each project.

### Backend API (`apps/api`)

| Variable | Required | Recommended Production Value / Format | Purpose |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | **Yes** | `production` | Enables production optimizations and disables debug traces. |
| `PORT` | No | `3000` *(Render sets this automatically)* | Port for persistent server listener. |
| `DATABASE_URL` | **Yes** | `postgresql://user:pass@ep-host.neon.tech/argon?sslmode=require` | **Pooled** PostgreSQL connection string (e.g. Neon `-pooler` or Supabase PgBouncer port `6543`). |
| `DIRECT_URL` | No | `postgresql://user:pass@ep-host.neon.tech/argon?sslmode=require` | Direct (non-pooled) DB connection for running migrations. |
| `REDIS_URL` | **Yes** | `rediss://default:token@host.upstash.io:6379` | TLS Redis URL for token revocation, session validation, and holds. |
| `JWT_SECRET` | **Yes** | 32+ character hex or base64 string (`openssl rand -hex 32`) | Signs attendee and admin authentication tokens. |
| `JWT_EXPIRES_IN` | No | `15m` | Lifetime of short-lived access tokens. |
| `QR_SIGNING_SECRET`| **Yes**| 32+ character hex string (`openssl rand -hex 32`) | Secret for HMAC-SHA256 offline-verifiable QR gate passes. |
| `QR_HMAC_SECRET` | No | Same as `QR_SIGNING_SECRET` | Backward-compatibility alias. |
| `CLIENT_URL` | **Yes** | `https://argon-web.vercel.app` | Whitelisted origin for web CORS requests. |
| `SCANNER_URL` | **Yes** | `https://argon-scanner.vercel.app` | Whitelisted origin for scanner CORS requests. |
| `PAYMENT_GATEWAY_BASE_URL` | **Yes** | `https://api.payment-gateway.example.com` | Upstream payment processor URL. |
| `PAYMENT_WEBHOOK_SECRET` | **Yes** | 32+ character random secret string | Verifies HMAC signatures on inbound payment callbacks (`/payments/webhook`). |
| `PAYMENT_GATEWAY_SECRET` | No | Gateway API merchant key | Communicates with the payment gateway client. |

> [!CAUTION]
> Never put `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, or `QR_SIGNING_SECRET` in frontend (`apps/web` or `apps/scanner`) environment settings. Frontend bundles are public.

### Frontend Web Portal (`apps/web`)

| Variable | Required | Value | Notes |
| :--- | :---: | :--- | :--- |
| `VITE_API_BASE_URL` | **Yes** | `https://your-api.vercel.app` *(or Render API URL)* | Base REST API URL **without** trailing slash. |
| `VITE_APP_NAME` | No | `Argon` | Display branding across pages and tab titles. |

### Mobile Scanner PWA (`apps/scanner`)

| Variable | Required | Value | Notes |
| :--- | :---: | :--- | :--- |
| `VITE_API_BASE_URL` | **Yes** | `https://your-api.vercel.app` *(or Render API URL)* | Target backend for ticket scans and roster sync. |
| `VITE_APP_NAME` | No | `Argon Scanner` | PWA title. |

---

## 4. Deployment Option A: Deploying Backend to Vercel (Serverless)

### Step 1: Create Vercel Project for API
1. In the Vercel Dashboard, select **Add New…** → **Project**.
2. Select the **`Argon-Web`** repository.
3. Configure project settings:
   - **Project Name**: `argon-api`
   - **Framework Preset**: **Other**
   - **Root Directory**: **`apps/api`**
   - **Include files outside the Root Directory in the Build Step**: **CHECKED / ENABLED** *(Mandatory for resolving `@argon/shared`)*
   - **Build Command**:
     ```bash
     cd ../.. && npm run build --workspace=@argon/shared && cd apps/api && npm run prisma:generate && npm run build
     ```
   - **Output Directory**: Leave empty
   - **Install Command**: `npm install`

### Step 2: Configure Vercel API Environment Variables
Under **Project Settings → Environment Variables**, add:
- `NODE_ENV=production`
- `DATABASE_URL`: Your pooled database URL (`sslmode=require`)
- `REDIS_URL`: Your Upstash Redis URL (`rediss://...`)
- `JWT_SECRET`: Random 32+ char secret
- `QR_SIGNING_SECRET`: Random 32+ char secret
- `CLIENT_URL`: `https://argon-web.vercel.app` *(or temp URL, update after frontend deploy)*
- `SCANNER_URL`: `https://argon-scanner.vercel.app`
- `PAYMENT_WEBHOOK_SECRET`: Secure webhook secret

### Step 3: Run Initial Database Migrations & Seeds
From your local terminal, apply the database schema directly to your production PostgreSQL database:
```bash
# 1. Apply all pending Prisma migrations
DATABASE_URL="your-production-pooled-db-url" npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma

# 2. (Optional) Seed clean baseline admin, organizers, and sample events
DATABASE_URL="your-production-pooled-db-url" npx tsx apps/api/prisma/seed.ts
```

Baseline accounts generated:
- **Admin**: `admin@argon.kh` / `password123`
- **Organizer**: `barcamp@argon.kh` / `password123`
- **Organizer**: `tedx@argon.kh` / `password123`

---

## 5. Deployment Option B: Deploying Backend to Render / Docker (Persistent)

For automatic hold reconciliation and long-lived connection pools, deploying as a container or Web Service is recommended.

### Step 1: Render Web Service Configuration
1. In Render, select **New +** → **Blueprint** (or **Web Service**).
2. The repository includes [apps/api/render.yaml](file:///D:/year%203/Term1/Project%20manager/Project/Product/Argon-Web/apps/api/render.yaml):
   - **Environment**: Node 20
   - **Build Command**: `npm install && npm run build --workspace=@argon/shared && npm run prisma:generate --workspace=apps/api && npm run build --workspace=apps/api`
   - **Start Command**: `npm run start:prod --workspace=apps/api`
   - **Health Check Path**: `/health`
3. Add environment variables (`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `QR_SIGNING_SECRET`, etc.).

---

## 6. Deploying the Frontends (Web & Scanner) to Vercel

### Part 1: Deploy Web Portal (`apps/web`)
1. Create a new Vercel Project from the `Argon-Web` repository.
2. Settings:
   - **Project Name**: `argon-web`
   - **Framework Preset**: **Vite**
   - **Root Directory**: **`apps/web`**
   - **Include files outside the Root Directory in the Build Step**: **CHECKED / ENABLED**
   - **Build Command**:
     ```bash
     cd ../.. && npm run build --workspace=@argon/shared && cd apps/web && npm run build
     ```
   - **Output Directory**: `dist`
3. Environment Variables:
   - `VITE_API_BASE_URL`: `https://argon-api.vercel.app` *(your deployed API domain)*
   - `VITE_APP_NAME`: `Argon`
4. Click **Deploy**.

### Part 2: Deploy Gate Scanner PWA (`apps/scanner`)
1. Create a new Vercel Project from the `Argon-Web` repository.
2. Settings:
   - **Project Name**: `argon-scanner`
   - **Framework Preset**: **Vite**
   - **Root Directory**: **`apps/scanner`**
   - **Include files outside the Root Directory in the Build Step**: **CHECKED / ENABLED**
   - **Build Command**:
     ```bash
     cd ../.. && npm run build --workspace=@argon/shared && cd apps/scanner && npm run build
     ```
   - **Output Directory**: `dist`
3. Environment Variables:
   - `VITE_API_BASE_URL`: `https://argon-api.vercel.app`
   - `VITE_APP_NAME`: `Argon Scanner`
4. Click **Deploy**.

---

## 7. Post-Deployment Verification & Smoke Tests

Execute these verification checks in order:

### 1. API Health & Version
```bash
curl -i https://your-api.vercel.app/health
```
**Expected Response:** `HTTP/1.1 200 OK`, `{"status":"ok","version":"0.1.0"}`

### 2. Public Events Feed
```bash
curl -i https://your-api.vercel.app/events
```
**Expected Response:** `HTTP/1.1 200 OK`, JSON array with published events.

### 3. Database & Redis Telemetry Check (Admin Only)
1. Log in via `https://your-web.vercel.app/login` with `admin@argon.kh` / `password123`.
2. Inspect the Admin Dashboard at `/admin`.
3. Check the **System Health** panel (`/api/v1/admin/system/health`):
   - Database Status: `HEALTHY`
   - Redis Status: `HEALTHY` (verifies TLS connection to Upstash)

### 4. Direct Refresh (SPA Routing)
Navigate to `https://your-web.vercel.app/admin/users` and refresh the page (F5). It must re-render without a Vercel 404 error.

---

## 8. Common Troubleshooting & Runbook

| Symptom | Root Cause | Remediation |
| :--- | :--- | :--- |
| **`Error [ERR_MODULE_NOT_FOUND]`** in API function logs | Relative import missing `.js` file extension in ESM runtime | Ensure all relative imports in `apps/api/src/**/*.ts` use `.js` extensions (e.g. `import from './service.js'`). Compile with `npm run build:api` to verify. |
| **"Can't reach the server. Check your connection..."** in frontend | `VITE_API_BASE_URL` is unset or points to `localhost` | Update `VITE_API_BASE_URL` in frontend project settings on Vercel to your live HTTPS API domain and trigger a redeploy. |
| **CORS policy error in browser console** | Calling domain not in `CLIENT_URL` / `SCANNER_URL` | Add your frontend domains to `CLIENT_URL` and `SCANNER_URL` in `argon-api` environment variables. Note: `*.vercel.app` is whitelisted by default in `cors.ts`. |
| **Prisma `P1001` Can't reach database server** | Missing `sslmode=require` or using non-pooled connection | Use the connection pooler URL provided by Neon or Supabase with `?sslmode=require`. Ensure outbound IP is allowed. |
| **`Redis connection: Connection is closed`** | Missing TLS or invalid Upstash connection string | Ensure `REDIS_URL` begins with `rediss://` (with double 's' for TLS) on hosted Upstash instances. |
| **Vercel Build fails: Cannot find module `@argon/shared`** | "Include files outside root" unchecked | In Vercel Project Settings → General → Root Directory, ensure the checkbox **"Include files outside the Root Directory in the Build Step"** is checked. |
| **Pending bookings not expiring on Vercel** | Background `setInterval` does not run in serverless | Trigger hold sweeper via scheduled webhook or deploy API on a persistent runner (Render/Docker) where `server.ts` runs the 60s sweeper. |
