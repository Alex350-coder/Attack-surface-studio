import { describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { CORRELATION_ID_HEADER, CorrelationIdMiddleware } from "../../src/core/middleware/correlation-id.middleware";

describe("CorrelationIdMiddleware", () => {
  it("assigns a correlation id to the request and echoes it in the response header", () => {
    const middleware = new CorrelationIdMiddleware();
    const req = {} as unknown as Request;
    const setHeader = vi.fn();
    const res = { setHeader } as unknown as Response;
    const next = vi.fn() as unknown as NextFunction;

    middleware.use(req, res, next);

    expect(req.correlationId).toEqual(expect.any(String));
    expect(setHeader).toHaveBeenCalledWith(CORRELATION_ID_HEADER, req.correlationId);
    expect(next).toHaveBeenCalledOnce();
  });

  it("assigns a different id on every call", () => {
    const middleware = new CorrelationIdMiddleware();
    const next = vi.fn() as unknown as NextFunction;
    const makeReq = () => ({}) as unknown as Request;
    const makeRes = () => ({ setHeader: vi.fn() }) as unknown as Response;

    const first = makeReq();
    const second = makeReq();
    middleware.use(first, makeRes(), next);
    middleware.use(second, makeRes(), next);

    expect(first.correlationId).not.toBe(second.correlationId);
  });
});
