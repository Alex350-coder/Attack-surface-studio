import { describe, expect, it } from "vitest";
import { validateEnv } from "../../src/core/config/env.schema";

const REQUIRED_VARS = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  APP_DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  JWT_ACCESS_SECRET: "a".repeat(32),
  REDIS_URL: "redis://localhost:6379",
  STORAGE_ROOT: "./data/blobs",
};

describe("validateEnv", () => {
  it("applies defaults for optional variables", () => {
    const config = validateEnv(REQUIRED_VARS);
    expect(config.NODE_ENV).toBe("development");
    expect(config.PORT).toBe(3000);
    expect(config.LOG_LEVEL).toBe("info");
    expect(config.CORS_ORIGINS).toEqual([]);
    expect(config.JWT_ACCESS_TTL).toBe("15m");
    expect(config.JWT_REFRESH_TTL).toBe("7d");
  });

  it("fails fast when a JWT secret is too short", () => {
    expect(() => validateEnv({ ...REQUIRED_VARS, JWT_ACCESS_SECRET: "too-short" })).toThrow(/JWT_ACCESS_SECRET/);
  });

  it("parses a comma-separated CORS_ORIGINS list, trimming whitespace", () => {
    const config = validateEnv({ ...REQUIRED_VARS, CORS_ORIGINS: "https://a.test, https://b.test" });
    expect(config.CORS_ORIGINS).toEqual(["https://a.test", "https://b.test"]);
  });

  it("coerces PORT to a number", () => {
    const config = validateEnv({ ...REQUIRED_VARS, PORT: "4000" });
    expect(config.PORT).toBe(4000);
  });

  it("fails fast with a clear message when a required variable is missing", () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it("fails fast when NODE_ENV is not one of the known values", () => {
    expect(() => validateEnv({ ...REQUIRED_VARS, NODE_ENV: "staging" })).toThrow();
  });

  describe("NVIDIA_API_BASE_URL allow-list (SEC-017)", () => {
    it("accepts the default URL when NVIDIA_API_KEY is set", () => {
      const config = validateEnv({ ...REQUIRED_VARS, NVIDIA_API_KEY: "test-key" });
      expect(config.NVIDIA_API_BASE_URL).toBe("https://integrate.api.nvidia.com/v1");
    });

    it("rejects an off-allow-list host when NVIDIA_API_KEY is set", () => {
      expect(() =>
        validateEnv({
          ...REQUIRED_VARS,
          NVIDIA_API_KEY: "test-key",
          NVIDIA_API_BASE_URL: "https://evil.example.com/v1",
        }),
      ).toThrow(/NVIDIA_API_BASE_URL/);
    });

    it("stays valid with an off-allow-list host when NVIDIA_API_KEY is unset", () => {
      const config = validateEnv({ ...REQUIRED_VARS, NVIDIA_API_BASE_URL: "https://evil.example.com/v1" });
      expect(config.NVIDIA_API_BASE_URL).toBe("https://evil.example.com/v1");
      expect(config.NVIDIA_API_KEY).toBeUndefined();
    });

    it("accepts any subdomain of nvidia.com when NVIDIA_API_KEY is set", () => {
      const config = validateEnv({
        ...REQUIRED_VARS,
        NVIDIA_API_KEY: "test-key",
        NVIDIA_API_BASE_URL: "https://build.nvidia.com/v1",
      });
      expect(config.NVIDIA_API_BASE_URL).toBe("https://build.nvidia.com/v1");
    });
  });
});
