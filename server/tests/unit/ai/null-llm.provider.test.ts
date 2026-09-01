import { describe, expect, it } from "vitest";
import { LlmProviderUnavailableError } from "../../../src/core/ai/llm-provider.contract";
import { NullLlmProvider } from "../../../src/core/ai/null-llm.provider";

describe("NullLlmProvider", () => {
  it("reports itself as unconfigured", () => {
    expect(new NullLlmProvider().isConfigured()).toBe(false);
  });

  it("throws LlmProviderUnavailableError instead of returning a fabricated answer", async () => {
    await expect(new NullLlmProvider().complete({ messages: [] })).rejects.toThrow(LlmProviderUnavailableError);
  });
});
