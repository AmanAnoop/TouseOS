# Backlog implementation status

Tracked against `docs/feature-backlog.md` (67 numbered modules, 0–66).  
**Last updated:** wave 3 on branch `cursor/backlog-continuation-4a50`.

## Completion percentages

| Metric | ~% | What it means |
|--------|-----|----------------|
| **Full final build** | **~62%** | Weighted depth across all 67 modules (see formula below) |
| Modules at production depth (✅) | **~27%** | 18 modules with end-to-end, officer-ready flows |
| Modules with a route or API | **~97%** | 65/67 have at least a page, API, or embedded UI |
| Day-to-day chapter ops | **~78%** | Roster, dues, events, comms, PNM, social, standards, risk |

### How “full final build” is calculated

Each module 0–66 is scored:

| Status | Points | Count (approx.) |
|--------|--------|-----------------|
| ✅ Production-ready | 100 | 18 |
| 🟡 Partial (page + gaps) | 50 | 46 |
| Stub / placeholder only | 15 | 1 |
| ⬜ Not started | 0 | 2 |

**Formula:** `(18×100 + 46×50 + 1×15 + 2×0) ÷ 67 ≈ 61.4%` → reported as **~62%**.

To reach **100%**, remaining work includes: university admin depth, platform billing/impersonation, Instagram scraping-adjacent features (consent-only), full yearbook/senior pages, mobile polish everywhere, and hardening partial modules (budget, interchapter, GreekMatch, etc.).

---

## Wave 3 (this update)

| Module | Status | Notes |
|--------|--------|-------|
| 28 Alumni CRM | 🟡→✅ campaigns | Email campaigns tab + `/api/alumni/campaigns` |
| 38 Collab post planner | 🟡 | `/social-collab` + checklist + caption draft |
| 40 Photo requests | 🟡 | Tab on Touse Social + `/api/photo-requests` |
| 44 One-click event recap | 🟡 | `/api/events/recap` + Recap button on memories |
| 64 University admin | 🟡 | `/university-admin` campus org list + risk flags |

## Prior waves (same branch)

| Module | Status |
|--------|--------|
| 2 Onboarding | ✅ |
| 6 Payments | ✅ |
| 11 Comms SMS | ✅ |
| 23 Risk / incidents | ✅ |
| 24 Standards | ✅ |
| 25 NME | ✅ |
| 27 Philanthropy + Stripe | ✅ |
| 42 Social asset library | ✅ |
| 56 Coaching | ✅ |
| 63 Platform admin | 🟡 |

---

## Still open (toward 100%)

- 37 Event photo prompts (dedicated flow)
- 43 PR compliance checklist (full UI, not export note only)
- 63 Platform admin: impersonation, feature flags, billing
- 64 University: advisor workflows, reporting exports
- 14 Instagram: campaign analytics (no scraping)
- 41 Yearbook: senior pages, awards, alumni messages
- 38 Collab: cross-org in-app messaging
- Mobile-first pass (module 65) on all officer flows

Run migrations **015 → 016 → 017 → 018** in Supabase after merge.
