/**
 * Base for domain-level errors raised by services/repositories. The global exception filter
 * maps these to HTTP status codes without leaking implementation detail to the client.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {
  readonly code = "NOT_FOUND";
  readonly httpStatus = 404;
}

export class ValidationError extends DomainError {
  readonly code = "VALIDATION_ERROR";
  readonly httpStatus = 400;
}

export class ConflictError extends DomainError {
  readonly code = "CONFLICT";
  readonly httpStatus = 409;
}

export class UnauthorizedError extends DomainError {
  readonly code = "UNAUTHORIZED";
  readonly httpStatus = 401;
}

export class ForbiddenError extends DomainError {
  readonly code = "FORBIDDEN";
  readonly httpStatus = 403;
}
