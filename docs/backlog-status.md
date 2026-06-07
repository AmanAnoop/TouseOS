# Backlog implementation status

Tracked against `docs/feature-backlog.md` (67 numbered modules, 0–66).  
**Last updated:** Wave 25 on `cursor/wave25-build-clean-sweep-4a50`.  
**Overall product %:** see `docs/product-status.md` (**~71%** weighted).

## Completion percentages

| Metric | ~% | What it means |
|--------|-----|----------------|
| **Full final build (routes exist)** | **~89%** | Weighted depth across all 67 modules |
| **Connected journeys (realistic)** | **~82%** | End-to-end with active org + APIs |
| **Overall product (weighted)** | **~71%** | Best single stakeholder number |
| Modules at production depth (✅) | **~44%** | 29+ modules with tested officer flows |
| Modules with a route or API | **~99%** | 66/67 |
| Day-to-day chapter ops | **~95%** | Core officer + member workflows |

## Wave 25 (latest)

| Module | Status | Notes |
|--------|--------|-------|
| Sports tryouts | ✅ | `/api/sports/tryouts`; page off client Supabase |
| Transition binders | ✅ | `/api/transition/binders` |
| Engagement / RSVPs | ✅ | `/api/events/rsvps` bulk |
| Attendance points | ✅ | `/api/member-points` |
| Reports exports | ✅ | All CSV types via REST |
| Alumni export | ✅ | `GET /api/alumni` |
| Waivers report | ✅ | `GET /api/waivers` |
| Code cleanup | ✅ | Dead files, API-only pages (see PR #42) |

## Wave 24

Active org in `org-access`, standards/travel/reports wiring, yearbook/GreekMatch guards.

## Product separation

| Product | Org type | Home | Notes |
|---------|----------|------|-------|
| **TouseGreek** | fraternity, sorority | `/dashboard` | Greek-only nav |
| **SportsOS** | `club_sports` | `/sports` | Tryouts, travel, waivers |
| **ClubOS** | `general_org` | `/club` | Elections, service hours |

Run migrations **015 → 024** in Supabase after merge.
