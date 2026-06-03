# Apply Supabase migrations (launch)

Run these SQL files **in order** in the Supabase SQL Editor (or `psql` against your project).

| # | File | Required for launch |
|---|------|---------------------|
| 001 | `migrations/001_schema.sql` | Yes |
| 002–014 | `002` … `014` | Yes |
| 015 | `015_onboarding_rpc.sql` | Yes — create/join org |
| 016–022 | `016` … `022` | Yes |
| 023 | `023_club_org.sql` | Yes if using ClubOS |
| 024 | `024_club_elections_goals.sql` | Yes for elections/service goals |
| 025 | `025_feature_fixes.sql` | Yes — budget lines, payment items, tasks RLS, housing contacts, waiver sign |
| 005 | `005_seed.sql` | Optional demo chapter |

After apply:

1. Enable Auth email templates in Supabase dashboard.
2. Create Storage buckets from `003_storage.sql` policies if not auto-created.
3. Set all env vars from `.env.example` and run `npm run launch:check`.

Verify app: `GET https://your-domain.com/api/ready` → `"status": "ok"`.
