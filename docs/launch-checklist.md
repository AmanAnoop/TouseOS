# TouseOS launch checklist (module 66)

Use this before inviting a live chapter or university pilot. It maps to the MVP priority order in `docs/feature-backlog.md` §66.

## Environment

- [ ] Supabase project provisioned; migrations **001 → 022** applied
- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` set
- [ ] `NEXT_PUBLIC_APP_URL` matches production domain
- [ ] Stripe keys + webhook endpoint (`checkout.session.completed`, `account.updated`)
- [ ] Optional: `STRIPE_CONNECT_ENABLED=true`, `PLATFORM_STRIPE_APPLICATION_FEE_PERCENT`
- [ ] Optional: `PLATFORM_IMPERSONATION_ENABLED=true` (platform staff only)
- [ ] Resend / Twilio keys if email/SMS reminders enabled
- [ ] Vercel cron secret for `/api/cron/*` routes

## Core flows (smoke test)

- [ ] Sign up, verify email, join org via invite code
- [ ] Officer roles: treasurer can manage payments; member sees own dues only
- [ ] Create event → RSVP → QR check-in
- [ ] Upload album photos → officer approval → feed post
- [ ] Create dues charge → Stripe Checkout (Connect destination if configured)
- [ ] Reconciliation panel on Payments shows matched Stripe intents
- [ ] PNM record + consent flag before bulk SMS
- [ ] Interchapter proposal + workspace messages
- [ ] Transition binder export (HTML)
- [ ] Yearbook: HTML export + **PDF download**

## Compliance & safety

- [ ] Audit log entries for refunds, impersonation, GreekMatch reports
- [ ] STOP/opt-out on SMS; quiet hours configured
- [ ] Risk incident export (CSV) tested
- [ ] University admin sees only configured org metrics

## SportsOS (if club sports pilot)

- [ ] Roster import CSV
- [ ] Attendance at practice/game
- [ ] Waiver signed before travel roster lock
- [ ] Travel cost calculator + deposit charge

## Go / no-go

- [ ] `npm run build` passes in CI
- [ ] No P0 open issues on payments, auth, or tenant isolation
- [ ] Support contact and rollback plan documented for treasurer-facing bugs

**Sign-off:** _______________  **Date:** _______________
