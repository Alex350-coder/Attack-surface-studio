import { describe, expect, it, vi } from "vitest";
import type { ArgumentsHost } from "@nestjs/common";
import type { Request, Response } from "express";
import { HttpExceptionFilter } from "../../src/core/http/http-exception.filter";
import { NotFoundError } from "../../src/core/http/domain-error";
import type { PinoLoggerService } from "../../src/core/logging/pino-logger.service";

function createHost(correlationId: string): {
  host: ArgumentsHost;
  json: ReturnType<typeof vi.fn>;
  status: ReturnType<typeof vi.fn>;
} {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const response = { status } as unknown as Response;
  const request = { method: "GET", url: "/x", correlationId } as unknown as Request;

  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;

  return { host, json, status };
}

describe("HttpExceptionFilter", () => {
  const logger = { error: vi.fn() } as unknown as PinoLoggerService;
  const filter = new HttpExceptionFilter(logger);

  it("maps a DomainError to its own httpStatus and code", () => {
    const { host, json, status } = createHost("abc-123");

    filter.catch(new NotFoundError("project not found"), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: { message: "project not found", code: "NOT_FOUND", correlationId: "abc-123" },
    });
  });

  it("maps an unknown error to a generic 500 without leaking internal detail", () => {
    const { host, json, status } = createHost("abc-456");

    filter.catch(new Error("password=hunter2 connection failed"), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: { message: "Internal server error", code: "INTERNAL_ERROR", correlationId: "abc-456" },
    });
  });
});
