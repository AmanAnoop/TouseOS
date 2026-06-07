# Integration keys (one folder)

Put **all** deployment and local API keys in a single file here so you never hunt through the repo.

## Quick start

1. Copy the template:
   ```bash
   cp config/keys/keys.env.example config/keys/keys.env
   ```
2. Open `config/keys/keys.env` and fill in every key you use.
3. Restart the dev server (`npm run dev`) or redeploy.

The app loads `config/keys/keys.env` automatically at startup (see `next.config.ts`). Values already set in `.env.local` or Vercel env **take precedence**.

## Security

| File | Commit to Git? |
|------|----------------|
| `keys.env.example` | Yes — template only, no secrets |
| `keys.env` | **Never** — gitignored |

For production, prefer Vercel/host environment variables. Use this folder for local dev or when you want one obvious place to paste keys on a VM.

## Validate

```bash
npm run keys:check
```

## Platform admin UI

Officers can also save encrypted keys in **Settings → API keys** (platform admin). Host env and `config/keys/keys.env` are checked first.
