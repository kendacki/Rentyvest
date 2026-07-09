# Cloud environment setup

RentyVest uses a **single root `.env` locally** for Go services and scripts. In production, inject the same values through your cloud provider — do not commit `.env`, `.env.local`, or `token.txt`.

## Local development

1. Copy `.env.example` → `.env` at the **repo root**.
2. Start the Go API with root env loaded (see `services/core-api`).
3. Start Next.js from `apps/web` — `npm run dev` syncs `NEXT_PUBLIC_*` into `apps/web/.env.local` automatically.

Manual sync:

```bash
cd apps/web
npm run sync-env
```

## Vercel (Next.js frontend)

1. Import the repo; set **Root Directory** to `apps/web`.
2. Add environment variables in **Project → Settings → Environment Variables**.
3. Set every `NEXT_PUBLIC_*` key from `.env.example` (Production, Preview, Development as needed).
4. Set `NEXT_PUBLIC_CORE_API_URL` to your deployed Go API URL (not `localhost`).

| Variable | Notes |
|----------|--------|
| `NEXT_PUBLIC_PRIVY_APP_ID` | Public; safe in client bundle |
| `NEXT_PUBLIC_SUPABASE_URL` | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (anon key; RLS protects data) |
| `NEXT_PUBLIC_CORE_API_URL` | Public API base URL |

**Do not** add `PRIVY_APP_SECRET`, `DATABASE_URL`, `CANTON_CLIENT_SECRET`, or `SUPABASE_SERVICE_ROLE_KEY` to Vercel unless a server route needs them — keep secrets on the Go backend only.

## Go backend (Railway, Fly.io, Render, Docker, etc.)

Inject the **non-`NEXT_PUBLIC_*`** variables from `.env.example`:

- `DATABASE_URL`, `PRIVY_APP_ID`, `PRIVY_APP_SECRET`
- `SUPABASE_JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Canton / faucet vars (`CANTON_*`, `FAUCET_*`, …)

Example Docker run:

```bash
docker run --env-file .env -p 8080:8080 your-registry/rentyvest-core-api
```

In Kubernetes or managed platforms, map the same keys from a secret store (AWS Secrets Manager, GCP Secret Manager, platform env UI).

## Production checklist

- [ ] Root `.env`, `apps/web/.env.local`, and `token.txt` are **not** in git (see `.gitignore`).
- [ ] Vercel (or host) has all required `NEXT_PUBLIC_*` vars.
- [ ] Go host has database, Privy, Supabase, and Canton secrets.
- [ ] `NEXT_PUBLIC_CORE_API_URL` points to the live API; CORS on core-api allows your frontend origin (`CORS_ALLOWED_ORIGINS`).

## Rotating secrets

Update values in the cloud dashboard (or secret store), redeploy affected services, and refresh local `.env` from `.env.example` templates — never commit real keys.
