# Backlog implementation status

Tracked against `docs/feature-backlog.md` (67 numbered modules, 0–66).  
**Last updated:** SportsOS / ClubOS separation on branch `cursor/sportsos-clubos-separation-4a50`.

## Completion percentages

| Metric | ~% | What it means |
|--------|-----|----------------|
| **Full final build** | **~83%** | Weighted depth across all 67 modules |
| Modules at production depth (✅) | **~42%** | 28 modules with end-to-end flows |
| Modules with a route or API | **~99%** | 66/67 |
| Day-to-day chapter ops | **~94%** | Core officer + member workflows |

## Product separation (latest)

| Product | Org type | Home | Notes |
|---------|----------|------|-------|
| **TouseGreek** | fraternity, sorority | `/dashboard` | Greek-only nav; PNM, risk, engagement, etc. |
| **SportsOS** | `club_sports` | `/sports` | Sports-only nav + route guard; team features |
| **ClubOS** | `general_org` | `/club` | Club-only nav; membership, service hours, committees |

Central config: `lib/org-product.ts` · Route guard: `ProductRouteGuard` · Migration **023** for ClubOS tables.

## Wave 12 (prior)

PDF yearbook, Stripe reconciliation, launch checklist.

Run migrations **015 → 023** in Supabase after merge.
