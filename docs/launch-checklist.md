# TouseOS launch checklist (module 66)

Use this before inviting a live chapter or university pilot.  
**Runbook:** [launch-runbook.md](./launch-runbook.md) · **Env check:** `npm run launch:check` · **Deploy probe:** `GET /api/ready`

## Environment

- [ ] Supabase project provisioned; migrations **001 → 028** applied (see `supabase/migrations/` and `supabase/APPLY_MIGRATIONS.md`)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` set
- [ ] `NEXT_PUBLIC_APP_URL` matches production domain
- [ ] Stripe keys + webhook endpoint (`checkout.session.completed`, `account.updated`, `payment_intent.payment_failed`)
- [x] `.env.example` documents all integration keys
- [x] `npm run launch:check` script validates required env locally
- [x] `GET /api/ready` returns env + webhook + cron documentation
- [ ] Optional: `STRIPE_CONNECT_ENABLED=true`, `PLATFORM_STRIPE_APPLICATION_FEE_PERCENT`
- [ ] Optional: `PLATFORM_IMPERSONATION_ENABLED=true` (platform staff only)
- [ ] Resend / Twilio keys if email/SMS reminders enabled
- [ ] `CRON_SECRET` set in production (Vercel cron → `/api/cron/*`)

## Core flows (smoke test)

- [x] Auth routes: signup, login, forgot-password, email verification flow
- [x] Onboarding: create org (`015_onboarding_rpc`), join via invite
- [x] Active org cookie + product home routing (Greek / Sports / Club)
- [ ] Sign up, verify email, join org via invite code (live Supabase)
- [ ] Officer roles: treasurer can manage payments; member sees own dues only
- [x] Events list/create via `/api/events`; RSVP via `/api/events/rsvp`
- [ ] Create event → RSVP → QR check-in (live test)
- [x] Photo albums/photos APIs; social upload uses storage + API
- [x] Social calendar via `/api/social-calendar`
- [x] Budget page loads via payments/events/members APIs
- [x] Account profile & notifications via `/api/account`
- [x] Form fill via `/api/forms/[id]` + responses API
- [ ] Upload album photos → officer approval → feed post (live test)
- [x] Payments list, plans, hardship, reimbursements, budget sync APIs
- [ ] Create dues charge → Stripe Checkout (Connect destination if configured)
- [x] Stripe reconciliation panel wired on Payments
- [x] PNM via `/api/pnm`; consent fields on leads
- [x] Interchapter workspaces + messages APIs
- [x] Transition binders API + HTML export
- [x] Yearbook HTML + PDF export routes

## Compliance & safety

- [x] Audit log inserts on sensitive API actions (payments, members, etc.)
- [x] Incidents API + CSV export (`/api/incidents/export`)
- [x] Risk checklists API (`/api/risk/checklists`)
- [ ] STOP/opt-out on SMS; quiet hours configured (Twilio live)
- [ ] Risk incident export (CSV) tested in pilot org
- [x] University admin routes behind campus allowlist

## SportsOS (if club sports pilot)

- [x] Roster CSV import API
- [x] Tryouts API; waivers GET/POST; travel trip APIs
- [ ] Attendance at practice/game (live test)
- [ ] Waiver signed before travel roster lock (live test)
- [ ] Travel cost calculator + deposit charge (live test)

## Go / no-go

- [x] `npm run build` + `typecheck` + `lint` in GitHub Actions (`.github/workflows/ci.yml`)
- [x] Launch runbook + rollback notes (`docs/launch-runbook.md`)
- [ ] No P0 open issues on payments, auth, or tenant isolation
- [x] Support & rollback documented (`docs/launch-runbook.md`)
- [x] Post-deploy smoke: `npm run smoke:pilot` (with `BASE_URL`)
- [x] Migration guide: `supabase/APPLY_MIGRATIONS.md`
- [x] `/api/ready` reachable without login (middleware fix)
- [ ] Support email configured in production org settings

**Sign-off:** _______________  **Date:** _______________
