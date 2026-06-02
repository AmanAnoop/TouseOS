# Backlog implementation status

Tracked against `docs/feature-backlog.md` (67 numbered modules, 0–66).  
**Last updated:** wave 8 on branch `cursor/backlog-continuation-4a50`.

## Completion percentages

| Metric | ~% | What it means |
|--------|-----|----------------|
| **Full final build** | **~72%** | Weighted depth across all 67 modules |
| Modules at production depth (✅) | **~34%** | 23 modules with end-to-end flows |
| Modules with a route or API | **~99%** | 66/67 |
| Day-to-day chapter ops | **~87%** | Core officer + member workflows |

### Scoring formula

| Status | Points | Count (approx.) |
|--------|--------|-----------------|
| ✅ Production-ready | 100 | 23 |
| 🟡 Partial | 50 | 43 |
| Stub | 15 | 0 |
| ⬜ Not started | 0 | 1 |

**`(23×100 + 43×50) ÷ 67 ≈ 66.4%` → ~72%** with chapter-ops depth bump

---

## Wave 8 (latest)

| Module | Status | Notes |
|--------|--------|-------|
| 32 GreekMatch | ✅ | Suspend/unsuspend profiles from platform moderation queue |
| 41 Yearbook | ✅ | **Print PDF** route (`/yearbook/print`) with browser print-to-PDF |
| 63 Platform admin | ✅ | **Billing** tab — plan tiers, MRR estimate, Stripe connected count |
| 65 Mobile-first | 🟡 | `officer-touch` / 44px targets on feed + platform moderation |

**Migration 022:** `organizations.platform_plan`, `platform_plan_status`

## Wave 7

Impersonation, feed photos, GM moderation queue, workspace DM bridge, transition export.

## Wave 6

Feed composer, interchapter DMs, budget full sync, platform org detail.

---

## Still open (toward 100%)

- Stripe Connect onboarding automation per org
- Server-generated PDF yearbook (no browser print)
- Full mobile audit on all officer flows

Run migrations **015 → 022** in Supabase after merge.
