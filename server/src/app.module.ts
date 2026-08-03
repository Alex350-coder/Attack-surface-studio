import { MiddlewareConsumer, Module, type NestModule } from "@nestjs/common";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "./core/config/config.module";
import { LoggingModule } from "./core/logging/logging.module";
import { DatabaseModule } from "./core/database/database.module";
import { CorrelationIdMiddleware } from "./core/middleware/correlation-id.middleware";
import { HealthModule } from "./modules/health/health.module";
import { ProjectsModule } from "./modules/projects/projects.module";
import { UsersModule } from "./modules/users/users.module";
import { KnowledgeModule } from "./modules/knowledge/knowledge.module";
import { AuthModule } from "./modules/auth/auth.module";
import { OrchestratorModule } from "./modules/orchestrator/orchestrator.module";
import { AdaptersModule } from "./modules/adapters/adapters.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { AssistantModule } from "./modules/assistant/assistant.module";

const THROTTLE_TTL_MS = 60_000;
const THROTTLE_LIMIT = 100;

@Module({
  imports: [
    ConfigModule,
    LoggingModule,
    DatabaseModule,
    ThrottlerModule.forRoot([{ ttl: THROTTLE_TTL_MS, limit: THROTTLE_LIMIT }]),
    HealthModule,
    ProjectsModule,
    UsersModule,
    KnowledgeModule,
    AuthModule,
    OrchestratorModule,
    AdaptersModule,
    ReportsModule,
    AssistantModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes("*");
  }
}
