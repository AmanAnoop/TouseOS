# TouseOS

**The campus organization operating system** — one platform for fraternities, sororities, club sports teams, and student orgs to run members, money, events, recruitment, compliance, and content in a single mobile-first workspace.

TouseOS ships as two tailored experiences on shared infrastructure:

| Experience | Built for | Highlights |
|------------|-----------|------------|
| **Touse Greek** | Fraternities & sororities | PNM CRM, GreekMatch, interchapter proposals, standards, NME, big/little, photo approval, chapter health score |
| **SportsOS** | Club sports teams | Tryouts, waivers, travel & trip costs, injuries, equipment, league standings, tournament brackets |

---

## What problem TouseOS solves

Student orgs juggle spreadsheets, GroupMe, Instagram DMs, Venmo, and paper forms. TouseOS replaces that patchwork with:

- **One roster** — roles, dues status, attendance, forms, emergency contacts
- **One ledger** — dues, budgets, reimbursements, parent payment links
- **One calendar** — events, RSVP, QR check-in, attendance points
- **One comms hub** — announcements, email blasts, scheduled messages
- **One compliance layer** — risk checklists, standards cases, waivers, audit logs
- **One social pipeline** — event albums → officer approval → Instagram content packs → yearbook

Everything is **org-scoped** with Postgres Row Level Security so each chapter/team only sees its own data.

---

## Who it's for

- **Chapter officers** — president, treasurer, social chair, recruitment chair, risk manager
- **Members** — pay dues, RSVP, upload photos, complete forms, view announcements
- **PNMs & recruits** — interest forms, event attendance, structured voting (officers)
- **Club sports captains & coaches** — roster, travel, waivers, game results
- **Alumni & advisors** — read-only or limited access per role
- **Platform admins** — multi-tenant oversight (admin dashboard)

---

## Feature map (by module)

### Core platform
Auth, multi-tenant orgs, RBAC (26 roles), dashboard & health score, roster CSV import, tasks (comments + attachments), documents (version history), forms, reports & semester rewind, AI assistant, notifications (in-app + push subscription), admin tools.

### Finance
Dues & Stripe checkout, manual cash/check logging, parent payment links, payment reminders (email), budgets with alerts, multi-level reimbursement approval ($250+ threshold).

### Events & engagement
Events, public Partiful-style pages (`/p/[id]`), QR check-in with auto attendance points, brotherhood/sisterhood engagement tracking, governance meetings.

### Communications
In-app announcements, Resend email blasts with audience segmentation, scheduled message queue + Vercel cron processor.

### Greek / recruitment
PNM CRM, structured voting panel, consent-based SMS (Twilio), big/little matching, NME modules, standards & risk, philanthropy, alumni CRM, GreekMatch (opt-in dating).

### Interchapter
Cross-chapter event proposals, idea marketplace, shared workspaces (on accept), availability date matching, joint budget splitter.

### Social / content
Photo albums, approval workflow, Instagram content packs (AI captions), social calendar, chapter feed, event memories, digital yearbook with HTML export, PR compliance checklist, social asset library.

### SportsOS
Team dashboard, tryouts, waivers, travel trips, injury reports, equipment, league standings, tournament brackets.

> **Rollout status:** ~63% of numbered backlog modules have working pages; ~45–50% of sub-features are at production depth. See [docs/feature-backlog.md](docs/feature-backlog.md) for the full spec.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Backend | Supabase — Postgres, Auth, Storage, Realtime, RLS |
| Payments | Stripe Checkout + webhooks |
| Email | Resend (blasts + scheduled comms) |
| SMS | Twilio (PNM texting, STOP/HELP compliance) |
| QR check-in | `@zxing/browser` |
| Deploy | Vercel (with cron for scheduled messages) |

---

## Getting started

### 1. Install

```bash
npm install
```

### 2. Supabase — run migrations in order

Execute each file in the Supabase SQL editor:

```
supabase/migrations/001_schema.sql
supabase/migrations/002_greekmatch.sql
supabase/migrations/003_storage.sql
supabase/migrations/004_notifications.sql
supabase/migrations/005_seed.sql              # optional demo data
supabase/migrations/006_rollout_enhancements.sql
supabase/migrations/007_phase2_workspace.sql
supabase/migrations/008_phase3_engagement.sql
supabase/migrations/009_phase4_sports_interchapter_push.sql
supabase/migrations/010_notification_preferences.sql
supabase/migrations/011_payment_plans_rls.sql
```

