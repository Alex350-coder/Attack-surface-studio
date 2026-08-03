import { Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { DATABASE_CONNECTION } from "../../core/database/database.tokens";
import type { Database } from "../../core/database/client";

export interface HealthStatus {
  status: "ok" | "degraded";
  database: "up" | "down";
}

/**
 * Liveness/readiness check (DEP-008). Never leaks version numbers, stack traces, or infra
 * details — only a coarse up/down signal, since this endpoint is public and unauthenticated.
 */
@Injectable()
export class HealthService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async check(): Promise<HealthStatus> {
    try {
      await this.db.execute(sql`select 1`);
      return { status: "ok", database: "up" };
    } catch {
      return { status: "degraded", database: "down" };
    }
  }
}
