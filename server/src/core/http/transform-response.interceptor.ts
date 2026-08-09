import { Injectable, type CallHandler, type ExecutionContext, type NestInterceptor } from "@nestjs/common";
import type { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { successEnvelope, type ApiSuccessEnvelope } from "./response-envelope";

interface PaginatedShape {
  items: unknown[];
  page: unknown;
  pageSize: unknown;
  total: unknown;
}

/** Narrows a handler's return value to a repository `Paginated<T>` shape, without importing it here (BE-011/PERF-001). */
function isPaginated(value: unknown): value is PaginatedShape {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as Record<string, unknown>).items) &&
    "page" in value &&
    "pageSize" in value &&
    "total" in value
  );
}

/**
 * Wraps every controller return value in the standard `{ success, data }` envelope (BE-011).
 * When a handler returns a `Paginated<T>` shape, its `items` become `data` and
 * `page`/`pageSize`/`total` are lifted into `meta`, so pagination metadata is never nested
 * inside `data` on the wire.
 */
@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<T, ApiSuccessEnvelope<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccessEnvelope<T>> {
    return next.handle().pipe(
      map((data) => {
        if (isPaginated(data)) {
          return successEnvelope(data.items as T, {
            total: data.total as number,
            page: data.page as number,
            pageSize: data.pageSize as number,
          });
        }
        return successEnvelope(data);
      }),
    );
  }
}
