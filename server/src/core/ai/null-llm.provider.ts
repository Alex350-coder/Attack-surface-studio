import { Injectable } from "@nestjs/common";
import {
  LlmProviderUnavailableError,
  type LlmCompletionRequest,
  type LlmCompletionResult,
  type LlmProvider,
} from "./llm-provider.contract";

/**
 * Default provider when no `NVIDIA_API_KEY` is configured (env.schema.ts). Fails loudly and
 * explicitly -- never a silently fabricated answer -- so the assistant module can be wired into
 * `AppModule` and boot cleanly in every environment, including CI, that has no key at all.
 */
@Injectable()
export class NullLlmProvider implements LlmProvider {
  isConfigured(): boolean {
    return false;
  }

  async complete(_request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    throw new LlmProviderUnavailableError("No LLM provider is configured");
  }
}
