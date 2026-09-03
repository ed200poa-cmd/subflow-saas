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
