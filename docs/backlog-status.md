# Backlog implementation status

Tracked against `docs/feature-backlog.md` (67 numbered modules).  
**Last updated:** backlog continuation wave (branch `cursor/backlog-continuation-4a50`).

| Status | Meaning |
|--------|---------|
| ✅ | Production-usable core flow |
| 🟡 | Page + partial depth |
| ⬜ | Not started / future |

## Wave completed in this branch

| Module | Status | Notes |
|--------|--------|-------|
| 2 Organization setup | ✅ | `/onboarding` + APIs + RPC `015` |
| 11 Communication hub | 🟡→✅ | Org-wide SMS blast (`/api/comms/sms`) |
| 23 Risk / incidents | ✅ | (from PR #25) + governance votes |
| 25 NME | ✅ | Member module completion API + UI |
| 27 Philanthropy | ✅ | Public `/donate/[slug]`, donations API |
| 42 Social asset library | 🟡 | `social_assets` table + API |
| 56 Coaching tools | ✅ | `coaching_notes` persist practice/game/goals |
| Governance votes | ✅ | Ballot cast + tally + close |
| 6 Payments | 🟡→✅ | Remind includes email (Resend) |

## Overall estimate

| Metric | ~% |
|--------|-----|
| Modules with a route | **65%** |
| Core flows production-ready | **~55%** |
| Full backlog spec complete | **~55%** |

## Still open (high priority)

- 63 Super-admin / multi-tenant platform admin
- 64 University admin dashboard
- 14 Instagram lead capture (consent-only; no scraping)
- 38–41 Social collab / photo requests / recap PDF
- Stripe-native philanthropy (currently manual donation amounts)
- Standards cases full workflow depth
- Alumni newsletters / campaigns

Run migrations **015**, **016**, **017** in Supabase after merge.
