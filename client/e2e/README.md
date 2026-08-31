# E2E (Playwright)

`workspace.spec.ts` exercises the critical Phase 9 flow end-to-end: register → login → empty
project list → create a project → open it → the graph container renders → logout → an
unauthenticated visit to `/app` redirects to `/login`.

`project-workflow.spec.ts` extends that setup to cover the Phase 10 surfaces in one session:
launch the harmless `stub` adapter → poll its run to `succeeded` → the graph enriches with its
asset/finding nodes → upload evidence → it's listed → assemble a report from a selected node →
the preview renders it.

`assistant.spec.ts` covers the Phase 11 AI Assistant: create a project → open its Assistant tab →
ask a question. It deliberately accepts two terminal states instead of one, since
`NVIDIA_API_KEY` is a user-provided testing secret that may or may not be set in `server/.env`
locally — a real answer, or the graceful `AssistantProviderUnavailableError` (HTTP 503) message,
are both correct outcomes.

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
