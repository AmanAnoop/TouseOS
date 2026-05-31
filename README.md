# TouseOS

The campus organization operating system for fraternities, sororities, and club
sports teams. TouseOS is a mobile-first SaaS platform with two product
experiences — **Touse Greek** and **SportsOS** — built on one multi-tenant
backend.

## Tech stack

- **Next.js 15** (App Router, Server Components, API routes)
- **TypeScript** (strict)
- **Tailwind CSS** (custom Greek + SportsOS brand tokens, dark/light mode)
- **Supabase** — Postgres, Auth, Storage, Realtime, Row Level Security
- **Stripe** — dues checkout, webhooks, (Stripe Connect ready)
- **Twilio** — consent-based PNM SMS with STOP/HELP/opt-out handling
- **OpenAI** (optional) — AI assistant for captions, event plans, newsletters

## Features

- Multi-tenant org workspaces (fraternity, sorority, club sports, general, university)
- Role-based access control — 26 roles × 31 permissions
- Member roster, profiles, dues & payments, budgets, reimbursements
- Events with RSVP, QR check-in, Partiful-style public pages
- PNM recruitment CRM with consent-based mass texting
- Touse Social — photo albums, approval workflow, Instagram content packs
- GreekMatch — opt-in cross-chapter matching with real-time chat
- SportsOS — tryouts, waivers, travel + cost calculator, equipment, injuries
- Interchapter ExecLink, standards, risk management, alumni CRM, philanthropy
- AI assistant, officer transition binders, vendor memory, forms builder
- Admin dashboard with audit logging

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

Create a project at [supabase.com](https://supabase.com), then run the
migrations in order from the SQL editor:

```
supabase/migrations/001_schema.sql       # tables, enums, RLS, helpers
supabase/migrations/002_greekmatch.sql    # GreekMatch tables + RLS
supabase/migrations/003_storage.sql       # storage buckets + policies
supabase/migrations/004_notifications.sql # notification triggers
supabase/migrations/005_seed.sql          # OPTIONAL demo data
```

> The seed migration (`005_seed.sql`) inserts a demo organization with members,
> events, payments, and PNMs so you can explore the app immediately. Skip it for
> a clean production database.

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in the keys (Supabase is required; Stripe, Twilio, and OpenAI are optional
and unlock their respective features):

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Server-side admin operations + webhooks |
| `STRIPE_SECRET_KEY` | ◻️ | Dues payment processing |
| `STRIPE_WEBHOOK_SECRET` | ◻️ | Confirm payments via webhook |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | ◻️ | PNM SMS |
| `TWILIO_MESSAGING_SERVICE_SID` | ◻️ | SMS sender |
| `OPENAI_API_KEY` | ◻️ | AI assistant |

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up, then create an
organization (or join with an invite code) to enter the workspace.

## Verification scripts

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
npm run build       # production build
```

## Webhook setup (production)

- **Stripe** → point a webhook at `/api/stripe/webhook` for
  `checkout.session.completed` and `payment_intent.payment_failed`.
- **Twilio** → point the inbound SMS webhook at `/api/twilio/webhook` for
  STOP/HELP/opt-out handling.

## Project structure

```
app/
  (auth)/          login, signup, forgot-password
  (app)/           authenticated workspace (55 pages)
  api/             22 API routes
  p/[id]/          public event pages
  join/[slug]/     public PNM interest forms
components/
  ui/              reusable component library
  layout/          sidebar, bottom nav, app shell
lib/
  supabase/        browser + server clients
  permissions.ts   RBAC matrix
  stripe.ts        Stripe helpers
  twilio.ts        SMS helpers + consent/quiet-hours
  utils.ts         formatting, CSV, uploads
supabase/migrations/  SQL schema, RLS, seed
types/             TypeScript domain types
```

## Product planning

- [Full feature backlog](docs/feature-backlog.md)
