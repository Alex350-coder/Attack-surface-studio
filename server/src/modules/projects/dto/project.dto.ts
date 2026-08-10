import { z } from "zod";
import { projectScopeSchema } from "../repositories/project-scope.schema";

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug must be lowercase kebab-case (e.g. my-project)");

/** OWA-011 mass-assignment guard: only these fields may ever be set on create, never `id`/`createdBy`/timestamps. */
export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: slugSchema,
  scope: projectScopeSchema.optional(),
});
export type CreateProjectDto = z.infer<typeof createProjectSchema>;

/** Same allow-list restriction applies to updates (OWA-011) — no client-supplied `slug`/`createdBy`. */
export const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  scope: projectScopeSchema.optional(),
});
export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;
