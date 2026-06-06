# Apply Supabase migrations (launch)

Run these SQL files **in order** in the Supabase SQL Editor (or `psql` against your project).

| # | File | Required for launch |
|---|------|---------------------|
| 001 | `migrations/001_schema.sql` | Yes |
| 002–014 | `002` … `014` | Yes |
| 015 | `015_onboarding_rpc.sql` | Yes — create/join org |
| 016–021 | `016` … `021` | Yes |
| 022 | `022_wave8_platform_billing.sql` | Yes — `organizations.platform_plan` |
| 023 | `023_club_org.sql` | Yes if using ClubOS |
| 024 | `024_club_elections_goals.sql` | Yes for elections/service goals |
| 025 | `025_feature_fixes.sql` | Yes — budget lines, payment items, tasks RLS, housing contacts, waiver sign |
| 026 | `026_task_assignees_health.sql` | Yes — multi-assignee tasks, task assignee RLS |
| 027 | `027_travel_locations.sql` | Yes — SportsOS trip venue, address, departure/meeting points |
| 028 | `028_org_location_presets.sql` | Yes — saved venue presets for events and travel |
| 029 | `029_budget_rls_archive.sql` | Yes — budget_lines RLS fix, archive budgets, delete support |
| 030 | `030_tasks_recurring_columns.sql` | Yes — `is_recurring`, attachments on tasks |
| 031 | `031_platform_settings.sql` | Yes — platform feature flags (`platform_settings`) |
| 032 | `032_club_service_hours_org.sql` | Yes for ClubOS — `organization_served`, `service_type` on service hours |
| 005 | `005_seed.sql` | **Deprecated** — no-op; demo chapter removed |
| 033 | `033_remove_demo_org.sql` | Optional — deletes legacy demo org if present |
| 034 | `034_finance_layer.sql` | Yes — Plaid connections, unified finance_transactions, finance_org_settings, Stripe webhook idempotency |
| 040 | `040_feature_repairs.sql` | Yes — Greek travel tables, event poll RLS |
| 041 | `041_injury_type.sql` | Yes — injury type on injury reports |
| 042 | `042_repairs_metadata.sql` | Yes — governance/risk metadata columns |
| 043 | `043_coaching_availability.sql` | Yes — coaching availability note type |
| 044 | `044_greek_travel_finance.sql` | Yes — Greek travel locations, per-member cost, payment linkage, coaching member_id |
| 045–049 | `045` … `049` | Yes — sidebar prefs, wave 2 features, engagement, etc. (apply in numeric order) |
| 050 | `050_sidebar_prefs.sql` | Yes — editable sidebar preferences |
| 051 | `051_chapter_os_fixes.sql` | Yes — task points, document folders, hardship RLS, standards panel |
| 052 | `052_chapter_os_wave3.sql` | Yes — document folder RLS, per-member housing rent due day |
| 053 | `053_chapter_os_wave4_pnm_rsvp.sql` | Yes — PNM event invite RSVP tokens and check-in |
| 054 | `054_ux_bugfixes.sql` | Yes — task point recipient mode, Greek org discovery for interchapter |
| 055 | `055_pilot_fixes.sql` | Yes — PNM eval RLS, photo albums created_by, photo request targets, task open rewards, dashboard layout |
| 039 | `039_batch10_study_hours.sql` | Yes — study hours table (apply if missing) |

After apply:

1. Enable Auth email templates in Supabase dashboard.
2. Create Storage buckets from `003_storage.sql` policies if not auto-created.
3. Set all env vars from `.env.example` and run `npm run launch:check`.

Verify app: `GET https://your-domain.com/api/ready` → `"status": "ok"`.
