import {
  Catch,
  HttpException,
  HttpStatus,
  Inject,
  type ArgumentsHost,
  type ExceptionFilter,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { PinoLoggerService } from "../logging/pino-logger.service";
import { DomainError } from "./domain-error";
import { errorEnvelope } from "./response-envelope";

/**
 * Maps every thrown error to a safe, structured envelope (never leaking stack traces, SQL, or
 * internal paths to the client) while logging the full detail server-side with the request's
 * correlation id (SEC-049).
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(@Inject(PinoLoggerService) private readonly logger: PinoLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId = request.correlationId ?? "unknown";

    const { status, message, code } = this.resolve(exception);

    this.logger.error(
      `Unhandled error on ${request.method} ${request.url}: ${message}`,
      exception instanceof Error ? exception.stack : undefined,
      correlationId,
    );

    response.status(status).json(errorEnvelope(message, code, correlationId));
  }

  private resolve(exception: unknown): { status: number; message: string; code: string } {
    if (exception instanceof DomainError) {
      return { status: exception.httpStatus, message: exception.message, code: exception.code };
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const message =
        typeof response === "string" ? response : ((response as { message?: string }).message ?? exception.message);
      return { status: exception.getStatus(), message, code: "HTTP_ERROR" };
    }

    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: "Internal server error", code: "INTERNAL_ERROR" };
  }
}
