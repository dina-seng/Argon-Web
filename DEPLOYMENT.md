# Argon Deployment Guide

This guide covers deploying Argon's attendee web app and scanner to Vercel, with
PostgreSQL hosted by Neon or Supabase and accessed through Prisma. It also calls
out an API deployment requirement specific to the current repository.

## 1. Overview

Argon is a JavaScript monorepo containing:

- `apps/web`: Vite/React event discovery, booking, and organizer interface.
- `apps/scanner`: Vite/React QR ticket scanner.
- `apps/api`: Fastify REST API, Prisma client, authentication, booking, and
  ticketing logic.
- `packages/shared`: types and schemas shared by the applications.

Vercel can serve the web and scanner as static sites. API endpoints can run as
Vercel Serverless Functions, with Neon or Supabase providing the external
PostgreSQL database.

**Important:** The API currently starts a persistent Fastify listener from
`apps/api/src/server.ts`. It does not currently have a Vercel Function entry
point or API-specific Vercel configuration. Before deploying the API on Vercel,
adapt the Fastify app to Vercel's request/response handler model and verify that
all routes work in that runtime. The current server process cannot be deployed
as a Vercel Function just by selecting `apps/api` as the root directory. If
keeping the existing long-running server, host the API on a service that
supports persistent Node.js processes and point both frontends to it.

For the Vercel Functions option, use separate Vercel projects for `apps/web`,
`apps/scanner`, and the adapted API. This keeps each build and deployment
independent.

## 2. Prerequisites

- A Vercel account with permission to create projects.
- The Argon GitHub repository and permission to authorize Vercel's GitHub app.
- A Neon or Supabase PostgreSQL project and its connection URLs.
- Node.js 20 or later and npm 10 or later for local validation and migrations.
- A payment-gateway account and credentials if live payments are enabled.
- A Redis-compatible service if the API's Redis-backed features are enabled.
- A domain (optional) for production web, scanner, and API URLs.

## 3. Environment Variables

Add variables in the Vercel dashboard for each project and each environment
(Preview and Production). Use the same names as below. Keep secrets server-side:
do not add database URLs, JWT secrets, QR signing secrets, or webhook secrets to
the web or scanner projects.

The following is a consolidated reference for the current API and Vite apps.
Only set variables needed by each project.

```dotenv
# API / Prisma
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
# Optional. Use only after adding directUrl = env("DIRECT_URL") to the
# datasource in apps/api/prisma/schema.prisma. Use the provider's direct URL.
DIRECT_URL=postgresql://USER:PASSWORD@DIRECT_HOST:PORT/DATABASE?sslmode=require

# API runtime
NODE_ENV=production
PORT=3000
REDIS_URL=rediss://USER:PASSWORD@REDIS_HOST:PORT
JWT_SECRET=replace_with_a_random_secret_at_least_32_characters
JWT_EXPIRES_IN=15m
QR_SIGNING_SECRET=replace_with_a_random_secret_at_least_32_characters
CLIENT_URL=https://your-web-domain.example
SCANNER_URL=https://your-scanner-domain.example
PAYMENT_GATEWAY_BASE_URL=https://your-live-payment-gateway.example
PAYMENT_WEBHOOK_SECRET=replace_with_your_gateway_webhook_secret

# Vite browser apps (these values are public and are embedded in client bundles)
VITE_API_BASE_URL=https://your-api-domain.example
VITE_APP_NAME=Argon
```

For the scanner project, use `VITE_APP_NAME=Argon Scanner`.

### Variable notes

- `DATABASE_URL` is required by the current Prisma schema. Use the provider's
  pooled connection URL for API runtime traffic when available, with TLS enabled.
- `DIRECT_URL` is optional and is not currently referenced by the Prisma schema.
  To use a pooled runtime URL alongside a direct migration URL, add
  `directUrl = env("DIRECT_URL")` to the Prisma datasource. Use the direct
  (non-pooled) URL for migrations.
- Generate `JWT_SECRET` and `QR_SIGNING_SECRET` independently using a secure
  random generator. Keep each at least 32 characters. Never use development
  defaults in production.
- `REDIS_URL` must be a reachable Redis-compatible endpoint if Redis-backed
  revocation or other API features are used. Do not use a local Redis URL in
  production.
- Set `CLIENT_URL` and `SCANNER_URL` to the exact deployed origins allowed by
  the API's CORS configuration.
