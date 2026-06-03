# Launch runbook

Quick reference for taking TouseOS from pilot to production.

## 1. Database

1. Create a Supabase project.
2. Run every file in `supabase/migrations/` in numeric order (**001 → 024**).
3. Optionally run `005_seed.sql` for a demo chapter.
4. Confirm RLS is enabled (migrations apply policies).

## 2. Environment

```bash
cp .env.example .env.local
npm run launch:check   # fails until required vars are set
```

Deploy with the same variables in Vercel/hosting.

### Vercel (fixes `MIDDLEWARE_INVOCATION_FAILED`)

In the Vercel project → **Settings → Environment Variables**, set at minimum:

- `NEXT_PUBLIC_SUPABASE_URL` — `https://YOUR-REF.supabase.co` (Supabase → Settings → API)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — **anon public** (legacy `eyJ...`) or **publishable** (`sb_publishable_...`) key only

Do **not** put `SUPABASE_SERVICE_ROLE_KEY` in any `NEXT_PUBLIC_*` variable — the browser will send it to Supabase Auth and you will get **Invalid API key** on sign-up.

Apply to **Production**, **Preview**, and **Development**. **Redeploy** after saving (`NEXT_PUBLIC_*` is baked in at build time on Vercel).

Verify: open `https://your-domain.com/api/auth/supabase-config` — should show `"ok": true`.

In **Supabase → Authentication → URL configuration**, add redirect URLs (replace with your domain):

- `https://your-domain.com/auth/callback`
- `https://your-domain.com/auth/callback?next=/onboarding`
- `https://your-domain.com/auth/callback?next=/reset-password`

Set **Site URL** to `https://your-domain.com` (or your Vercel URL). For local dev, add `http://localhost:3000/auth/callback` as well.

After deploy:

```bash
curl -s https://your-domain.com/api/ready | jq
```

Expect `"status": "ok"` when required env vars are set.

## 3. Stripe

1. Create products/prices or use Checkout with dynamic amounts (already in app).
2. Webhook: `POST https://your-domain.com/api/stripe/webhook`
   - Events: `checkout.session.completed`, `payment_intent.payment_failed`, `account.updated`
3. Set `STRIPE_WEBHOOK_SECRET` from the Stripe dashboard.
4. Optional Connect: `STRIPE_CONNECT_ENABLED=true` and complete treasurer onboarding in Settings.

## 4. Cron (Vercel)

`vercel.json` schedules four jobs. Set `CRON_SECRET` and ensure Vercel sends:

`Authorization: Bearer <CRON_SECRET>`

## 5. Smoke test

Use `docs/launch-checklist.md`. Minimum path:

- Sign up → create or join org
- Treasurer: create dues → test Checkout
- Create event → RSVP → QR check-in
- Reimbursement submit → approve → confirm budget line updates

## 6. Rollback

- **Payments:** disable Stripe webhook; treasurers can log manual payments.
- **App:** revert Vercel deployment to previous build.
- **Data:** Supabase point-in-time recovery (plan-dependent).

## 7. Support

Document a chapter-facing support email in org Settings contact field and your deployment README.

**Sign-off:** _______________  **Date:** _______________
