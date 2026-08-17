import { z } from "zod";

const executionModeSchema = z.enum(["local", "docker"]);

/** OWA-011 mass-assignment guard: only these fields may ever be set via `PUT .../config`. */
export const setToolConfigSchema = z.object({
  executionMode: executionModeSchema,
  config: z.record(z.string(), z.unknown()).default({}),
});
export type SetToolConfigDto = z.infer<typeof setToolConfigSchema>;

export const detectToolSchema = z.object({
  mode: executionModeSchema,
});
export type DetectToolDto = z.infer<typeof detectToolSchema>;
