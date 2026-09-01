import { DomainError } from "../../../core/http/domain-error";

/**
 * The configured LLM provider couldn't produce a completion -- unconfigured (no API key) or an
 * upstream failure. Mapped to HTTP 503 by the global exception filter: the assistant is a
 * genuinely optional feature, so "temporarily unavailable" is the honest response, never a
 * silently fabricated answer.
 */
export class AssistantProviderUnavailableError extends DomainError {
  readonly code = "ASSISTANT_PROVIDER_UNAVAILABLE";
  readonly httpStatus = 503;
}
