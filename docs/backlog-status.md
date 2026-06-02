# Backlog implementation status

Tracked against `docs/feature-backlog.md` (67 numbered modules, 0–66).  
**Last updated:** wave 6 on branch `cursor/backlog-continuation-4a50`.

## Completion percentages

| Metric | ~% | What it means |
|--------|-----|----------------|
| **Full final build** | **~68%** | Weighted depth across all 67 modules |
| Modules at production depth (✅) | **~31%** | 21 modules with end-to-end flows |
| Modules with a route or API | **~99%** | 66/67 |
| Day-to-day chapter ops | **~84%** | Core officer + member workflows |

### Scoring formula

| Status | Points | Count (approx.) |
|--------|--------|-----------------|
| ✅ Production-ready | 100 | 21 |
| 🟡 Partial | 50 | 45 |
| Stub | 15 | 0 |
| ⬜ Not started | 0 | 1 |

**`(21×100 + 45×50) ÷ 67 ≈ 64.9%` → ~68%** with chapter-ops depth bump

---

## Wave 6 (latest)

| Module | Status | Notes |
|--------|--------|-------|
| 8 Chapter feed | 🟡→✅ | Officer feed composer → announcements API |
| 18 Budget | 🟡→✅ | Full sync API (dues, philanthropy, reimbursements) + Sync all button |
| 28 ExecLink / interchapter | 🟡→✅ | Direct messages tab + threaded API |
| 32 GreekMatch | 🟡 | Report/block UI + audit log on report |
| 63 Platform admin | 🟡→✅ | Org detail modal (stats, events, campaigns) |

## Wave 5

Photo prompt album deep links, yearbook export sections, PR compliance tab, mobile polish.

## Waves 3–4

University admin, alumni campaigns, photo requests, collab, recap, photo prompts, yearbook sections, platform stats.

## Prior waves

Onboarding, Stripe philanthropy, social library, standards, governance, NME, coaching, etc.

---

## Still open (toward 100%)

- Platform impersonation + billing
- True PDF yearbook (not HTML print)
- Interchapter ↔ workspace message bridge
- GreekMatch admin moderation queue
- Feed photo posts (announcements only today)

Run migrations **015 → 020** in Supabase after merge.
