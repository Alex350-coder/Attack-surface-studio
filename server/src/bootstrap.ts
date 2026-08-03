import type { INestApplication } from "@nestjs/common";
import { PinoLoggerService } from "./core/logging/pino-logger.service";
import { HttpExceptionFilter } from "./core/http/http-exception.filter";
import { TransformResponseInterceptor } from "./core/http/transform-response.interceptor";

export const API_PREFIX = "api/v1";

/**
 * Applies the conventions every environment of the app must share (global prefix, exception
 * filter, response envelope). Used by main.ts to boot the real process and by e2e tests to boot
 * an identically-configured app against a test database, so the two never drift apart.
 */
export function applyGlobalConventions(app: INestApplication): PinoLoggerService {
  const logger = app.get(PinoLoggerService);
  app.useLogger(logger);
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalFilters(new HttpExceptionFilter(logger));
  app.useGlobalInterceptors(new TransformResponseInterceptor());
  return logger;
}
