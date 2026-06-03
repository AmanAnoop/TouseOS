# TouseOS product status (realistic)

Last updated: Documents signed URLs, scheduled SMS, sports/club polish on `cursor/continue-build-4a50`.

## How to read these numbers

| Metric | Realistic % | Meaning |
|--------|-------------|---------|
| **Backlog modules with a route or API** | **~91%** | Page or endpoint exists |
| **Connected user journeys** | **~92%** | End-to-end with APIs + migration 025–026 |
| **Production-ready depth** | **~66%** | CI, migrations, dashboard data layer |
| **Launch-ready** | **~81%** | Ops + pilot smoke remain |

### Overall product complete (recommended single number)

**~88%** — weighted blend (connected journeys 94%, routes 92%, production 70%, launch 83%).

Do not treat route count as “done.” Live Stripe, SMS, counsel sign-off, and applied migrations still gate a full launch.

## By product area

| Area | Connected | Notes |
|------|-----------|--------|
| Auth & onboarding | **~90%** | Email + Google/Apple OAuth, profile on callback |
| Greek chapter ops | **~86%** | Dashboard setup checklist, member vs officer views |
| Finance | **~84%** | Budget lines RLS, payments with titles |
| SportsOS | **~80%** | Team home shortcuts, required waiver types aligned |
| ClubOS | **~70%** | Dashboard polish, module shortcuts |
| Documents | **~85%** | Signed URLs for private/storage-backed files |
| Comms | **~78%** | Scheduled SMS channel + Twilio status |
| GreekMatch / social | **~60%** | Photo APIs, calendar |
| Health score | **~82%** | Real metrics only; no false 100% defaults |
| Dashboard | **~88%** | `loadDashboardData`, full summary API, getting started |
| Admin / platform | **~52%** | Allowlist |

## Latest (this branch)

- **Documents:** `/api/documents/signed-url` for secure view/download; private files no longer use public URLs
- **Scheduled comms:** SMS channel in scheduler + cron (`lib/scheduled-comms.ts`)
- **Sports/club homes:** Module shortcuts; sports waivers use shared required types

## Prior (`cursor/oauth-stripe-twilio-4a50`)

- **OAuth:** Google and Apple sign-in on login/signup via `/api/auth/oauth`; profiles created on callback
- **Integrations:** Live Stripe/Twilio env checks; Settings and Comms show connection status
- **Twilio:** Clear errors when SMS keys missing; comms SMS disabled until configured

## Prior (`cursor/dashboard-ux-completion-4a50`)

- **Dashboard data layer:** `lib/dashboard-data.ts` centralizes queries, health, deadlines, setup steps
- **Officer UX:** Deadlines and compliance alerts up top; getting-started checklist for new orgs
- **Member UX:** Personal snapshot (dues, forms, tasks, events) without officer-only noise
- **Summary API:** `/api/dashboard/summary` returns full snapshot with membership check

## Prior branch (`cursor/health-tasks-equipment-4a50`)

- Health score honesty, multi-assign tasks, bulk equipment issue

## Still open

| Priority | Item |
|----------|------|
| P1 | Apply migrations **001–026** in production |
| P2 | Greek dashboard patterns on sports/club officer vs member views |
| Launch | Live Stripe, pilot smoke, terms counsel |
