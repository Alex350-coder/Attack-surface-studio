import { relations } from "drizzle-orm";
import { projects } from "./projects";
import { users } from "./users";
import { projectMembers } from "./projectMembers";
import { nodes } from "./nodes";
import { edges } from "./edges";
import { toolRuns } from "./toolRuns";
import { toolConfigs } from "./toolConfigs";
import { rawOutputs } from "./rawOutputs";
import { evidenceFiles } from "./evidenceFiles";
import { notes } from "./notes";
import { reports } from "./reports";
import { reportExports } from "./reportExports";
import { sessions } from "./sessions";

export {
  projects,
  users,
  projectMembers,
  nodes,
  edges,
  toolRuns,
  toolConfigs,
  rawOutputs,
  evidenceFiles,
  notes,
  reports,
  reportExports,
  sessions,
};

export const projectsRelations = relations(projects, ({ many, one }) => ({
  members: many(projectMembers),
  nodes: many(nodes),
  edges: many(edges),
  toolRuns: many(toolRuns),
  toolConfigs: many(toolConfigs),
  evidenceFiles: many(evidenceFiles),
  notes: many(notes),
  reports: many(reports),
  createdBy: one(users, { fields: [projects.createdBy], references: [users.id] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(projectMembers),
  sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, { fields: [projectMembers.projectId], references: [projects.id] }),
  user: one(users, { fields: [projectMembers.userId], references: [users.id] }),
}));

export const nodesRelations = relations(nodes, ({ one, many }) => ({
  project: one(projects, { fields: [nodes.projectId], references: [projects.id] }),
  sourceRun: one(toolRuns, { fields: [nodes.sourceRunId], references: [toolRuns.id] }),
  outgoingEdges: many(edges, { relationName: "sourceNode" }),
  incomingEdges: many(edges, { relationName: "targetNode" }),
}));

export const edgesRelations = relations(edges, ({ one }) => ({
  project: one(projects, { fields: [edges.projectId], references: [projects.id] }),
  source: one(nodes, { fields: [edges.sourceId], references: [nodes.id], relationName: "sourceNode" }),
  target: one(nodes, { fields: [edges.targetId], references: [nodes.id], relationName: "targetNode" }),
  sourceRun: one(toolRuns, { fields: [edges.sourceRunId], references: [toolRuns.id] }),
}));

export const toolRunsRelations = relations(toolRuns, ({ one, many }) => ({
  project: one(projects, { fields: [toolRuns.projectId], references: [projects.id] }),
  rawOutputs: many(rawOutputs),
}));

export const toolConfigsRelations = relations(toolConfigs, ({ one }) => ({
  project: one(projects, { fields: [toolConfigs.projectId], references: [projects.id] }),
}));

export const rawOutputsRelations = relations(rawOutputs, ({ one }) => ({
  toolRun: one(toolRuns, { fields: [rawOutputs.toolRunId], references: [toolRuns.id] }),
}));

export const evidenceFilesRelations = relations(evidenceFiles, ({ one }) => ({
  project: one(projects, { fields: [evidenceFiles.projectId], references: [projects.id] }),
  node: one(nodes, { fields: [evidenceFiles.nodeId], references: [nodes.id] }),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  project: one(projects, { fields: [notes.projectId], references: [projects.id] }),
  node: one(nodes, { fields: [notes.nodeId], references: [nodes.id] }),
}));

export const reportsRelations = relations(reports, ({ one, many }) => ({
  project: one(projects, { fields: [reports.projectId], references: [projects.id] }),
  exports: many(reportExports),
}));

export const reportExportsRelations = relations(reportExports, ({ one }) => ({
  report: one(reports, { fields: [reportExports.reportId], references: [reports.id] }),
  generatedByUser: one(users, { fields: [reportExports.generatedBy], references: [users.id] }),
}));
