# Apply Supabase migrations (launch)

Run these SQL files **in strict numeric order** in the Supabase SQL Editor (or `psql` against your project).

| # | File | Required for launch |
|---|------|---------------------|
| 001 | `migrations/001_schema.sql` | Yes |
| 002 | `migrations/002_greekmatch.sql` | Yes |
| 003 | `migrations/003_storage.sql` | Yes — storage buckets / policies |
| 004 | `migrations/004_notifications.sql` | Yes |
| 005 | `migrations/005_seed.sql` | **Deprecated** — no-op; demo chapter removed |
| 006 | `migrations/006_rollout_enhancements.sql` | Yes — reimbursement approval columns |
| 007 | `migrations/007_phase2_workspace.sql` | Yes |
| 008 | `migrations/008_phase3_engagement.sql` | Yes |
| 009 | `migrations/009_phase4_sports_interchapter_push.sql` | Yes |
| 010 | `migrations/010_notification_preferences.sql` | Yes |
| 011 | `migrations/011_payment_plans_rls.sql` | Yes |
| 012 | `migrations/012_parent_pay_hardship_recurring.sql` | Yes |
| 013 | `migrations/013_rush_interest_matcher.sql` | Yes |
| 014 | `migrations/014_pnm_relationships_rls.sql` | Yes |
| 015 | `migrations/015_onboarding_rpc.sql` | Yes — create/join org |
| 016 | `migrations/016_feature_fixes_rls.sql` | Yes |
| 017 | `migrations/017_backlog_wave.sql` | Yes |
| 018 | `migrations/018_wave3_social_alumni.sql` | Yes |
| 019 | `migrations/019_wave4_prompts_yearbook.sql` | Yes |
| 020 | `migrations/020_wave5_photo_album_link.sql` | Yes |
| 021 | `migrations/021_wave7_messages_thread.sql` | Yes |
| 022 | `migrations/022_wave8_platform_billing.sql` | Yes — `organizations.platform_plan` |
| 023 | `migrations/023_club_org.sql` | Yes if using ClubOS |
| 024 | `migrations/024_club_elections_goals.sql` | Yes for elections/service goals |
| 025 | `migrations/025_feature_fixes.sql` | Yes — budget lines, payment items, tasks RLS |
| 026 | `migrations/026_task_assignees_health.sql` | Yes — multi-assignee tasks |
| 027 | `migrations/027_travel_locations.sql` | Yes — SportsOS trip venues |
| 028 | `migrations/028_org_location_presets.sql` | Yes — saved venue presets |
| 029 | `migrations/029_budget_rls_archive.sql` | Yes — budget_lines RLS, archive |
| 030 | `migrations/030_tasks_recurring_columns.sql` | Yes — recurring tasks, attachments |
| 031 | `migrations/031_platform_settings.sql` | Yes — platform feature flags |
| 032 | `migrations/032_club_service_hours_org.sql` | Yes for ClubOS service hours |
| 033 | `migrations/033_remove_demo_org.sql` | Optional — deletes legacy demo org if present |
| 034 | `migrations/034_finance_layer.sql` | Yes — Plaid, finance_transactions, Stripe idempotency |
| 035 | `migrations/035_batch6_travel_standards.sql` | Yes — travel standards batch |
| 036 | `migrations/036_batch7_itinerary_subsidy.sql` | Yes — itinerary subsidy |
| 037 | `migrations/037_batch8_vendor_usage.sql` | Yes — vendor usage tracking |
| 038 | `migrations/038_batch9_collab_approvals.sql` | Yes — collab approvals |
| 039 | `migrations/039_batch10_study_hours.sql` | Yes — study hours table |
| 040 | `migrations/040_feature_repairs.sql` | Yes — Greek travel tables, event poll RLS |
| 041 | `migrations/041_injury_type.sql` | Yes — injury type on reports |
| 042 | `migrations/042_repairs_metadata.sql` | Yes — governance/risk metadata |
| 043 | `migrations/043_coaching_availability.sql` | Yes — coaching availability |
| 044 | `migrations/044_greek_travel_finance.sql` | Yes — Greek travel finance linkage |
| 045 | `migrations/045_governance_expected_attendees.sql` | Yes |
| 046 | `migrations/046_wave2_features.sql` | Yes |
| 047 | `migrations/047_bugfix_rls.sql` | Yes |
| 048 | `migrations/048_wave3_photos_albums.sql` | Yes |
| 049 | `migrations/049_wave4_completion.sql` | Yes |
| 050 | `migrations/050_sidebar_preferences.sql` | Yes — editable sidebar preferences |
| 051 | `migrations/051_chapter_os_fixes.sql` | Yes — task points, hardship RLS |
| 052 | `migrations/052_chapter_os_wave3.sql` | Yes — document folders, housing rent |
| 053 | `migrations/053_chapter_os_wave4_pnm_rsvp.sql` | Yes — PNM RSVP tokens |
| 054 | `migrations/054_ux_bugfixes.sql` | Yes — task points, Greek org discovery |
| 055 | `migrations/055_pilot_fixes.sql` | Yes — PNM eval RLS, photo albums |
| 056 | `migrations/056_schema_repairs.sql` | Yes — idempotent schema repairs |
| 057 | `migrations/057_finance_officer_rls.sql` | Yes — `is_org_finance_officer` + finance RLS repair |
| 058 | `migrations/058_photo_notify_vp.sql` | Yes — VP notified on photo approval requests |

**If migration 034 failed partway** (error: `function is_org_finance_officer does not exist`), run `057_finance_officer_rls.sql` to repair finance policies.

After apply:

1. Enable Auth email templates in Supabase dashboard.
2. Create Storage buckets from `003_storage.sql` policies if not auto-created.
3. Set all env vars from `config/keys/keys.env.example` and run `npm run launch:check`.

Verify app: `GET https://your-domain.com/api/ready` → `"status": "ok"`.
