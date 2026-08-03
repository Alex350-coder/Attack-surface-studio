import "reflect-metadata";
import helmet from "helmet";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { applyGlobalConventions } from "./bootstrap";
import type { EnvConfig } from "./core/config/env.schema";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  applyGlobalConventions(app);

  const configService = app.get(ConfigService<EnvConfig, true>);
  const corsOrigins = configService.get("CORS_ORIGINS", { infer: true });

  app.use(helmet());
  app.enableCors({ origin: corsOrigins.length > 0 ? corsOrigins : false, credentials: true });
  app.enableShutdownHooks();

  const port = configService.get("PORT", { infer: true });
  await app.listen(port);
}

void bootstrap();
