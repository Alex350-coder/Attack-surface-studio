import { z } from "zod";

/**
 * SEC-017 hardening: `NVIDIA_API_BASE_URL` is fed directly into the OpenAI-compatible client's
 * `baseURL` (nvidia-llm.provider.ts). An operator-controlled env var is low risk, but an
 * unrestricted `z.string().url()` would let a compromised or misconfigured deployment point the
 * AI Assistant's API key and every prompt/response at an arbitrary host (SSRF/exfiltration).
 * Restrict it to NVIDIA's own domain.
 */
const NVIDIA_API_BASE_URL_ALLOWED_HOST_SUFFIX = ".nvidia.com";

function isAllowedNvidiaApiBaseUrl(value: string): boolean {
  try {
    const { hostname } = new URL(value);
    return hostname === "nvidia.com" || hostname.endsWith(NVIDIA_API_BASE_URL_ALLOWED_HOST_SUFFIX);
  } catch {
    return false;
  }
}

/**
 * Fail-fast startup contract (BE-022, SEC-017): the process must refuse to boot rather than run
 * with an invalid or missing configuration value.
 */
const baseEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  APP_DATABASE_URL: z.string().min(1, "APP_DATABASE_URL is required"),
  // Backs the BullMQ job queue (ADR-003) shared by the API process (producer) and the
  // separate worker process (consumer) -- see modules/orchestrator.
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  // Local filesystem root for content-addressable blob storage (core/storage) -- raw tool
  // output and evidence file bytes (DATA_MODEL.md `raw_outputs`/`evidence_files`). Must live
  // outside any web-served directory (SEC-051).
  STORAGE_ROOT: z.string().min(1, "STORAGE_ROOT is required"),
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
  // Global request-rate limit (ThrottlerGuard, app.module.ts). Configurable so integration
  // suites that legitimately poll far more often than a real client can raise the ceiling
  // without weakening it for the deployed API.
  THROTTLE_TTL_MS: z.coerce.number().int().positive().default(60_000),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),
  // AI Assistant (Phase 11) -- deliberately optional, unlike every other secret above. The
  // assistant is a genuinely optional feature: when unset, AssistantModule wires a
  // NullLlmProvider that returns a graceful 503 instead of a silent fake answer, so every
  // existing suite that boots AppModule keeps booting without these. See SECURITY_MODEL.md
  // "AI Assistant security" for why this is a documented deviation from fail-fast-required.
  NVIDIA_API_KEY: z.string().min(1).optional(),
  // Defaulted here (not with a `??` fallback at the call site) so the one canonical default lives
  // in the schema, same as NVIDIA_API_BASE_URL below -- was previously duplicated between
  // assistant.module.ts and .env.example.
  NVIDIA_MODEL_ID: z.string().min(1).default("meta/llama-3.3-70b-instruct"),
  NVIDIA_API_BASE_URL: z.string().url().default("https://integrate.api.nvidia.com/v1"),
});

/**
 * The host allow-list only applies once the assistant feature is actually configured
 * (`NVIDIA_API_KEY` set) -- preserving the "optional feature still boots gracefully" contract
 * for the common case where the whole feature is unset (see NVIDIA_API_KEY's comment above).
 */
export const envSchema = baseEnvSchema.superRefine((config, ctx) => {
  if (config.NVIDIA_API_KEY && !isAllowedNvidiaApiBaseUrl(config.NVIDIA_API_BASE_URL)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["NVIDIA_API_BASE_URL"],
      message: `NVIDIA_API_BASE_URL must be a *${NVIDIA_API_BASE_URL_ALLOWED_HOST_SUFFIX} host when NVIDIA_API_KEY is set`,
    });
  }
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
