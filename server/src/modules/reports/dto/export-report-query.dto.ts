import { z } from "zod";

export const exportReportQuerySchema = z.object({
  format: z.enum(["pdf", "html", "markdown"]),
});
export type ExportReportQueryDto = z.infer<typeof exportReportQuerySchema>;
