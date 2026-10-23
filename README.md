# SubFlow SaaS — Subscription Management Platform

> Built by **Edward Kim — Full-Stack AI Developer**

A production-ready SaaS subscription platform built with TypeScript strict mode throughout, tRPC, Drizzle ORM, PostgreSQL, Stripe, React 19, and Tailwind CSS.

**Live: [https://subflow-frontend-production-53b1.up.railway.app](https://subflow-frontend-production-53b1.up.railway.app)**

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Browser (React 19)                  │
│  Landing → Pricing → Register/Login → Dashboard → Admin  │
│           React Query + tRPC Client (typed end-to-end)   │
└────────────────────────┬────────────────────────────────┘
                         │ tRPC (HTTP batch)
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Express + tRPC Server (Node.js)             │
│  ┌──────────┐ ┌────────────┐ ┌────────┐ ┌───────────┐  │
│  │ auth     │ │subscription│ │ usage  │ │  admin    │  │
│  │ router   │ │ router     │ │ router │ │  router   │  │
│  └──────────┘ └────────────┘ └────────┘ └───────────┘  │
│                    ▼                ▼                    │
│             Drizzle ORM          Stripe SDK              │
└─────────────────────┬───────────────┬────────────────────┘
                      ▼               ▼
               PostgreSQL          Stripe API
               (users,             (Checkout,
               subscriptions,       Webhooks,
               usage_logs,          Customer Portal)
               payments)
```

---

## How tRPC Replaces REST

In a traditional REST API you define routes like `POST /api/auth/login`, write the handler, then manually type the request/response on the frontend. Any mismatch causes a runtime error you only discover in production.

With tRPC, the router definition **is** the type contract. The frontend imports the `AppRouter` type and calls `trpc.auth.login.useMutation()` — TypeScript enforces that you pass the exact expected input and gives you the exact typed output, at compile time. No OpenAPI spec, no codegen, no runtime surprises. Rename a field on the backend and the frontend immediately shows a type error.

---

## How Drizzle ORM Works with PostgreSQL

Drizzle is a TypeScript-first ORM that is schema-defined rather than class-based. You write your schema in `src/db/schema.ts` using `pgTable()` and column helpers — Drizzle infers all TypeScript types from that definition. Queries look like SQL but are fully typed:

```typescript
const [user] = await db
  .select()
  .from(users)
  .where(eq(users.email, input.email))
  .limit(1);
// user is typed as User | undefined — no casting needed
```

Migrations are generated with `drizzle-kit generate` and applied with `drizzle-kit migrate`. No runtime magic, no decorator annotations.

---

## Stripe Setup

### 1. Create Products in Stripe Dashboard
- Product 1: "SubFlow Pro" → Recurring $29/month → copy Price ID → `STRIPE_PRO_PRICE_ID`
- Product 2: "SubFlow Enterprise" → Recurring $99/month → copy Price ID → `STRIPE_ENTERPRISE_PRICE_ID`

### 2. Configure Webhook
In Stripe Dashboard → Developers → Webhooks → Add endpoint:
- URL: `https://your-domain.com/webhook`
- Events to listen to:
  - `payment_intent.succeeded`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- Copy Signing Secret → `STRIPE_WEBHOOK_SECRET`

### 3. Local Testing with Stripe CLI
```bash
stripe listen --forward-to localhost:3000/webhook
```

---

## Run Locally with Docker Compose

### Prerequisites
- Docker + Docker Compose
- Node.js 20+

### Steps

```bash
# 1. Clone and enter project
cd subflow_saas

# 2. Copy environment variables
cp .env.example .env
# Fill in STRIPE_SECRET_KEY, JWT_SECRET, and Stripe Price IDs

# 3. Start all services
docker-compose up

# 4. Run database migrations (in a new terminal)
cd backend
npm install
npm run db:push

# 5. Open in browser
# Frontend: http://localhost:5173
# Backend health: http://localhost:3000/health
```

---

## E2E tests

[![E2E](https://github.com/ed200poa-cmd/subflow-saas/actions/workflows/e2e.yml/badge.svg)](https://github.com/ed200poa-cmd/subflow-saas/actions/workflows/e2e.yml)

Playwright tests in `e2e/` drive the real app in Chromium, Firefox and WebKit. Playwright starts the real backend (schema push, admin seed, API) and the Vite dev server itself; the tests talk to a real PostgreSQL. Checkout is the one mocked part: the browser's `subscription.create` call is answered with a fake Checkout URL, so that procedure's Stripe calls never run (its auth and plan validation are tested against the real backend). Every test fails if any page in its browser context tries to reach `stripe.com`.

### Run locally

Prerequisites: Node.js 20+ and a PostgreSQL server on `localhost:5432` with the same role and database as `docker-compose.yml` (`subflow` / `subflow_dev` / `subflow`). Either `docker-compose up postgres` or a local server such as Postgres.app works.

```bash
cd backend && npm ci && cd ..
cd frontend && npm ci && cd ..
cd e2e && npm ci
npx playwright install chromium firefox webkit
npx playwright test                    # all three browsers
npx playwright test --project=chromium # one browser
npx playwright show-report             # HTML report
```

No secrets are needed. `e2e/playwright.config.ts` passes dummy values to the backend: an invalid Stripe key, a test-only JWT secret and the admin test account (`E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, overridable). Override the database with `DATABASE_URL`. Ports 3000 and 5173 must be free: Playwright always starts its own servers so the dummy configuration is what gets tested. The tests add users to that database.

### CI

`.github/workflows/e2e.yml` runs the suite on every push and pull request with a `postgres:16-alpine` service container and Node 20. The HTML report is uploaded as an artifact on every run; traces and screenshots are uploaded when a test fails. Retries are off, so a flaky test shows up as a failure.

### What is covered

| Spec | Flows |
|---|---|
| `smoke.spec.ts` | Backend health endpoint |
| `landing.spec.ts` | Landing page loads; its buttons open sign-up and sign-in |
| `auth.spec.ts` | Register and land on a dashboard filled from the database; log in; wrong password rejected; mismatched passwords block sign-up and create no account; logout clears the session and protected pages redirect to login |
| `pricing.spec.ts` | Choosing Pro or Enterprise sends that plan and redirects to a mocked Checkout; a signed-out visitor is sent to sign-up with no checkout created; the backend refuses checkout without a session (401) and rejects an unknown plan (400) |
| `admin.spec.ts` | Seeded admin reaches the admin portal and sees real users; a regular user is redirected in the UI and all four admin procedures refuse it (403, or 401 without a token) |
| `resilience.spec.ts` | Slow, 500 and malformed JSON responses injected with `page.route`: login shows a pending state or the error and stays signed out; dashboard, pricing and admin show their loading states |
| `accessibility.spec.ts` | axe-core WCAG 2.1 AA scan of landing, login, register, pricing, dashboard and admin against a recorded baseline; any new violation fails |

Page Objects live in `e2e/pages/`, shared helpers (API sign-up, fault injection, the Stripe guard) in `e2e/support/`.

### Not covered yet

- **Failed data loads.** When the dashboard, pricing checkout or admin portal API fails, the app shows no error (the dashboard renders "Free" with a placeholder status, the admin portal renders zeros, pricing does nothing). These are recorded as `test.fixme` in `resilience.spec.ts` and are skipped until the app handles them.
- **Existing accessibility violations.** Colour contrast on landing, pricing, dashboard and admin, and a colour-only link on register, are in the baseline in `accessibility.spec.ts` rather than fixed.
- **Real Stripe flows.** Customer creation, the Checkout session, plan to price mapping, the customer portal, cancel, upgrade and the `/webhook` handler are not exercised; Checkout is mocked in the browser.
- **Admin stats values.** The admin test checks that real users are listed and the user count is not the empty default, not that revenue or churn figures are correct.
- **Usage tracking** (`usage.track`, plan limits) and the paid-plan dashboard (Manage Billing, Cancel Subscription).
- **Mobile viewports** and the production build (`vite build` + `serve`); tests run against the Vite dev server.

---

## Project Structure

```
subflow_saas/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.ts        # Drizzle schema (4 tables)
│   │   │   └── index.ts         # PostgreSQL pool + drizzle client
│   │   ├── routers/
│   │   │   ├── auth.ts          # register, login, logout, me
│   │   │   ├── subscription.ts  # create, upgrade, cancel, status, portalUrl
│   │   │   ├── usage.ts         # track, getUsage, getLimits, checkLimit
│   │   │   └── admin.ts         # getStats, getUsers, getRevenue, getUsageStats
│   │   ├── trpc.ts              # tRPC init + publicProcedure/protectedProcedure/adminProcedure
│   │   ├── stripe.ts            # Stripe client + webhook handler
│   │   └── index.ts             # Express server entry point
│   ├── drizzle.config.ts
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── PricingCard.tsx
│   │   │   └── UsageBar.tsx
│   │   ├── pages/
│   │   │   ├── Landing.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Admin.tsx
│   │   │   └── Pricing.tsx
│   │   ├── lib/
│   │   │   ├── trpc.ts          # tRPC React client
│   │   │   └── auth.ts          # JWT localStorage helpers
│   │   ├── App.tsx              # React Router routes
│   │   └── main.tsx             # Entry point
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
├── docker-compose.yml
├── Dockerfile
├── Procfile
└── .env.example
```

---

## Database Schema

```sql
users (id UUID PK, email VARCHAR UNIQUE, password_hash TEXT, role ENUM, created_at TIMESTAMP)
subscriptions (id UUID PK, user_id UUID FK, stripe_customer_id VARCHAR, stripe_subscription_id VARCHAR, plan ENUM, status ENUM, current_period_end TIMESTAMP)
usage_logs (id UUID PK, user_id UUID FK, endpoint VARCHAR, timestamp TIMESTAMP)
payments (id UUID PK, user_id UUID FK, amount INT, currency VARCHAR, status ENUM, stripe_payment_id VARCHAR, created_at TIMESTAMP)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript (strict mode, no `any`) |
| API | tRPC v10 + Express |
| Database | PostgreSQL via Drizzle ORM |
| Billing | Stripe (Checkout + Webhooks + Customer Portal) |
| Frontend | React 19 + Vite + Tailwind CSS |
| Data Fetching | React Query v5 via @trpc/react-query |
| Validation | Zod |
| Auth | JWT (bcrypt + jsonwebtoken) |
| Deployment | Railway (Procfile + Dockerfile) |
