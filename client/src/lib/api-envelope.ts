/**
 * Mirrors server/src/core/http/response-envelope.ts -- the wire shape of every API response.
 * Shared by the browser-side API client (api-client.ts) and the server-side BFF route handlers
 * (app/api/auth/*), which adopt the same envelope for their own responses so the rest of the
 * app only ever learns one response shape.
 */
export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: { total: number; page: number; pageSize: number };
}

export interface ApiErrorEnvelope {
  success: false;
  error: { message: string; code: string; correlationId: string };
}

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

/** A safe-to-display API failure -- never carries a raw Response or backend stack trace (FE-018). */
export class ApiError extends Error {
  readonly code: string;
  readonly correlationId: string;
  readonly status: number;

  constructor(status: number, envelope: ApiErrorEnvelope) {
    super(envelope.error.message);
    this.name = "ApiError";
    this.code = envelope.error.code;
    this.correlationId = envelope.error.correlationId;
    this.status = status;
  }
}
