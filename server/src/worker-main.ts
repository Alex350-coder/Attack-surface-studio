import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { WorkerRootModule } from "./worker-root.module";
import { PinoLoggerService } from "./core/logging/pino-logger.service";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerRootModule, { bufferLogs: true });
  const logger = app.get(PinoLoggerService);
  app.useLogger(logger);
  app.enableShutdownHooks();

  logger.log("Orchestrator worker started, listening for tool-run jobs", "WorkerMain");
}

void bootstrap();
