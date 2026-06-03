# TouseOS product status (realistic)

Last updated: Launch completion sweep on `cursor/launch-completion-4a50`.

## How to read these numbers

We separate **“exists in the repo”** from **“works end-to-end without dead ends.”** File/route counts alone overstate what a treasurer or member can complete in the app.

| Metric | Realistic % | Meaning |
|--------|-------------|---------|
| **Backlog modules with a route or API** | **~90%** | Page or endpoint exists (66/67 modules; module 66 = launch QA) |
| **Connected user journeys** | **~91%** | Profile, GreekMatch, documents, budget on APIs + RLS fixes |
| **Production-ready depth** | **~62%** | CI, smoke scripts, `/api/ready`, migration 025 |
| **Launch-ready** | **~78%** | Ops tooling + polished shell; prod env + pilot smoke remain |

### Overall product complete (recommended single number)

**~82%** — weighted blend:

| Component | Weight | Score | Contribution |
|-----------|--------|-------|--------------|
| Connected journeys | 40% | 91% | 36.4 |
| Routes / APIs exist | 20% | 90% | 18.0 |
| Production depth | 25% | 62% | 15.5 |
| Launch readiness | 15% | 78% | 11.7 |
| **Total** | 100% | — | **~81.6% → ~82%** |

Do not quote route coverage alone as “done” — live Stripe, SMS, and counsel sign-off still gate a full launch.

## By product area

| Area | Connected | Notes |
|------|-----------|--------|
| Auth & onboarding | **~85%** | Signup APIs, org create/join; apply migration 025 |
| Greek chapter ops | **~82%** | Roster, events, tasks, comms, standards, transition |
| Finance (payments ↔ budget ↔ reimbursements) | **~84%** | Budget line RLS; role-gated edits |
| SportsOS | **~70%** | Tryouts, travel, waivers |
| ClubOS | **~66%** | Elections, service hours |
| GreekMatch / social | **~78%** | Candidates API, interactions/messages via REST |
| Reports & exports | **~76%** | CSV via APIs |
| Admin / platform | **~52%** | Platform admin behind allowlist |

## Launch completion sweep (latest)

- Migration `025_completion_rls.sql` — `budget_lines` policies; private `documents` hidden from non-officers
- `/api/profile` — chapter profile scoped by `org_id` (fixes multi-org overwrite)
- `/api/documents/signed-url` — downloads from private storage bucket
- `/api/greekmatch/candidates` — discovery with age/gender/org filters + ranking
- GreekMatch pages use interactions/matches/messages APIs (no client DB for swipes)
- Budget API role checks; line table read-only for non-treasurers
- Dashboard summary API expanded (events, reimbursements, budget)

## Still open (honest backlog)

| Priority | Item |
|----------|------|
| P1 | Apply migrations **001–025** in production; set Vercel env; `curl /api/ready` |
| P2 | Dashboard page still uses server Supabase (summary API ready for refactor) |
| P2 | Feed/documents version uploads still use client storage |
| Launch | Live Stripe checkout, SMS opt-out, terms/privacy counsel review |

## Environment

| Variable | Why |
|----------|-----|
| `SUPABASE_SERVICE_ROLE_KEY` | Org create, budget auto-sync on webhooks |
| Stripe + webhook | Card payments → budget |
| `005_seed.sql` | Demo chapter for onboarding |

## Related docs

- Module checklist: `docs/backlog-status.md`
- Launch: `docs/launch-checklist.md`
