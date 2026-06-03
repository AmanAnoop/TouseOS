# TouseOS product status (realistic)

Last updated: Wave 16 reimbursements API on `cursor/wave16-reimbursements-api-4a50`.

## How to read these numbers

We separate **“exists in the repo”** from **“works end-to-end without dead ends.”** Earlier ~86% figures counted routes/APIs; that overstates what a treasurer or member can actually complete in the app.

| Metric | Realistic % | Meaning |
|--------|-------------|---------|
| **Backlog modules with a route or API** | **~88%** | Page or endpoint exists |
| **Connected user journeys** | **~66%** | Primary flows link correctly; few 404s or wrong redirects |
| **Production-ready depth** | **~50%** | Tested, permissioned, env-configured; legal summaries expanded (counsel review still needed) |
| **Launch-ready** | **~44%** | Migrations, Stripe, QA, mobile polish, counsel-approved legal |

**Best single number for “how done is the product?” → ~58–63%** (weighted toward connected journeys, not file count).

## By area

| Area | Connected | Notes |
|------|-----------|--------|
| Auth & onboarding | **~70%** | Signup, create-org, join; `/home` routes sports/club correctly; demo needs seed |
| Greek chapter ops | **~75%** | Members, events, attendance, tasks, comms |
| Finance (payments ↔ budget ↔ reimbursements) | **~74%** | Reimbursements UI → API; dual approval; budget auto-sync on approve/paid |
| SportsOS | **~65%** | Home, travel detail links; shared finance modules work |
| ClubOS | **~60%** | Club home, elections, service hours; thinner than Greek/Sports |
| GreekMatch / social | **~58%** | Multi-org GreekMatch access; social calendar prefill from assets |
| Admin / platform | **~50%** | Platform admin behind email allowlist |

## Fixed in this pass (dead ends)

- `/terms`, `/privacy` pages (signup links)
- `/home` → correct product home (Greek dashboard vs `/sports` vs `/club`)
- Sports/club users no longer stuck on Greek `/dashboard` after login or onboarding
- Org switcher sets active org cookie and navigates to the right home
- GreekMatch “Edit profile” → `/profile?tab=greekmatch`
- Budget housing link hidden for sports/club (was guard-blocked)
- Sports upcoming trips → `/travel/[id]`
- Finance cross-links: budget ↔ payments ↔ reimbursements ↔ housing ↔ philanthropy
- Reimbursement approve/paid triggers budget sync-org API
- Treasurer dashboard links split budget vs reimbursements

## Wave 16 (latest)

- Reimbursements page uses `/api/reimbursements` for list, submit, approve, reject, and mark paid
- Officer permission checks on PATCH; president approval for amounts over threshold
- Budget auto-sync triggered server-side (no separate client sync-org call)
- Active org cookie respected when loading reimbursements and events
- Terms & privacy expanded with structured beta-ready summaries

## Wave 15

- Housing rent: skip members already billed for the same month label
- Event detail: working share (Web Share API or clipboard); removed duplicate QR control
- Social calendar: opens draft composer from `?title=` / `?caption=` (asset library)
- GreekMatch: sports/club active org can open `/greekmatch` when user belongs to a fraternity/sorority

## Still open (honest backlog)

| Priority | Item |
|----------|------|
| P2 | Orphan API routes (tasks, documents, notifications) — UI still uses Supabase directly |
| Launch | Counsel review of terms/privacy; run migrations **015–024** |

## Environment

| Variable | Why |
|----------|-----|
| `SUPABASE_SERVICE_ROLE_KEY` | Org create, budget auto-sync on webhooks |
| Stripe + webhook | Card payments → budget |
| `005_seed.sql` | Demo chapter for onboarding |

## Finance flow (target state)

```mermaid
flowchart LR
  Payments --> Ledger[Live ledger]
  Reimb --> Ledger
  Phil --> Ledger
  Housing --> Payments
  Ledger --> Budget[Budget lines]
```

Officers should be able to: charge → collect → see budget update → approve reimbursement → see expense line — without manual “sync only dues” dead ends.

## Related docs

- Module checklist: `docs/backlog-status.md`
- Launch: `docs/launch-checklist.md`
