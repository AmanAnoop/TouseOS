# Backlog implementation status

Tracked against `docs/feature-backlog.md` (67 numbered modules, 0–66).  
**Last updated:** wave 7 on branch `cursor/backlog-continuation-4a50`.

## Completion percentages

| Metric | ~% | What it means |
|--------|-----|----------------|
| **Full final build** | **~70%** | Weighted depth across all 67 modules |
| Modules at production depth (✅) | **~33%** | 22 modules with end-to-end flows |
| Modules with a route or API | **~99%** | 66/67 |
| Day-to-day chapter ops | **~86%** | Core officer + member workflows |

### Scoring formula

| Status | Points | Count (approx.) |
|--------|--------|-----------------|
| ✅ Production-ready | 100 | 22 |
| 🟡 Partial | 50 | 44 |
| Stub | 15 | 0 |
| ⬜ Not started | 0 | 1 |

**`(22×100 + 44×50) ÷ 67 ≈ 65.7%` → ~70%** with chapter-ops depth bump

---

## Wave 7 (latest)

| Module | Status | Notes |
|--------|--------|-------|
| 8 Chapter feed | ✅ | Photo posts via feed composer + `/api/feed/photo` |
| 28 ExecLink | ✅ | Workspace chat mirrors to interchapter DMs; `messages.thread_id` → TEXT (021) |
| 32 GreekMatch | 🟡→✅ | Platform moderation queue (reports tab) |
| 45 Officer transition | 🟡→✅ | HTML export from binder detail |
| 63 Platform admin | ✅ | View-as-chapter impersonation (env-gated) + moderation |

**Env:** `PLATFORM_IMPERSONATION_ENABLED=true` (requires `PLATFORM_ADMIN_EMAILS`)

## Wave 6

Feed composer, interchapter DMs, budget full sync, platform org detail modal.

## Wave 5

Photo prompt albums, yearbook export, PR compliance tab, mobile polish.

---

## Still open (toward 100%)

- Platform billing / Stripe Connect for tenants
- True PDF yearbook
- GreekMatch profile suspension from moderation queue
- Deep mobile polish on all officer flows

Run migrations **015 → 021** in Supabase after merge.
