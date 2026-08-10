import { MiddlewareConsumer, Module, type NestModule } from "@nestjs/common";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { ConfigModule } from "./core/config/config.module";
import type { EnvConfig } from "./core/config/env.schema";
import { LoggingModule } from "./core/logging/logging.module";
import { DatabaseModule } from "./core/database/database.module";
import { QueueModule } from "./core/queue/queue.module";
import { CorrelationIdMiddleware } from "./core/middleware/correlation-id.middleware";
import { RlsContextMiddleware } from "./core/http/rls-context.middleware";
import { HealthModule } from "./modules/health/health.module";
import { ProjectsModule } from "./modules/projects/projects.module";
import { UsersModule } from "./modules/users/users.module";
import { KnowledgeModule } from "./modules/knowledge/knowledge.module";
import { AuthModule } from "./modules/auth/auth.module";
import { OrchestratorModule } from "./modules/orchestrator/orchestrator.module";
import { AdaptersModule } from "./modules/adapters/adapters.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { AssistantModule } from "./modules/assistant/assistant.module";

@Module({
  imports: [
    ConfigModule,
    LoggingModule,
    DatabaseModule,
    QueueModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) => [
        { ttl: config.get("THROTTLE_TTL_MS", { infer: true }), limit: config.get("THROTTLE_LIMIT", { infer: true }) },
      ],
    }),
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
  providers: [RlsContextMiddleware, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // RlsContextMiddleware must run before guards (Nest lifecycle: middleware -> guards ->
    // interceptors -> handler), so any guard's own repository queries (e.g. RolesGuard's
    // `project_members` lookup) can participate in Postgres RLS. See ARCHITECTURE.md ADR-009.
    consumer.apply(RlsContextMiddleware, CorrelationIdMiddleware).forRoutes("*");
  }
}
