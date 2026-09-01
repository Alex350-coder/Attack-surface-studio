import { forwardRef, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { EnvConfig } from "../../core/config/env.schema";
import { LLM_PROVIDER } from "../../core/ai/llm-provider.contract";
import { NullLlmProvider } from "../../core/ai/null-llm.provider";
import { NvidiaLlmProvider } from "../../core/ai/nvidia-llm.provider";
import { AuthModule } from "../auth/auth.module";
import { ProjectsModule } from "../projects/projects.module";
import { KnowledgeModule } from "../knowledge/knowledge.module";
import { AssistantController } from "./assistant.controller";
import { AssistantService } from "./assistant.service";
import { PromptBuilderService } from "./prompt-builder.service";

/**
 * Deliberately has zero import of OrchestratorModule/AdaptersModule -- there is no code path from
 * an AI completion to a tool execution regardless of prompt content (no-autonomous-execution,
 * SECURITY_MODEL.md "AI Assistant security").
 */
@Module({
  imports: [forwardRef(() => AuthModule), forwardRef(() => ProjectsModule), KnowledgeModule],
  controllers: [AssistantController],
  providers: [
    AssistantService,
    PromptBuilderService,
    {
      provide: LLM_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) => {
        const apiKey = config.get("NVIDIA_API_KEY", { infer: true });
        if (!apiKey) {
          return new NullLlmProvider();
        }
        return new NvidiaLlmProvider({
          apiKey,
          modelId: config.get("NVIDIA_MODEL_ID", { infer: true }) ?? "meta/llama-3.3-70b-instruct",
          baseUrl: config.get("NVIDIA_API_BASE_URL", { infer: true }),
        });
      },
    },
  ],
})
export class AssistantModule {}
