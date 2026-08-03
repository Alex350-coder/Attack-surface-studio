import { Injectable, type LoggerService } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { pino, type Logger } from "pino";

/** Field names redacted from every log line regardless of nesting (SEC-041). */
const REDACTED_PATHS = [
  "password",
  "passwordHash",
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
  "*.password",
  "*.passwordHash",
  "*.token",
  "*.accessToken",
  "*.refreshToken",
  "*.authorization",
];

@Injectable()
export class PinoLoggerService implements LoggerService {
  private readonly logger: Logger;

  constructor(configService: ConfigService) {
    this.logger = pino({
      level: configService.get<string>("LOG_LEVEL", "info"),
      redact: { paths: REDACTED_PATHS, censor: "[REDACTED]" },
    });
  }

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.info({ context: optionalParams[0] }, this.stringify(message));
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    const [trace, context] = optionalParams;
    this.logger.error({ trace, context }, this.stringify(message));
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.warn({ context: optionalParams[0] }, this.stringify(message));
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.debug({ context: optionalParams[0] }, this.stringify(message));
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.trace({ context: optionalParams[0] }, this.stringify(message));
  }

  private stringify(message: unknown): string {
    return typeof message === "string" ? message : JSON.stringify(message);
  }
}