- Set `PAYMENT_GATEWAY_BASE_URL` and `PAYMENT_WEBHOOK_SECRET` to the production
  gateway values before enabling live payment processing.
- The current frontends use Vite, so browser-exposed variables use the `VITE_`
  prefix. `NEXT_PUBLIC_` is not used by this repository. Any `VITE_` variable
  is public; never put secrets in it.
- `PORT` is used by the current standalone Fastify server. Vercel Functions
  manage their own listener, so do not depend on a fixed `PORT` in a serverless
  adapter unless that adapter specifically requires it.
- The `.env.example` files under each app contain local-development defaults.
  Do not commit real credentials or copy development URLs into production.

## 4. Step-by-Step Deployment Guide

### Step 1: Connect the GitHub repository to Vercel

1. In Vercel, select **Add New → Project** and authorize access to GitHub if
   needed.
2. Import the Argon repository.
3. Create a separate project for each deployed app:
   - Web project: `apps/web`
   - Scanner project: `apps/scanner`
   - API project: `apps/api`, after adding and testing a Vercel-compatible
     Function entry point
4. Configure the production branch (normally `main`). Vercel will create Preview
   deployments for other branches and pull requests when Git integration is
   enabled.

The repository is an npm-workspaces monorepo. Ensure each Vercel project can
install dependencies and access `packages/shared` outside its app directory.
Use Vercel's monorepo/root-directory settings to include files outside the
selected app directory, and confirm the build can resolve `@argon/shared`.

### Step 2: Configure project settings

Use the following build settings as a starting point. Verify them in the first
Preview deployment, since Vercel's monorepo root and output-directory settings
may depend on how the project is configured.

| Project | Root directory | Framework preset | Build command | Output directory |
|---|---|---|---|---|
| Web | `apps/web` | Vite | `npm run build` | `dist` |
| Scanner | `apps/scanner` | Vite | `npm run build` | `dist` |
| API | Repository root (`.`) | Other | `npm run build:api` | No static output; requires a Vercel Function entry point |

For the web and scanner projects:

- Keep the install command compatible with the repository's root npm workspace
  and lockfile. If a build fails to resolve `@argon/shared`, adjust the
  project's workspace/root-directory configuration rather than replacing the
  shared package with a separately installed copy.
- The repository includes SPA rewrites in each app's `vercel.json`. Confirm
  Vercel applies the corresponding configuration so direct navigation to
  client-side routes returns the app's `index.html`.
- Do not configure a custom server start command for the static frontends.

For the API project, keep the repository root as the project root so npm can
resolve the `@argon/shared` workspace. `npm run build:api` runs the API
workspace's `prebuild` step, which builds `@argon/shared` and generates the
Prisma client before compiling the API. This compiles the API but does not
create the Vercel Function handlers required to route HTTP requests. Finish and
test that serverless integration before treating the API as deployed.

### Step 3: Configure environment variables

1. Open each Vercel project and go to **Settings → Environment Variables**.
2. Add only the variables that project needs:
   - Web and scanner: `VITE_API_BASE_URL` and, if customized,
     `VITE_APP_NAME`.
   - API: database, authentication, QR, CORS origin, Redis, and payment
     variables listed above.
3. Select the applicable environments. Use separate credentials for Preview
   and Production where possible.
4. Redeploy after changing variables. Vite reads its `VITE_` values at build
   time, so changing them requires a new build.
5. Keep `.env` files, database URLs, and secrets out of Git and deployment logs.

### Step 4: Apply Prisma migrations in production

Use Prisma migrations for schema changes. Do not run `prisma migrate dev` in
production; that command is intended for development.

1. Ensure migration files are committed under `apps/api/prisma/migrations`.
2. Confirm `DATABASE_URL` is available to Prisma CLI. If the runtime URL is
   pooled, configure the Prisma `directUrl` setting and provide `DIRECT_URL` as
   described above.
3. Before deploying an API version that requires a schema change, run the
   production migration from a trusted local/CI environment with production
   credentials loaded securely:

   ```bash
   npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
   ```

4. Verify the migration completed successfully, then deploy the compatible API
   and frontend versions.

Prefer a deliberate migration step before deployment over running migrations as
part of every Vercel build. Builds can run concurrently for Preview and
Production, and should not perform shared production database changes. If you
automate migration execution in CI, make it a single, protected production
stage with production-only credentials, not a Preview build step.

