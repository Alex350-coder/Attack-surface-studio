import { Global, Module } from "@nestjs/common";
import { db } from "./client";
import { DATABASE_CONNECTION } from "./database.tokens";

/**
 * Exposes the existing Drizzle client (core/database/client.ts) as a Nest provider so every
 * repository can be DI-wired unchanged (Progress.md Phase 2 handoff note).
 */
@Global()
@Module({
  providers: [{ provide: DATABASE_CONNECTION, useValue: db }],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}
