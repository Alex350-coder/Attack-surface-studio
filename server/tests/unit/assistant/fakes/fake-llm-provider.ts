import type { LlmCompletionRequest, LlmCompletionResult, LlmProvider } from "../../../../src/core/ai/llm-provider.contract";

/** Test double: returns a canned response (or a configured error) without any network I/O. */
export class FakeLlmProvider implements LlmProvider {
  public lastRequest: LlmCompletionRequest | null = null;
  public response: LlmCompletionResult = { content: "" };
  public configured = true;
  public error: Error | null = null;

  isConfigured(): boolean {
    return this.configured;
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- interface requires a Promise-returning signature
  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    this.lastRequest = request;
    if (this.error) {
      throw this.error;
    }
    return this.response;
  }
}
