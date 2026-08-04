import { Injectable, type CallHandler, type ExecutionContext, type NestInterceptor } from "@nestjs/common";
import type { Request } from "express";
import { from, lastValueFrom, type Observable } from "rxjs";
import { runWithUserContext } from "../database/rls";
import "./request-user";

/**
 * Wraps every authenticated request in a transaction scoped to the caller's user id, so any
 * repository call made during the request (via `getScopedDb()`) participates in Postgres RLS
 * (SECURITY_MODEL.md §4). Runs after guards, so `request.user` is already populated when set.
 * Public/unauthenticated routes pass through unchanged.
 */
@Injectable()
export class RlsContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const userId = request.user?.sub;

    if (!userId) {
      return next.handle();
    }

    return from(runWithUserContext(userId, () => lastValueFrom(next.handle(), { defaultValue: undefined })));
  }
}
