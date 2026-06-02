# Backlog implementation status

Tracked against `docs/feature-backlog.md` (67 numbered modules).  
**Last updated:** backlog wave 2 (branch `cursor/backlog-continuation-4a50`).

| Status | Meaning |
|--------|---------|
| ✅ | Production-usable core flow |
| 🟡 | Page + partial depth |
| ⬜ | Not started / future |

## Wave completed in this branch

| Module | Status | Notes |
|--------|--------|-------|
| 2 Organization setup | ✅ | `/onboarding` + APIs + RPC `015` |
| 11 Communication hub | ✅ | Org-wide SMS blast |
| 23 Risk / incidents | ✅ | Incidents API + governance votes |
| 25 NME | ✅ | Module completion API + UI |
| 27 Philanthropy | ✅ | Public donate + **Stripe Checkout** + manual logging |
| 42 Social asset library | ✅ | API + **library UI**, templates, copy → calendar |
| 56 Coaching tools | ✅ | `coaching_notes` |
| 63 Platform admin | 🟡 | `/platform-admin` org list (env-gated) |
| Standards | 🟡→✅ | Sanctions, restorative actions, audit on create/update |
| Governance votes | ✅ | Ballot cast + close |
| 6 Payments | ✅ | Remind includes email |

## Overall estimate

| Metric | ~% |
|--------|-----|
| Modules with a route | **68%** |
| Core flows production-ready | **~58%** |
| Full backlog spec complete | **~58%** |

## Still open (high priority)

- 64 University admin dashboard
- 14 Instagram lead capture (consent-only; no scraping)
- 38–41 Social collab / photo requests / recap PDF
- Platform admin: impersonation, feature flags, billing
- Alumni newsletters / campaigns
- Regal UI PR #24 merge if still open

Run migrations **015**, **016**, **017** in Supabase after merge.