### 3. Environment variables

```bash
cp .env.example .env.local
```

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Client-side Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server routes, webhooks, cron |
| `STRIPE_SECRET_KEY` | For dues | Stripe Checkout |
| `STRIPE_WEBHOOK_SECRET` | For dues | Payment confirmation |
| `RESEND_API_KEY` | For email | Email blasts & scheduled email |
| `TWILIO_*` | For SMS | PNM mass texting |
| `CRON_SECRET` | Production | Protect `/api/cron/process-scheduled` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Optional | Browser push notifications |
| `VAPID_PRIVATE_KEY` | Optional | Server-side Web Push delivery |
| `VAPID_SUBJECT` | Optional | mailto: contact for VAPID (default support@touseos.com) |

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → sign up → create or join an organization.

### 5. Verify

```bash
npm run typecheck
npm run lint
npm run build
```

---

## Production webhooks

- **Stripe** → `POST /api/stripe/webhook` (`checkout.session.completed`, `payment_intent.payment_failed`)
- **Twilio** → `POST /api/twilio/webhook` (STOP/HELP/opt-out)

## Vercel cron

`vercel.json` runs `/api/cron/process-scheduled` every 15 minutes. Set `CRON_SECRET` and pass it as `Authorization: Bearer <secret>`.

---

## Project structure

```
app/
  (auth)/              login, signup, forgot-password
  (app)/               authenticated workspace (63 pages)
  api/                 REST routes (36 endpoints)
  p/[id]/              public event pages
  join/[slug]/         public PNM interest forms
components/
  ui/                  shared design system
  layout/              sidebar, bottom nav, app shell
  tasks/               task card, detail panel (comments + attachments)
  budget/              budget alerts, overview stats
  documents/           document card, version history
  comms/               announcement feed, scheduled messages
  events/              event card
  roster/              member table
  payments/            payment stats, payment list
  reimbursements/      reimbursement list
  sports/              league standings
  profile/             profile header, form, privacy settings
  engagement/          brotherhood/sisterhood dashboard
  interchapter/        availability matcher, budget splitter
  social/              photo approval grid
  pnm/                 PNM voting panel
  tournaments/         bracket manager
  dashboard/           health score badge
lib/
  supabase/            browser + server clients
  permissions.ts       RBAC matrix
  health-score.ts      org health computation
  attendance-points.ts check-in auto-award rules
  budget-alerts.ts, cash-flow-forecast.ts, push-notifications.ts, yearbook-export.ts     budget threshold alerts
  sports-standings.ts  W-L record computation
  email.ts             Resend helpers
  notifications.ts     in-app notification helpers
hooks/
  use-org.ts           shared org context
  use-push-notifications.ts
supabase/migrations/   SQL schema + RLS (001–009)
docs/
  feature-backlog.md   full product spec (~1,100+ sub-features)
types/                 TypeScript domain types
public/
  sw.js                service worker for push notifications
```

---

## Key routes

| Route | Purpose |
|-------|---------|
| `/dashboard` | Org health, stats, upcoming events |
| `/roster` | Members, CSV import, invites |
| `/payments` | Dues, Stripe, manual payments, parent links |
| `/budget` | Budget lines, alerts, export |
| `/events` | Calendar, RSVP, check-in |
| `/comms` | Announcements, email, scheduled messages |
| `/pnm` | Recruitment CRM + voting |
| `/social` | Albums, photo approval, content packs |
| `/yearbook` | Semester scrapbook + HTML/PDF export |
| `/interchapter` | Proposals, ideas, availability, budget split |
| `/engagement` | Brotherhood/sisterhood participation |
| `/standings` | Sports league W-L record |
| `/greekmatch` | Opt-in cross-chapter matching |
| `/health` | Chapter health score breakdown |

---

## Product planning

- [Full feature backlog](docs/feature-backlog.md) — complete module spec and safety boundaries

---

## License

Private — All rights reserved.
