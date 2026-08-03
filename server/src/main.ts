import "reflect-metadata";
import helmet from "helmet";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { PinoLoggerService } from "./core/logging/pino-logger.service";
import { HttpExceptionFilter } from "./core/http/http-exception.filter";
import { TransformResponseInterceptor } from "./core/http/transform-response.interceptor";
import type { EnvConfig } from "./core/config/env.schema";

const API_PREFIX = "api/v1";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = app.get(PinoLoggerService);
  app.useLogger(logger);

  const configService = app.get(ConfigService<EnvConfig, true>);
  const corsOrigins = configService.get("CORS_ORIGINS", { infer: true });

  app.use(helmet());
  app.enableCors({ origin: corsOrigins.length > 0 ? corsOrigins : false, credentials: true });
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalFilters(new HttpExceptionFilter(logger));
  app.useGlobalInterceptors(new TransformResponseInterceptor());
  app.enableShutdownHooks();

  const port = configService.get("PORT", { infer: true });
  await app.listen(port);
}

void bootstrap();
