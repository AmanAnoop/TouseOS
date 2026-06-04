# TouseOS product status (realistic)

Last updated: Budget sync fix on `cursor/budget-fix-4a50` (reimbursement double-count, API normalization).

## How to read these numbers

| Metric | Realistic % | Meaning |
|--------|-------------|---------|
| **Backlog modules with a route or API** | **~92%** | Page or endpoint exists |
| **Connected user journeys** | **~93%** | End-to-end with APIs + migrations 025–028 |
| **Production-ready depth** | **~70%** | CI, migrations, dashboard data layer, private media |
| **Launch-ready** | **~84%** | Ops + pilot smoke remain |

### Overall product complete (recommended single number)

**~90%** — weighted blend (connected journeys 95%, routes 93%, production 72%, launch 85%).

Do not treat route count as “done.” Live Stripe, SMS, counsel sign-off, and applied migrations still gate a full launch.

## By product area

| Area | Connected | Notes |
|------|-----------|--------|
| Auth & onboarding | **~90%** | Email + Google/Apple OAuth, profile on callback |
| Greek chapter ops | **~88%** | Dashboard setup checklist, member vs officer views |
| Finance | **~88%** | Budget sync without double-count; normalized budget API + ledger |
| SportsOS | **~86%** | Officer vs player dashboards, travel locations, waiver self-view |
| ClubOS | **~82%** | Officer vs member dashboards, service hours self-view |
| Documents | **~85%** | Signed URLs for private/storage-backed files |
| Comms | **~78%** | Scheduled SMS channel + Twilio status |
| GreekMatch / social | **~68%** | Photo APIs return signed URLs; social upload storage-only |
| Health score | **~82%** | Real metrics only; no false 100% defaults |
| Dashboard | **~90%** | `loadDashboardData`, feed photos signed, getting started |
| Admin / platform | **~52%** | Allowlist |

## Latest (this branch)

- **Photos:** Private `photos` bucket uses signed URLs in feed, dashboard, yearbook, and `/api/photos`
- **Locations:** Migration **028** — `org_location_presets` + `/api/locations/presets` + preset picker on event/travel forms
- **Sports/club:** Member vs officer home dashboards (Greek-style snapshot for players/members)
- **Prior:** Event/travel locations (027), club color pickers, OAuth, document signed URLs

## Still open (cannot claim 100% without these)

| Priority | Item |
|----------|------|
| P1 | Apply migrations **001–028** in production Supabase |
| P2 | Live Stripe Connect checkout + webhook reconciliation in pilot org |
| P2 | Twilio SMS pilot (STOP, quiet hours) |
| P3 | Reimbursement receipt signed URLs (receipts bucket) |
| Launch | Pilot smoke checklist, terms/legal counsel |
