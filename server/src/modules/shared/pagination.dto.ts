import { z } from "zod";
import { MAX_PAGE_SIZE } from "./repository.types";

/**
 * Validates `?page=&pageSize=` query params before they reach a repository's
 * `normalizePagination` (PERF-001, OWA-025) — query strings arrive as strings, so numeric
 * coercion happens here, at the HTTP boundary, not deeper in the call stack.
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
});

export type PaginationQueryDto = z.infer<typeof paginationQuerySchema>;
