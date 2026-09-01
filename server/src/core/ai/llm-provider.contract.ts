/**
 * Provider-agnostic chat-completion boundary (mirrors the `BlobStorage` abstraction, ADR-014).
 * The assistant module never imports a concrete SDK directly -- swapping the backing model
 * provider is a one-file change behind this interface (ADR-015).
 */
export const LLM_PROVIDER = Symbol("LLM_PROVIDER");

export interface LlmMessage {
  /** No "tool"/"function" role exists on purpose -- the model is never given tool-calling
   * capability, so there is no code path from a completion to an executed action (SEC-0xx
   * no-autonomous-execution). */
  role: "system" | "user";
  content: string;
}

export interface LlmCompletionRequest {
  messages: LlmMessage[];
  maxOutputTokens?: number;
}

export interface LlmCompletionResult {
  content: string;
}

/**
 * Raised by a provider implementation when a completion can't be produced (unconfigured,
 * upstream failure, etc). Deliberately a plain `Error`, not a `DomainError` -- `core/ai` has no
 * dependency on any module. Callers (assistant.service.ts) translate this into the domain-level
 * `AssistantProviderUnavailableError` (HTTP 503) that the exception filter understands.
 */
export class LlmProviderUnavailableError extends Error {}

export interface LlmProvider {
  /** True only when the provider has everything it needs (e.g. an API key) to actually call out. */
  isConfigured(): boolean;
  complete(request: LlmCompletionRequest): Promise<LlmCompletionResult>;
}
