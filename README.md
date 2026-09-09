# Attack Surface Studio

A Knowledge Graph platform for security reconnaissance and assessment. It orchestrates
external security tools (Nmap, ffuf, Nuclei, …), normalizes their heterogeneous output into
a single graph model, and turns an engagement's accumulated evidence — scans, manual
findings, screenshots, notes, reports — into one navigable, queryable body of knowledge.

The Knowledge Graph is the product. Security tools are data sources only: every adapter
ultimately produces exactly three things — **Nodes**, **Edges**, and **Metadata** — and
those are what the rest of the platform (UI, reports, AI assistant) reads from. See
[`.claude/Claude.md`](.claude/Claude.md) for the full project philosophy and architecture
docs (`ARCHITECTURE.md`, `DATA_MODEL.md`, `INTEGRATION_SYSTEM.md`, `SECURITY_MODEL.md`,
`Plan.md`).

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript strict, Tailwind v4, React Flow, Zustand, TanStack Query |
| Backend | NestJS, TypeScript, Drizzle ORM, BullMQ (Redis-backed job queue) |
| Database | PostgreSQL 16 |
| Tool execution | `child_process` (local) / `dockerode` (Docker) behind a Tool Adapter registry (`nmap`, `ffuf`, `nuclei`, …) |
| Auth | JWT (short-lived access + rotating refresh), Argon2id password hashing |
| Testing | Vitest + Supertest (integration), Playwright (E2E) |

## Project layout

```
Attack Surface Studio/
├── client/          Next.js frontend (marketing Hero + Graph Engine + authenticated Workspace)
├── server/          NestJS backend (auth, orchestrator, adapters, knowledge graph, reports)
├── db/              Postgres bootstrap scripts (docker-entrypoint-initdb.d)
├── docker-compose.yml   Local Postgres + Redis
└── .claude/         Architecture and planning documentation (source of truth)
```

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/) 9
- Docker (for local Postgres + Redis via `docker-compose`)

## Getting started

1. **Start the datastores**

   ```bash
   cp .env.example .env      # fill in real values before running in anything but local dev
   docker-compose up -d
   ```

2. **Backend** (`server/`)

   ```bash
   cd server
   pnpm install
   cp .env.example .env      # DATABASE_URL, JWT secrets, REDIS_URL, etc. — see file comments
   pnpm migrate
   pnpm start:dev             # API on http://localhost:3001
   pnpm start:worker:dev       # separate process: executes queued tool runs
   ```

3. **Frontend** (`client/`)

   ```bash
   cd client
   pnpm install
   cp .env.example .env       # NEXT_PUBLIC_API_URL=http://localhost:3001
   pnpm dev                    # App on http://localhost:3000
   ```

4. Open [http://localhost:3000](http://localhost:3000). The landing page's "Request access" /
   "Sign in" buttons lead to `/register` and `/login`; once authenticated you land on `/app`.

## Testing

```bash
# Frontend
cd client && pnpm test           # Vitest + Testing Library
cd client && pnpm e2e            # Playwright

# Backend
cd server && pnpm test           # Vitest + Supertest
cd server && pnpm test:coverage
```

Both projects enforce an 80% coverage floor. Adapter tests run against recorded real tool
output fixtures rather than live scans.

## Documentation

Everything beyond this quick-start — vision, data model, security posture, the phased
roadmap, and the development log — lives in [`.claude/`](.claude):

- [`Claude.md`](.claude/Claude.md) — vision, philosophy, stack, standards (start here)
- [`ARCHITECTURE.md`](.claude/ARCHITECTURE.md) — system decomposition
- [`DATA_MODEL.md`](.claude/DATA_MODEL.md) — PostgreSQL schema for the graph
- [`INTEGRATION_SYSTEM.md`](.claude/INTEGRATION_SYSTEM.md) — the Tool Adapter contract
- [`SECURITY_MODEL.md`](.claude/SECURITY_MODEL.md) — cross-cutting security posture
- [`Plan.md`](.claude/Plan.md) — the phased roadmap
- [`Progress.md`](.claude/Progress.md) — development log
- [`Routes.md`](.claude/Routes.md) — routing registry
