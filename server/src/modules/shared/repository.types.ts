/** Default and maximum page sizes enforced on every paginated repository method (PERF-001). */
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export interface PaginationParams {
  /** 1-indexed page number. */
  page?: number;
  /** Requested page size; clamped to MAX_PAGE_SIZE. */
  pageSize?: number;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

/**
 * Clamps requested pagination params to a safe, bounded range so no repository
 * method can be made to return or scan an unbounded result set (DB-020, PERF-001, OWA-025).
 */
export function normalizePagination(params?: PaginationParams): { page: number; pageSize: number; offset: number } {
  const page = Math.max(1, Math.floor(params?.page ?? 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(params?.pageSize ?? DEFAULT_PAGE_SIZE)));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

/**
 * Every repository method that touches graph or project-owned data requires an
 * explicit projectId — identity from a request must never be trusted without it (DB-013, SEC-012, OWA-006).
 */
export interface ProjectScoped {
  projectId: string;
}

/** Reads the `count(*)` result of a paginated list query's companion count query. */
export function extractTotal(countRows: { count: number }[]): number {
  return countRows[0]?.count ?? 0;
}
