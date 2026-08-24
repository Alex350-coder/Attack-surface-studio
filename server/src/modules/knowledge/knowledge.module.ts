import { forwardRef, Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ProjectsModule } from "../projects/projects.module";
import { DATABASE_CONNECTION } from "../../core/database/database.tokens";
import type { Database } from "../../core/database/client";
import { DrizzleNodesRepository } from "./repositories/nodes.repository";
import { DrizzleEdgesRepository } from "./repositories/edges.repository";
import { DrizzleGraphTraversalRepository } from "./repositories/graph-traversal.repository";
import { DrizzleToolRunsRepository } from "./repositories/tool-runs.repository";
import { DrizzleRawOutputsRepository } from "./repositories/raw-outputs.repository";
import { DrizzleEvidenceFilesRepository } from "./repositories/evidence-files.repository";
import { DrizzleNotesRepository } from "./repositories/notes.repository";
import { DrizzleReportsRepository } from "./repositories/reports.repository";
import { GraphBuilderService } from "./graph-builder.service";
import { KnowledgeController } from "./knowledge.controller";
import { KnowledgeService } from "./knowledge.service";
import type { EdgesRepository } from "./repositories/edges.repository";
import type { NodesRepository } from "./repositories/nodes.repository";
import {
  EDGES_REPOSITORY,
  EVIDENCE_FILES_REPOSITORY,
  GRAPH_BUILDER,
  GRAPH_TRAVERSAL_REPOSITORY,
  NODES_REPOSITORY,
  NOTES_REPOSITORY,
  RAW_OUTPUTS_REPOSITORY,
  REPORTS_REPOSITORY,
  TOOL_RUNS_REPOSITORY,
} from "./knowledge.tokens";

const REPOSITORY_TOKENS = [
  NODES_REPOSITORY,
  EDGES_REPOSITORY,
  GRAPH_TRAVERSAL_REPOSITORY,
  TOOL_RUNS_REPOSITORY,
  RAW_OUTPUTS_REPOSITORY,
  EVIDENCE_FILES_REPOSITORY,
  NOTES_REPOSITORY,
  REPORTS_REPOSITORY,
];

@Module({
  imports: [forwardRef(() => AuthModule), forwardRef(() => ProjectsModule)],
  controllers: [KnowledgeController],
  providers: [
    KnowledgeService,
    {
      provide: NODES_REPOSITORY,
      useFactory: (db: Database) => new DrizzleNodesRepository(db),
      inject: [DATABASE_CONNECTION],
    },
    {
      provide: EDGES_REPOSITORY,
      useFactory: (db: Database) => new DrizzleEdgesRepository(db),
      inject: [DATABASE_CONNECTION],
    },
    {
      provide: GRAPH_TRAVERSAL_REPOSITORY,
      useFactory: (db: Database) => new DrizzleGraphTraversalRepository(db),
      inject: [DATABASE_CONNECTION],
    },
    {
      provide: TOOL_RUNS_REPOSITORY,
      useFactory: (db: Database) => new DrizzleToolRunsRepository(db),
      inject: [DATABASE_CONNECTION],
    },
    {
      provide: RAW_OUTPUTS_REPOSITORY,
      useFactory: (db: Database) => new DrizzleRawOutputsRepository(db),
      inject: [DATABASE_CONNECTION],
    },
    {
      provide: EVIDENCE_FILES_REPOSITORY,
      useFactory: (db: Database) => new DrizzleEvidenceFilesRepository(db),
      inject: [DATABASE_CONNECTION],
    },
    {
      provide: NOTES_REPOSITORY,
      useFactory: (db: Database) => new DrizzleNotesRepository(db),
      inject: [DATABASE_CONNECTION],
    },
    {
      provide: REPORTS_REPOSITORY,
      useFactory: (db: Database) => new DrizzleReportsRepository(db),
      inject: [DATABASE_CONNECTION],
    },
    {
      provide: GRAPH_BUILDER,
      useFactory: (nodesRepository: NodesRepository, edgesRepository: EdgesRepository) =>
        new GraphBuilderService(nodesRepository, edgesRepository),
      inject: [NODES_REPOSITORY, EDGES_REPOSITORY],
    },
  ],
  exports: [...REPOSITORY_TOKENS, GRAPH_BUILDER],
})
export class KnowledgeModule {}
