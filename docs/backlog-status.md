# Backlog implementation status

Tracked against `docs/feature-backlog.md` (67 numbered modules, 0–66).  
**Last updated:** Wave 14 (finance interconnect) on branch `cursor/sportsos-clubos-separation-4a50`.  
**Timeline / milestones:** `docs/product-status.md`

## Completion percentages

| Metric | ~% | What it means |
|--------|-----|----------------|
| **Full final build** | **~86%** | Weighted depth across all 67 modules |
| Modules at production depth (✅) | **~42%** | 28 modules with end-to-end flows |
| Modules with a route or API | **~99%** | 66/67 |
| Day-to-day chapter ops | **~94%** | Core officer + member workflows |

## Wave 14 (latest)

| Module | Status | Notes |
|--------|--------|-------|
| Budget ↔ Payments | ✅ | All payment categories map to income lines; `lib/budget-sync.ts` |
| Budget ↔ Reimbursements | ✅ | Paid + approved-unpaid expense lines |
| Live finance ledger | ✅ | `/api/budget/ledger` + Budget UI panel |
| Auto-sync | ✅ | Payments, Stripe webhook, reimbursements, new budgets |
| Housing rent → Budget | ✅ | `/api/housing/rent-charges` → `housing` category |

## Wave 13 (prior)

| Module | Status | Notes |
|--------|--------|-------|
| 47–50 SportsOS roster/travel | ✅ | Travel trip workspace `/travel/[id]`, saved costs, roster, readiness score |
| 47 Sports eligibility | ✅ | `lib/sports-eligibility.ts` + roster summary |
| ClubOS elections | ✅ | `/club/elections`, votes, migration **024** |
| ClubOS service goals | ✅ | Semester hour targets on service hours page |

## Product separation

| Product | Org type | Home | Notes |
|---------|----------|------|-------|
| **TouseGreek** | fraternity, sorority | `/dashboard` | Greek-only nav; PNM, risk, engagement, etc. |
| **SportsOS** | `club_sports` | `/sports` | Sports-only nav + route guard; team features |
| **ClubOS** | `general_org` | `/club` | Club-only nav; membership, service hours, committees |

Central config: `lib/org-product.ts` · Route guard: `ProductRouteGuard` · Migration **023** for ClubOS tables.

## Wave 12 (prior)

PDF yearbook, Stripe reconciliation, launch checklist.

Run migrations **015 → 024** in Supabase after merge.
