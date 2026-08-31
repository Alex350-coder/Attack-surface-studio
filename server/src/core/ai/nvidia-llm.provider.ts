import OpenAI from "openai";
import {
  LlmProviderUnavailableError,
  type LlmCompletionRequest,
  type LlmCompletionResult,
  type LlmProvider,
} from "./llm-provider.contract";

export interface NvidiaLlmProviderConfig {
  apiKey: string;
  modelId: string;
  baseUrl: string;
}

/**
 * NVIDIA NIM exposes an OpenAI-compatible chat-completions endpoint, so the `openai` SDK is used
 * as a generic HTTP client pointed at NVIDIA's `baseURL` -- no NVIDIA-specific SDK needed
 * (ADR-015). The API key never appears in a log line or thrown error message (SEC-016/SEC-020).
 */
export class NvidiaLlmProvider implements LlmProvider {
  private readonly client: OpenAI;

  constructor(private readonly config: NvidiaLlmProviderConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl });
  }

  isConfigured(): boolean {
    return this.config.apiKey.length > 0;
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    if (!this.isConfigured()) {
      throw new LlmProviderUnavailableError("NVIDIA API key is not configured");
    }

    try {
      // No `tools`/`function_call` parameter is ever passed -- the model can only emit text
      // (Claude.md security posture: no autonomous execution).
      const response = await this.client.chat.completions.create({
        model: this.config.modelId,
        messages: request.messages,
        max_tokens: request.maxOutputTokens ?? 1024,
        temperature: 0.2,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new LlmProviderUnavailableError("The AI provider returned an empty completion");
      }
      return { content };
    } catch (error) {
      if (error instanceof LlmProviderUnavailableError) {
        throw error;
      }
      // Never surface upstream error detail (may include request payload echoes) to the caller.
      throw new LlmProviderUnavailableError("The AI provider request failed");
    }
  }
}
