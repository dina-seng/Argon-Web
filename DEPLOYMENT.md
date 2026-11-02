# Argon Vercel Deployment Guide

Complete step-by-step instructions for deploying both the **Argon Frontend (`apps/web`)** and **Argon Backend API (`apps/api`)** to **Vercel**, with PostgreSQL hosted on Neon or Supabase and Redis hosted on Upstash.

---

## 1. System Architecture

| Component | Directory | Type | Vercel Role | Runtime / Output |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Web Portal** | `apps/web` | Vite + React SPA | Static Site with SPA Rewrites | `dist` |
| **Backend REST API** | `apps/api` | Fastify REST API | Serverless Function | Node.js (`/api` handler) |
| **Gate Scanner PWA** | `apps/scanner` | Vite + React PWA | Static Site with SPA Rewrites | `dist` |
| **Database** | External | PostgreSQL 16 | External Hosted DB | Neon or Supabase |
| **Cache & Revocation**| External | Redis 7 | External Hosted Redis | Upstash or Managed Redis |

---

## 2. Prerequisites

1. A [Vercel Account](https://vercel.com).
2. The GitHub repository with permissions to import `Argon-Web`.
3. A hosted **PostgreSQL** database (e.g., [Neon.tech](https://neon.tech) or [Supabase](https://supabase.com)).
4. A hosted **Redis** database (e.g., [Upstash](https://upstash.com)).

---

## 3. Part 1: Deploy Backend API (`apps/api`)

Because the frontend depends on the API URL, **deploy the API first**.

### Step 1: Import Project in Vercel
1. In Vercel, click **Add New…** → **Project**.
2. Select the **`Argon-Web`** repository.
3. Configure the **Project Settings**:

| Setting | Value | Why |
| :--- | :--- | :--- |
| **Project Name** | `argon-api` *(or your choice)* | Distinguishes backend project |
| **Framework Preset** | **Other** | Fastify runs as a Node.js serverless function |
| **Root Directory** | **`.`** *(Repository Root)* | Required to resolve `@argon/shared` workspace |
| **Build Command** | `npm run build:api` | Builds `@argon/shared`, generates Prisma, compiles `apps/api/dist` |
| **Output Directory** | Leave empty | Serverless function uses `apps/api/api/index.js` |
| **Install Command** | `npm install` | Installs root monorepo dependencies |

> **How Vercel Routes API Requests:**
> The repository includes `apps/api/vercel.json` and `apps/api/api/index.js`. Vercel directs all incoming paths `/(.*)` into Fastify's request router.

### Step 2: Configure API Environment Variables

In **Settings → Environment Variables**, add:

| Variable | Recommended / Example Value | Notes |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production optimizations |
| `DATABASE_URL` | `postgresql://user:pass@ep-host.neon.tech/argon?sslmode=require` | Use pooled connection URL |
| `REDIS_URL` | `rediss://default:token@host.upstash.io:6379` | TLS Redis URL for token revocation |
| `JWT_SECRET` | *(32+ character random string)* | E.g., `openssl rand -hex 32` |
| `JWT_EXPIRES_IN`| `15m` | Token expiry duration |
| `QR_SIGNING_SECRET`| *(32+ character random string)* | Secret for HMAC gate QR tickets |
| `QR_HMAC_SECRET` | *(Same value as `QR_SIGNING_SECRET`)* | Fallback alias |
| `CLIENT_URL` | `https://argon-web.vercel.app` *(update once frontend is deployed)* | CORS whitelist for web |
| `SCANNER_URL` | `https://argon-scanner.vercel.app` *(update once scanner is deployed)* | CORS whitelist for scanner |
| `PAYMENT_GATEWAY_BASE_URL` | `https://sandbox.payment-gateway.example.com` | Sandbox or live payment gateway |
| `PAYMENT_WEBHOOK_SECRET` | *(32+ character random string)* | Webhook verification key |

### Step 3: Deploy & Run Database Migrations
1. Click **Deploy**.
2. Copy your assigned API domain (e.g., `https://argon-api.vercel.app`).
3. Run the database migration from your local terminal with production credentials:
   ```bash
   npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
   ```
4. *(Optional)* Seed baseline admin and test events:
   ```bash
   npx tsx apps/api/prisma/seed.ts
   ```

---

## 4. Part 2: Deploy Frontend Web Portal (`apps/web`)

### Step 1: Import Project in Vercel
1. In Vercel, click **Add New…** → **Project**.
2. Select the **`Argon-Web`** repository again.
3. Configure the **Project Settings**:

| Setting | Value | Why |
| :--- | :--- | :--- |
| **Project Name** | `argon-web` *(or your choice)* | Main frontend domain |
| **Framework Preset** | **Vite** | Auto-configures Vite static build |
| **Root Directory** | Click **Edit** → select `apps/web` | Points to web application folder |
| **Include files outside root** | **Checked / Enabled** | **Crucial:** allows access to `packages/shared` |
| **Build Command** | `cd ../.. && npm run build --workspace=@argon/shared && cd apps/web && npm run build` | Builds shared types before bundling web |
| **Output Directory** | `dist` | Default Vite build directory |
| **Install Command** | `npm install` | Monorepo dependency resolution |

### Step 2: Configure Web Environment Variables

In **Settings → Environment Variables**, add:

| Variable | Value | Notes |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `https://argon-api.vercel.app` | **Must point to your deployed Vercel API** (No trailing slash) |
| `VITE_APP_NAME` | `Argon` | Display name in web app |

> **SPA Route Handling:**
> `apps/web/vercel.json` is pre-configured with `{"rewrites": [{"source": "/(.*)", "destination": "/index.html"}]}` so deep links like `/admin`, `/organizer`, and `/events/:id` reload without 404 errors.

### Step 3: Deploy Frontend
Click **Deploy**. Copy your production web URL (e.g., `https://argon-web.vercel.app`).

---

## 5. Part 3: Deploy Mobile Scanner PWA (`apps/scanner`)

### Step 1: Project Settings

| Setting | Value |
| :--- | :--- |
| **Project Name** | `argon-scanner` |
| **Framework Preset** | `Vite` |
| **Root Directory** | `apps/scanner` |
| **Include files outside root** | **Checked / Enabled** |
| **Build Command** | `cd ../.. && npm run build --workspace=@argon/shared && cd apps/scanner && npm run build` |
| **Output Directory** | `dist` |

### Step 2: Environment Variables

| Variable | Value |
| :--- | :--- |
| `VITE_API_BASE_URL` | `https://argon-api.vercel.app` |
| `VITE_APP_NAME` | `Argon Scanner` |

---

## 6. Part 4: Sync CORS Whitelist

Once both frontends are deployed:
1. Open the **`argon-api`** project in Vercel.
2. Go to **Settings → Environment Variables**.
3. Update `CLIENT_URL` to your live web domain:
   ```dotenv
   CLIENT_URL=https://argon-web.vercel.app
   ```
4. Update `SCANNER_URL` to your live scanner domain:
   ```dotenv
   SCANNER_URL=https://argon-scanner.vercel.app
   ```
5. Trigger a quick redeploy on the API project (**Deployments → Redeploy**) so the CORS rules take effect.

---

## 7. Post-Deployment Verification Checklist

Verify your deployed system using this order:

- [ ] **API Health Check**:
  Visit `https://your-api.vercel.app/health`.
  Expected response: `{"status":"ok","version":"0.1.0"}`.
- [ ] **Public Events Feed**:
  Visit `https://your-api.vercel.app/events`.
  Expected response: JSON array of published events.
- [ ] **Frontend Loading**:
  Open `https://your-web.vercel.app`. Discover feed should render sample events without connection alerts.
- [ ] **Super-Admin Governance Login**:
  Navigate to `https://your-web.vercel.app/login`.
  Log in with `admin@argon.kh` / `password123`.
  Verify automatic redirect to `/admin` dashboard and check that telemetry metrics and users list load properly.
- [ ] **Direct Page Refresh**:
  In `/admin` or `/organizer`, press browser refresh (F5). The page should re-render cleanly without a Vercel 404.
- [ ] **Mobile Gate Scanner**:
  Open `https://your-scanner.vercel.app`. Verify camera permission prompts and login modal.

---

## 8. Common Troubleshooting

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| **"Can't reach the server. Check your connection..."** | `VITE_API_BASE_URL` is missing or still set to `http://localhost:3000` | In `argon-web` Vercel settings, set `VITE_API_BASE_URL` to your HTTPS API domain and redeploy. |
| **CORS Error in Browser Console** | API has not whitelisted the Vercel domain | In `argon-api`, set `CLIENT_URL` to `https://your-web.vercel.app`. The API already automatically allows any `*.vercel.app` origin. |
| **`ERR_MODULE_NOT_FOUND` in API function logs** | Missing `.js` extension on relative ESM imports | Resolved in `apps/api/src/modules/admin/`. All relative imports in ESM require explicit `.js` extensions. |
| **Vercel Build fails: Cannot find `@argon/shared`** | "Include files outside root" was unchecked | In Vercel project settings, ensure Root Directory is allowed to access root workspace packages. |
| **Database connection timeout / Connection limit** | Direct connection URL used in serverless environment | Use Neon / Supabase pooled connection string (`-pooler` endpoint) with `sslmode=require`. |
