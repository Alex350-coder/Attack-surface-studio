import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import {
  Body,
  Controller,
  Module,
  Post,
  UsePipes,
  type INestApplication,
  type MiddlewareConsumer,
  type NestModule,
} from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../../src/core/validation/zod-validation.pipe";
import { PinoLoggerService } from "../../src/core/logging/pino-logger.service";
import { CorrelationIdMiddleware } from "../../src/core/middleware/correlation-id.middleware";
import { applyGlobalConventions } from "../../src/bootstrap";

const createProjectSchema = z.object({ name: z.string().min(1), slug: z.string().min(1) });
type CreateProjectDto = z.infer<typeof createProjectSchema>;

/** Ad hoc test-only controller proving the ZodValidationPipe + exception filter pipeline end to end. */
@Controller("test-validation")
class TestValidationController {
  @Post()
  @UsePipes(new ZodValidationPipe(createProjectSchema))
  create(@Body() body: CreateProjectDto): CreateProjectDto {
    return body;
  }
}

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [TestValidationController],
  providers: [PinoLoggerService],
})
class TestValidationModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes("*");
  }
}

describe("validation pipeline (Zod pipe + global filter + envelope interceptor)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [TestValidationModule] }).compile();
    app = moduleRef.createNestApplication();
    applyGlobalConventions(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 201 with the standard envelope for a valid payload", async () => {
    const response = await request(app.getHttpServer() as Server)
      .post("/api/v1/test-validation")
      .send({ name: "External ASM", slug: "external-asm" });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ success: true, data: { name: "External ASM", slug: "external-asm" } });
  });

  it("returns 400 with a safe structured error for an invalid payload", async () => {
    const response = await request(app.getHttpServer() as Server).post("/api/v1/test-validation").send({ name: "" });
    const body = response.body as { success: boolean; error: { code: string; correlationId: string } };

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.correlationId).toEqual(expect.any(String));
    expect(body.error).not.toHaveProperty("stack");
  });
});
