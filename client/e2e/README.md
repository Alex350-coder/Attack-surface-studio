# E2E (Playwright)

`workspace.spec.ts` exercises the critical Phase 9 flow end-to-end: register → login → empty
project list → create a project → open it → the graph container renders → logout → an
unauthenticated visit to `/app` redirects to `/login`.

## Stack required

This suite talks to the real backend, not a mock. Before running it:

1. **Postgres + Redis**: `docker compose up -d postgres redis` (repo root).
2. **Migrations**: `pnpm --dir server migrate`.
3. **Backend**: `pnpm --dir server start:dev` (needs `PORT=3001` in `server/.env` — the client's
   `NEXT_PUBLIC_API_URL` default, `client/.env.example`, points at `http://localhost:3001`).
4. **Client**: left to Playwright's own `webServer` config (`pnpm dev`, port 3000) — no manual
   step needed unless `E2E_SKIP_WEBSERVER` is set.

## Running

```bash
pnpm --dir client exec playwright test
```

Each run registers a fresh, randomly-suffixed account, so it is safe to run repeatedly against
a persistent dev database without manual cleanup.
