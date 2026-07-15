# Cloud environment setup

RentyVest uses a **single root `.env` locally** for Go services and scripts. In production, inject the same values through your cloud provider — do not commit `.env`, `.env.local`, or `token.txt`.

## Local development

1. Copy `.env.example` → `.env` at the **repo root**.
2. Install dependencies from the monorepo root:
   ```bash
   pnpm install
   ```
3. Start all JS workspaces (Next.js):
   ```bash
   pnpm dev
   ```
   Or only the web app: `pnpm turbo dev --filter=web`
4. Start the Go API separately from `services/core-api` (not part of the pnpm workspace).
5. Next.js syncs `NEXT_PUBLIC_*` into `apps/web/.env.local` via `predev` / `prebuild`.

Manual sync:

```bash
cd apps/web
npm run sync-env
```

## Vercel (Next.js frontend)

1. Import the repo; set **Root Directory** to `apps/web`.
2. Set **Install Command** to `pnpm install` (from repo root — Vercel detects the monorepo).
3. Set **Build Command** to `cd ../.. && pnpm turbo build --filter=web` or use Vercel's Turborepo preset with root at repo root and output `apps/web/.next`.
4. Add environment variables in **Project → Settings → Environment Variables**.
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

### Railway (core-api)

Railpack cannot auto-detect this monorepo from `/` because `go.mod` lives in `services/core-api/`.

**Recommended setup**

1. Create a Railway service from [kendacki/Rentyvest](https://github.com/kendacki/Rentyvest).
2. Open **Service → Settings → Root Directory** and set:
   ```
   services/core-api
   ```
3. Under **Settings → Config-as-code**, point to:
   ```
   /services/core-api/railway.toml
   ```
4. Add all Go env vars from `.env.example` in **Variables** (never commit `.env`).
5. Set `CORS_ALLOWED_ORIGINS` to your Vercel frontend URL, e.g. `https://rentyvest.vercel.app`.
6. Deploy — Railway builds via `services/core-api/Dockerfile`.

**Alternative (repo root build):** leave Root Directory empty; the root `Dockerfile` and `railway.toml` build `services/core-api` from the monorepo root.

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
