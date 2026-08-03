import { Injectable, type CallHandler, type ExecutionContext, type NestInterceptor } from "@nestjs/common";
import type { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { successEnvelope, type ApiSuccessEnvelope } from "./response-envelope";

/** Wraps every controller return value in the standard `{ success, data }` envelope (BE-011). */
@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<T, ApiSuccessEnvelope<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccessEnvelope<T>> {
    return next.handle().pipe(map((data) => successEnvelope(data)));
  }
}
