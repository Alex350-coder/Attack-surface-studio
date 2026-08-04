import { Global, Module } from "@nestjs/common";
import { scopedDb } from "./rls";
import { DATABASE_CONNECTION } from "./database.tokens";

/**
 * Exposes a request-scope-aware Drizzle client as a Nest provider so every repository can be
 * DI-wired unchanged (Progress.md Phase 2 handoff note). Provides `scopedDb` (core/database/rls.ts),
 * not the raw pooled client directly -- repositories are constructed once as singletons, so
 * injecting the plain pool would mean every query permanently bypasses the per-request RLS
 * transaction `RlsContextMiddleware` sets up (SECURITY_MODEL.md §4, ARCHITECTURE.md ADR-009).
 * `scopedDb` transparently falls back to the plain pooled client for unauthenticated
 * requests/scripts/tests that never entered `runWithUserContext`.
 */
@Global()
@Module({
  providers: [{ provide: DATABASE_CONNECTION, useValue: scopedDb }],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}
