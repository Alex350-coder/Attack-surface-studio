import { z } from "zod";

/**
 * Fail-fast startup contract (BE-022, SEC-017): the process must refuse to boot rather than run
 * with an invalid or missing configuration value.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  APP_DATABASE_URL: z.string().min(1, "APP_DATABASE_URL is required"),
  // Backs the BullMQ job queue (ADR-003) shared by the API process (producer) and the
  // separate worker process (consumer) -- see modules/orchestrator.
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  CORS_ORIGINS: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    ),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  // Refresh tokens are opaque CSPRNG values (see sessions.ts), not JWTs -- only the access
  // token is signed, so only JWT_ACCESS_SECRET is needed.
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("7d"),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  return result.data;
}