## 5. Post-Deployment Checks

Run these checks against the live URLs after deployment:

1. **Frontend availability:** Open the web and scanner URLs. Refresh a nested
   route directly to confirm SPA rewrites work.
2. **API availability:** Request the API health endpoint:

   ```bash
   curl -i https://your-api-domain.example/health
   ```

   The API documents `GET /health` as a liveness check. An HTTP success
   response should return a small status payload.
3. **Database connectivity:** Check Vercel Function logs while exercising an
   API route that reads PostgreSQL (for example, `GET /events`). A successful
   `/health` response alone may not prove the database is reachable if the
   health route does not query it.
4. **CORS:** From the web and scanner, verify browser requests to the API succeed
   and that the configured production origins match `CLIENT_URL` and
   `SCANNER_URL`.
5. **Authentication and booking:** Register or sign in with a test account,
   browse a published event, and create a test booking.
6. **QR ticketing:** Complete the test payment/booking flow, open the resulting
   ticket, and confirm a QR code is displayed. Sign in to the scanner app, scan
   that ticket, and confirm check-in succeeds. Verify that scanning the same
   ticket a second time is rejected or reported as already checked in.
7. **Payment callbacks:** If payments are enabled, use the gateway's sandbox or
   test mode first. Confirm the webhook URL is reachable and the configured
   webhook secret validates signed callbacks.

Use test events, accounts, payment credentials, and tickets for verification;
avoid creating fake production sales or check-ins.

## 6. Troubleshooting

| Symptom | Likely cause | What to check |
|---|---|---|
| `@argon/shared` cannot be resolved during build | Vercel is installing/building only inside an app directory and cannot see the npm workspace | Confirm monorepo/root-directory settings include the repository root and `packages/shared`; check the root lockfile and install logs. |
| API project builds but routes return 404 or fail to start | The current Fastify entry point calls `listen()` and is not a Vercel Function handler | Add and test the Vercel-compatible API entry point and route mapping. A successful TypeScript build is not sufficient. |
| Prisma cannot connect or times out | Incorrect URL, network/TLS configuration, IP restrictions, or an unreachable database | Check the correct Vercel environment variable, provider URL, TLS requirement, database status, and provider access controls. Never print the full URL in logs. |
| Database reports too many connections | Serverless instances create concurrent database connections; a direct connection URL may exceed provider limits | Use the provider's pooled URL for runtime queries, choose an appropriate pool size, and avoid constructing new Prisma clients per request. For migrations, use the direct URL through Prisma's `directUrl` configuration. |
| Prisma migrations fail with a pooled connection URL | The pooler may not support migration operations or advisory locking | Run `prisma migrate deploy` with the provider's direct connection URL (`DIRECT_URL`) and confirm the Prisma datasource is configured to use it. |
| First request after inactivity is slow | Serverless cold starts and database connection initialization | Keep initialization lightweight, reuse a Prisma client within a warm function instance, and measure latency before adding scheduled warm-up traffic. Cold starts cannot be fully eliminated. |
| CORS errors in browser | Production origins differ from API configuration | Set exact HTTPS origins for `CLIENT_URL` and `SCANNER_URL`, redeploy the API, and inspect the browser's preflight request. |
| Frontend API requests still point at localhost | Vite variables are missing or changed after the deployment build | Set `VITE_API_BASE_URL` on the correct Vercel project/environment and trigger a new deployment. |
| Direct refresh of a frontend route returns 404 | The SPA rewrite was not applied to the deployed project | Confirm the app's `vercel.json` is included in the Vercel project root and rewrites unknown paths to `index.html`. |
| `prisma migrate deploy` reports no migration files | Migration history has not been committed or the schema path is wrong | Commit the migration directory and use `--schema apps/api/prisma/schema.prisma` from the repository root. |
| QR generation or validation fails in production | Different/missing signing secrets, malformed QR data, or mismatched deployments | Set the same secure `QR_SIGNING_SECRET` for API instances, redeploy, and test with a newly issued ticket. Do not expose the secret in the frontend. |

For diagnosis, inspect the Vercel deployment's build and Function logs, then check
the Neon or Supabase connection/pool metrics. Avoid logging credentials, JWTs,
QR tokens, payment data, or full connection strings.
