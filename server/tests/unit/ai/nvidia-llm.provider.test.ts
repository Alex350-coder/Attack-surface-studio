import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: createMock } },
  })),
}));

import { LlmProviderUnavailableError } from "../../../src/core/ai/llm-provider.contract";
import { NvidiaLlmProvider } from "../../../src/core/ai/nvidia-llm.provider";

describe("NvidiaLlmProvider", () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it("is unconfigured when the api key is empty", () => {
    const provider = new NvidiaLlmProvider({ apiKey: "", modelId: "m", baseUrl: "https://x" });
    expect(provider.isConfigured()).toBe(false);
  });

  it("rejects immediately without calling the sdk when unconfigured", async () => {
    const provider = new NvidiaLlmProvider({ apiKey: "", modelId: "m", baseUrl: "https://x" });
    await expect(provider.complete({ messages: [] })).rejects.toThrow(LlmProviderUnavailableError);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("returns the completion content on success, with no tool-calling parameter sent", async () => {
    createMock.mockResolvedValue({ choices: [{ message: { content: "hello" } }] });
    const provider = new NvidiaLlmProvider({ apiKey: "nvapi-x", modelId: "m", baseUrl: "https://x" });

    const result = await provider.complete({ messages: [{ role: "user", content: "hi" }] });

    expect(result.content).toBe("hello");
    const callArgs = createMock.mock.calls[0]![0] as Record<string, unknown>;
    expect(callArgs.tools).toBeUndefined();
    expect(callArgs.function_call).toBeUndefined();
    expect(callArgs.model).toBe("m");
  });

  it("wraps an empty completion as provider-unavailable", async () => {
    createMock.mockResolvedValue({ choices: [{ message: { content: "" } }] });
    const provider = new NvidiaLlmProvider({ apiKey: "nvapi-x", modelId: "m", baseUrl: "https://x" });

    await expect(provider.complete({ messages: [] })).rejects.toThrow(LlmProviderUnavailableError);
  });

  it("wraps an upstream sdk failure without leaking its message", async () => {
    createMock.mockRejectedValue(new Error("leaked-upstream-detail: secret-key-abc"));
    const provider = new NvidiaLlmProvider({ apiKey: "nvapi-x", modelId: "m", baseUrl: "https://x" });

    await expect(provider.complete({ messages: [] })).rejects.toThrow(LlmProviderUnavailableError);
    try {
      await provider.complete({ messages: [] });
    } catch (error) {
      expect((error as Error).message).not.toContain("secret-key-abc");
    }
  });
});
